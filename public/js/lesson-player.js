// Player das aulas animadas ("vídeos" em motion gerados no navegador)
(() => {
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let manifest = null; // arquivos de narração gerados pelo ElevenLabs (scripts/narrar.mjs)
fetch("audio/manifest.json").then((r) => (r.ok ? r.json() : null)).then((m) => { manifest = m; }).catch(() => {});

let state = null;
let muted = false;
try { muted = localStorage.getItem("hb-mute") === "1"; } catch (e) {}

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
const pop = (e, delay = 0) => e.animate([{ transform: "scale(0) rotate(-8deg)", opacity: 0 }, { transform: "scale(1.12) rotate(2deg)", opacity: 1, offset: .7 }, { transform: "none", opacity: 1 }],
  { duration: 520, delay, easing: "cubic-bezier(.2,1.4,.4,1)", fill: "backwards" });
const slide = (e, delay = 0, from = "translateY(30px)") => e.animate([{ transform: from, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, delay, easing: "cubic-bezier(.2,1.2,.4,1)", fill: "backwards" });

// ---------------- renderizadores de cena ----------------
const R = {
  title(v, box) {
    const e = el("div", "lv-title"); e.innerHTML = `<div class="big-emoji">${v.emoji}</div><h3>${esc(v.text)}</h3>`;
    box.appendChild(e); pop(e.firstChild); slide(e.lastChild, 250);
    e.firstChild.animate([{ transform: "rotate(-6deg)" }, { transform: "rotate(6deg)" }], { duration: 900, iterations: Infinity, direction: "alternate", easing: "ease-in-out", delay: 600 });
  },
  analogy(v, box) {
    const e = el("div", "lv-analogy"); const em = el("div", "big-emoji", v.emoji); e.appendChild(em);
    const ul = el("div", "lv-items"); v.items.forEach((t, i) => { const li = el("div", "lv-item", esc(t)); ul.appendChild(li); slide(li, 500 + i * 700, "translateX(-40px)"); });
    e.appendChild(ul); box.appendChild(e); pop(em);
    em.animate([{ transform: "translateY(0)" }, { transform: "translateY(-12px)" }], { duration: 1100, iterations: Infinity, direction: "alternate", easing: "ease-in-out", delay: 600 });
  },
  code(v, box) {
    const pre = el("pre", "lv-code"); box.appendChild(pre); slide(pre);
    const hl = window.HB ? window.HB.highlight : (s) => esc(s);
    let i = 0; const src = v.code;
    const typer = setInterval(() => {
      i = Math.min(src.length, i + 2);
      pre.innerHTML = hl(src.slice(0, i), /^[.#][\w-]+\s*\{/.test(src.trim()) ? "css" : src.trim().startsWith("<") ? "html" : "js") + (i < src.length ? '<span class="caret">▌</span>' : "");
      if (i >= src.length) {
        clearInterval(typer);
        if (v.parts) {
          const tags = el("div", "lv-parts");
          v.parts.forEach((p, k) => { const t = el("span", "", esc(p)); t.style.background = ["#2de2e6", "#ffd23f", "#ff3df2"][k % 3]; tags.appendChild(t); pop(t, 200 + k * 350); });
          box.appendChild(tags);
        }
      }
    }, 28);
    state.timers.push(typer);
  },
  track(v, box) {
    const N = v.ops.filter((o) => o === "m").length + 2;
    const t = el("div", "lv-track");
    const size = Math.min(64, Math.floor(480 / Math.max(6, N)));
    t.style.setProperty("--s", size + "px");
    const W = Math.max(5, N), H = 3;
    t.style.width = W * size + "px"; t.style.height = H * size + "px";
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = el("div", "lv-cell"); c.style.left = x * size + "px"; c.style.top = y * size + "px"; t.appendChild(c); }
    const bot = el("div", "lv-bot", '<img src="assets/robot.png" alt="">');
    t.appendChild(bot); box.appendChild(t); slide(t);
    const code = el("div", "lv-ops"); box.appendChild(code);
    const names = { m: "mover()", d: 'virar("direita")', e: 'virar("esquerda")' };
    let x = 0, y = 1, dir = 0; const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
    const place = () => { bot.style.left = x * size + "px"; bot.style.top = y * size + "px"; bot.firstChild.style.transform = dir === 2 ? "scaleX(-1)" : ""; bot.style.rotate = dir === 1 ? "15deg" : dir === 3 ? "-15deg" : "0deg"; };
    place();
    v.ops.forEach((op, k) => {
      const tag = el("span", "", "robo." + names[op]); code.appendChild(tag);
      state.timers.push(setTimeout(() => {
        code.querySelectorAll("span").forEach((s) => s.classList.remove("on")); tag.classList.add("on");
        if (op === "m") { x = Math.max(0, Math.min(W - 1, x + DX[dir])); y = Math.max(0, Math.min(H - 1, y + DY[dir])); }
        if (op === "d") dir = (dir + 1) % 4;
        if (op === "e") dir = (dir + 3) % 4;
        place();
        bot.animate([{ transform: "scale(1.2,.8)" }, { transform: "scale(.9,1.1) translateY(-8px)" }, { transform: "none" }], { duration: 400 });
      }, 700 + k * 750));
    });
  },
  loop(v, box) {
    const e = el("div", "lv-loop");
    const ring = el("div", "lv-ring", `<div class="lv-car">🏎️</div><div class="lv-count"><small>${esc(v.label)}</small><b>0</b></div>`);
    e.appendChild(ring); box.appendChild(e); pop(ring);
    const car = ring.querySelector(".lv-car"), cnt = ring.querySelector("b");
    car.animate([{ transform: "rotate(0deg) translateX(110px) rotate(90deg)" }, { transform: "rotate(360deg) translateX(110px) rotate(450deg)" }], { duration: 1200, iterations: v.infinite ? Infinity : v.n, easing: "linear" });
    let i = 0;
    const tm = setInterval(() => {
      i++;
      if (!v.infinite && i >= v.n) { clearInterval(tm); cnt.textContent = "FIM!"; cnt.style.color = "var(--green)"; return; }
      cnt.textContent = v.infinite ? (i > 4 ? "∞" : i) : i;
      if (v.infinite && i > 4) { ring.classList.add("dizzy"); }
      cnt.animate([{ transform: "scale(1.6)" }, { transform: "none" }], { duration: 300 });
    }, 1200);
    state.timers.push(tm);
    const leg = el("div", "lv-legend", v.infinite ? "while (true) { ... } 😵" : `for (let ${v.label === "volta" ? "i" : v.label} = 0; i < ${v.n}; i++)`);
    box.appendChild(leg); slide(leg, 400);
  },
  box(v, box) {
    const e = el("div", "lv-box");
    e.innerHTML = `<div class="lv-val">${esc(v.value)}</div><div class="lv-crate"><span>${esc(v.label)}</span></div>`;
    box.appendChild(e); pop(e.lastChild);
    e.firstChild.animate([{ transform: "translateY(-160px) rotate(-20deg)", opacity: 0 }, { transform: "translateY(-160px)", opacity: 1, offset: .3 }, { transform: "translateY(30px)", offset: .85 }, { transform: "translateY(20px)", opacity: 1 }],
      { duration: 1600, delay: 600, fill: "both", easing: "cubic-bezier(.5,0,.5,1)" });
  },
  branch(v, box) {
    const e = el("div", "lv-branch");
    e.innerHTML = `<div class="lv-cond">${esc(v.cond)} ?</div><div class="lv-paths"><div class="lv-yes">✔ true<br><code>${esc(v.yes)}</code></div><div class="lv-no">✖ false<br><code>${esc(v.no)}</code></div></div>`;
    box.appendChild(e); pop(e.firstChild); slide(e.querySelector(".lv-yes"), 700, "translate(40px,-30px)"); slide(e.querySelector(".lv-no"), 1100, "translate(-40px,-30px)");
    let k = 0;
    const tm = setInterval(() => { k++; e.querySelector(".lv-yes").classList.toggle("lit", k % 2 === 1); e.querySelector(".lv-no").classList.toggle("lit", k % 2 === 0); }, 1300);
    state.timers.push(tm);
  },
  machine(v, box) {
    const e = el("div", "lv-machine");
    e.innerHTML = `<div class="lv-in">${esc(v.input)}</div><div class="lv-mac"><span>${esc(v.name)}()</span><i>⚙️</i></div><div class="lv-out">${esc(v.output)}</div>`;
    box.appendChild(e); pop(e.children[1]);
    e.querySelector("i").animate([{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }], { duration: 1500, iterations: Infinity });
    const loop = () => {
      e.children[0].animate([{ transform: "translateX(-60px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1, offset: .3 }, { transform: "translateX(90px) scale(.3)", opacity: 0 }], { duration: 1400, fill: "both" });
      e.children[2].animate([{ transform: "translateX(-90px) scale(.3)", opacity: 0 }, { transform: "translateX(-90px) scale(.3)", opacity: 0, offset: .5 }, { transform: "translateX(0) scale(1.2)", opacity: 1, offset: .8 }, { transform: "none", opacity: 1 }], { duration: 1800, fill: "both" });
    };
    loop(); state.timers.push(setInterval(loop, 2600));
  },
  train(v, box) {
    const e = el("div", "lv-train");
    e.appendChild(el("div", "lv-loco", "🚂"));
    v.items.forEach((t, i) => { const w = el("div", "lv-wagon", `<b>${esc(t)}</b><small>[${i}]</small>`); e.appendChild(w); slide(w, 300 + i * 300, "translateX(80px)"); });
    box.appendChild(e);
    e.animate([{ transform: "translateX(40px)" }, { transform: "none" }], { duration: 1200, easing: "ease-out" });
  },
  card(v, box) {
    const e = el("div", "lv-card");
    e.innerHTML = `<div class="lv-card-h">🪪 objeto</div>` + Object.entries(v.obj).map(([k, val]) =>
      `<div class="lv-prop${v.highlight === k ? " hi" : ""}"><span>${esc(k)}:</span> <b>${esc(JSON.stringify(val))}</b></div>`).join("");
    box.appendChild(e); pop(e);
    e.querySelectorAll(".lv-prop").forEach((p, i) => slide(p, 400 + i * 350, "translateX(-30px)"));
  },
  tree(v, box) {
    const e = el("div", "lv-tree");
    const [root, ...kids] = v.nodes;
    e.innerHTML = `<div class="lv-node root">&lt;${esc(root)}&gt;</div><div class="lv-kids">${kids.map((k) => `<div class="lv-node">&lt;${esc(k.split(/[#.]/)[0])}<small>${esc(k.slice(k.split(/[#.]/)[0].length))}</small>&gt;</div>`).join("")}</div>`;
    box.appendChild(e); pop(e.firstChild);
    e.querySelectorAll(".lv-kids .lv-node").forEach((n, i) => {
      slide(n, 300 + i * 250);
      if (v.pickAll || v.pick === i + 1) state.timers.push(setTimeout(() => { n.classList.add("picked"); pop(n); }, 1600 + i * 200));
    });
  },
  recap(v, box) {
    const e = el("div", "lv-recap", "<h4>📌 Cola do mestre</h4>");
    v.lines.forEach((l, i) => { const d = el("div", "", "<code>" + esc(l) + "</code>"); e.appendChild(d); slide(d, 300 + i * 400, "translateX(-30px)"); });
    box.appendChild(e); pop(e.firstChild);
  },
};

// ---------------- narração ----------------
function speak(text, id, idx, done) {
  stopVoice();
  if (muted) { state.timers.push(setTimeout(done, Math.max(2500, text.length * 55))); return; }
  const file = manifest && manifest[`${id}-${idx}`];
  if (file) {
    const a = new Audio("audio/" + file);
    state.audio = a;
    a.onended = done;
    a.onerror = () => fallback();
    a.play().catch(() => fallback());
    return;
  }
  fallback();
  function fallback() {
    if (!("speechSynthesis" in window)) { state.timers.push(setTimeout(done, Math.max(2500, text.length * 55))); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/robo ponto/g, "robô ponto"));
    u.lang = "pt-BR"; u.rate = 1.05; u.pitch = 1.1;
    const v = speechSynthesis.getVoices().find((x) => /pt(-|_)BR/i.test(x.lang) && /Francisca|Luciana|Maria|female|Google/i.test(x.name)) || speechSynthesis.getVoices().find((x) => /pt/i.test(x.lang));
    if (v) u.voice = v;
    let fired = false; const fin = () => { if (!fired) { fired = true; done(); } };
    u.onend = fin; u.onerror = fin;
    // segurança: alguns navegadores não disparam onend
    state.timers.push(setTimeout(fin, Math.max(4000, text.length * 85)));
    speechSynthesis.speak(u);
  }
}
function stopVoice() {
  if (state && state.audio) { state.audio.pause(); state.audio = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

// ---------------- controle ----------------
function clearTimers() { if (!state) return; state.timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); state.timers = []; }
function show(i) {
  clearTimers(); stopVoice();
  const L = state.lesson; state.i = i;
  const sc = L.scenes[i];
  const stage = $("#ls-stage"); stage.innerHTML = "";
  const box = el("div", "lv-scene"); stage.appendChild(box);
  (R[sc.vis.type] || R.title)(sc.vis, box);
  const sub = $("#ls-sub"); sub.textContent = sc.say;
  sub.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300 });
  $("#ls-mentor").animate([{ transform: "translateY(0) rotate(0)" }, { transform: "translateY(-10px) rotate(-3deg)" }, { transform: "none" }], { duration: 500 });
  $("#ls-dots").innerHTML = L.scenes.map((_, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("");
  const last = i === L.scenes.length - 1;
  $("#ls-next").textContent = last ? "Bora jogar! ▶" : "Próximo ⏭";
  state.talking = true; $("#ls-mentor").classList.add("talking");
  speak(sc.say, state.id, i, () => {
    if (!state || state.i !== i) return;
    state.talking = false; $("#ls-mentor").classList.remove("talking");
    if (state.auto && !last) state.timers.push(setTimeout(() => show(i + 1), 900));
  });
}
function open(id, onDone) {
  const L = window.LESSONS[id];
  if (!L) { onDone && onDone(); return; }
  state = { id, lesson: L, i: 0, timers: [], auto: true, onDone };
  $("#ls-title").innerHTML = `${L.emoji} ${esc(L.title)}`;
  $("#lesson").classList.remove("hidden");
  $("#ls-mute").textContent = muted ? "🔇" : "🔊";
  show(0);
}
function close() {
  clearTimers(); stopVoice();
  $("#lesson").classList.add("hidden");
  const cb = state && state.onDone;
  const finished = !!state && state.i >= state.lesson.scenes.length - 1;
  state = null;
  cb && cb(finished);
}
$("#ls-next").onclick = () => { if (!state) return; if (state.i >= state.lesson.scenes.length - 1) close(); else show(state.i + 1); };
$("#ls-prev").onclick = () => { if (state && state.i > 0) show(state.i - 1); };
$("#ls-replay").onclick = () => { if (state) show(state.i); };
$("#ls-skip").onclick = close;
$("#ls-mute").onclick = () => {
  muted = !muted; try { localStorage.setItem("hb-mute", muted ? "1" : "0"); } catch (e) {}
  $("#ls-mute").textContent = muted ? "🔇" : "🔊";
  if (state) show(state.i);
};
if ("speechSynthesis" in window) speechSynthesis.getVoices();
window.Lesson = { open, close };
})();
