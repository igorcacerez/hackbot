(() => {
const $ = (s) => document.querySelector(s);
const HB = () => window.HB;

// ---------- arena ----------
const { MAP, STARTS, MAX_HP, MAX_TURNS, STARTER, RIVALS } = window.ARENA;

// ---------- simulação (Web Worker com o núcleo compartilhado) ----------
const CORE_URL = new URL("js/battle-core.js?v=" + (window.HB_V || ""), location.href).href;
function battle(codeA, codeB, seed) {
  return new Promise((resolve) => {
    const src = `importScripts(${JSON.stringify(CORE_URL)}); self.onmessage = (e) => self.postMessage(ARENA.battleCore(e.data));`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const w = new Worker(url);
    const t = setTimeout(() => { w.terminate(); resolve({ freeze: true }); }, 3000);
    w.onmessage = (e) => { clearTimeout(t); w.terminate(); resolve(e.data); };
    w.onerror = () => { clearTimeout(t); w.terminate(); resolve({ freeze: true }); };
    w.postMessage({ codes: [codeA, codeB], seed });
  });
}

// ---------- estado / save ----------
const st = () => { const s = HB().save; s.arena = s.arena || { code: STARTER, beaten: {} }; return s.arena; };
let opponent = { kind: "rival", idx: 0 };
let token = 0, cell = 56, speed = 1;

// ---------- UI ----------
function open() {
  const a = st();
  $("#a-code").value = a.code;
  paint();
  renderRivals();
  buildArena([STARTS[0], STARTS[1]].map((s) => ({ ...s, hp: MAX_HP })));
  log("Escolha um rival e aperte LUTAR. Seu código vale para todas as lutas.", "y");
}
function renderRivals() {
  const box = $("#rivals"); box.innerHTML = "";
  const a = st();
  RIVALS.forEach((r, i) => {
    const unlocked = i === 0 || a.beaten[i - 1];
    const d = document.createElement("button");
    d.className = "rival" + (opponent.kind === "rival" && opponent.idx === i ? " on" : "") + (a.beaten[i] ? " beaten" : "") + (unlocked ? "" : " locked");
    d.innerHTML = `<span class="rv-av" style="filter:hue-rotate(${r.hue}deg)">${spriteHtml()}</span><span class="rv-txt"><b>${r.name}</b><small>${unlocked ? r.desc : "Vença o anterior"}</small></span>${a.beaten[i] ? '<span class="rv-badge">✔</span>' : ""}`;
    d.onclick = () => { if (!unlocked) return HB().SFX.bump(); HB().SFX.click(); opponent = { kind: "rival", idx: i }; renderRivals(); };
    box.appendChild(d);
  });
  const f = document.createElement("button");
  f.className = "rival friend" + (opponent.kind === "friend" ? " on" : "");
  f.innerHTML = `<span class="rv-av">🧑‍💻</span><span class="rv-txt"><b>Desafiar amigo</b><small>Cole o código de batalha dele</small></span>`;
  f.onclick = () => {
    const txt = prompt("Cole o CÓDIGO DE BATALHA do seu amigo:");
    if (!txt) return;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
      opponent = { kind: "friend", name: String(data.n || "Amigo").slice(0, 20), code: String(data.c) };
      renderRivals(); log(`⚔ Desafio carregado: <b>${HB().esc(opponent.name)}</b>. Aperte LUTAR!`, "y");
    } catch (e) { alert("Código de batalha inválido."); }
  };
  box.appendChild(f);
  if (!$("#a-fight").classList.contains("running")) buildArena(STARTS.map((s) => ({ ...s, hp: MAX_HP })));
}
function spriteHtml() { return `<img src="assets/robot.png" alt="" onerror="this.outerHTML='🤖'" />`; }
function oppInfo() {
  if (opponent.kind === "friend") return { name: opponent.name, code: opponent.code, hue: 160 };
  if (opponent.kind === "online") return { name: opponent.name, botId: opponent.botId, hue: (opponent.visual && opponent.visual.hue) || 200 };
  const r = RIVALS[opponent.idx]; return { name: r.name, code: r.code, hue: r.hue };
}

function buildArena(bots) {
  const W = $("#a-world"), stage = $("#a-stage");
  const cols = MAP[0].length, rows = MAP.length;
  cell = Math.floor(Math.min((stage.clientWidth - 30) / cols, (stage.clientHeight - 30) / rows, 84));
  W.style.width = cols * cell + "px"; W.style.height = rows * cell + "px";
  W.style.setProperty("--cell", cell + "px");
  W.innerHTML = "";
  MAP.forEach((row, y) => [...row].forEach((c, x) => {
    const t = document.createElement("div"); t.className = "tile " + (c === "X" ? "metal" : "chao");
    t.style.left = x * cell + "px"; t.style.top = y * cell + "px"; W.appendChild(t);
  }));
  const info = oppInfo();
  W.bots = bots.map((b, i) => {
    const el = document.createElement("div"); el.className = "ent robo abot";
    el.innerHTML = `<div class="arrow"></div><div class="body"><div class="face" style="width:100%;height:100%;display:grid;place-items:center"></div></div><div class="hp"><i></i></div><div class="shieldfx"></div>`;
    const face = el.querySelector(".face"); face.appendChild(HB().sprite("robo"));
    if (i === 0) window.RW.decorate(face);
    if (i === 1) { el.querySelector(".body").style.filter = `hue-rotate(${info.hue}deg) saturate(1.4) drop-shadow(0 0 12px rgba(255,61,242,.6))`; el.classList.add("enemy"); }
    W.appendChild(el);
    return el;
  });
  bots.forEach((b, i) => placeBot(i, b, true));
  $("#a-names").innerHTML = `<span class="me">VOCÊ</span> <i>vs</i> <span class="foe">${HB().esc(info.name)}</span>`;
}
function placeBot(i, b, instant) {
  const el = $("#a-world").bots[i];
  el.style.left = b.x * cell + "px"; el.style.top = b.y * cell + "px";
  el.querySelector(".arrow").style.transform = `rotate(${b.dir * 90}deg)`;
  el.querySelector(".face").style.transform = b.dir === 2 ? "scaleX(-1)" : b.dir === 3 ? "rotate(-12deg)" : b.dir === 1 ? "rotate(12deg)" : "";
  const bar = el.querySelector(".hp i");
  bar.style.width = (b.hp / MAX_HP) * 100 + "%";
  bar.style.background = b.hp > 2 ? "var(--green)" : b.hp > 1 ? "var(--yellow)" : "var(--red)";
  el.classList.toggle("shielded", !!b.shield);
  if (instant) el.getAnimations().forEach((a) => a.cancel());
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function fight() {
  const btn = $("#a-fight");
  if (btn.classList.contains("running")) { token++; btn.classList.remove("running"); btn.textContent = "⚔ LUTAR"; return; }
  saveCode();
  const my = token + 1; token = my;
  btn.classList.add("running"); btn.textContent = "■ PARAR";
  $("#a-term").innerHTML = "";
  const info = oppInfo();
  try { new Function(st().code); } catch (e) { HB().SFX.err(); log(`👻 Erro de sintaxe no seu código: ${HB().esc(e.message)}`, "e"); return end(); }
  log(`> carregando IA... VOCÊ vs ${HB().esc(info.name)}`, "y");
  let res;
  if (info.botId) {
    try { res = await HB().api("POST", "/api/arena/duelo", { botId: info.botId, codigo: st().code }); }
    catch (e) { HB().SFX.err(); log("⚠ " + HB().esc(e.status ? e.message : "Servidor offline. Rode: npm start"), "e"); return end(); }
  } else res = await battle(st().code, info.code, (Date.now() & 0xffff) + 7);
  if (my !== token) return;
  if (res.freeze) { HB().SFX.err(); log("🌀 InfiniteLoop! Sua função turno() travou a arena.", "e"); return end(); }
  if (res.errs[0]) log(`⚠ Seu robô: ${HB().esc(res.errs[0])}`, "e");
  buildArena(res.frames[0].bots);
  await countdown();
  for (let f = 1; f < res.frames.length; f++) {
    if (my !== token) return;
    await playFrame(res.frames[f - 1], res.frames[f]);
  }
  if (my !== token) return;
  finish(res, info);
  end();
}
function end() { const b = $("#a-fight"); b.classList.remove("running"); b.textContent = "⚔ LUTAR"; }

async function countdown() {
  for (const t of ["3", "2", "1", "LUTE!"]) {
    const d = document.createElement("div"); d.className = "count"; d.textContent = t; $("#a-fx").appendChild(d);
    HB().beep(t === "LUTE!" ? 880 : 440, 0.12, "square", 0.06);
    d.animate([{ transform: "translate(-50%,-50%) scale(3)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: .3 }, { transform: "translate(-50%,-50%) scale(.8)", opacity: 0 }], { duration: 520 / Math.max(1, speed / 2), fill: "forwards" }).finished.then(() => d.remove());
    await wait(450 / Math.max(1, speed / 2));
  }
}
async function playFrame(prev, cur) {
  const T = 300 / speed, W = $("#a-world");
  const SFX = HB().SFX;
  cur.bots.forEach((b, i) => {
    const el = W.bots[i], p = prev.bots[i], body = el.querySelector(".body");
    if (b.act === "mover" && (b.x !== p.x || b.y !== p.y)) {
      el.animate([{ left: p.x * cell + "px", top: p.y * cell + "px" }, { left: b.x * cell + "px", top: b.y * cell + "px" }], { duration: T, easing: "cubic-bezier(.4,0,.2,1)" });
      body.animate([{ transform: "none" }, { transform: "scale(.9,1.12) translateY(-10px)" }, { transform: "none" }], { duration: T });
      if (i === 0) SFX.step();
    } else if (b.act === "mover") {
      body.animate([{ transform: "none" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: T });
    }
    if (b.act === "escudo" && b.shield) HB().beep(300, 0.2, "sine", 0.06, 400);
    if (b.say) bubble(el, b.say);
    placeBot(i, b);
  });
  if (cur.shots.length) {
    SFX.laser();
    for (const sh of cur.shots) {
      const a = cur.bots[sh.from], c = (v) => (v + 0.5) * cell;
      const lz = document.createElement("div"); lz.className = "laser" + (sh.from ? " red" : "");
      const lc = !sh.from && window.RW.laserColor();
      if (lc === "rainbow") lz.classList.add("rainbow"); else if (lc) { lz.style.background = `linear-gradient(90deg,#fff,${lc})`; lz.style.boxShadow = `0 0 18px ${lc}`; }
      const len = Math.hypot(c(sh.x) - c(a.x), c(sh.y) - c(a.y)) - (sh.hit ? 0 : cell / 2);
      lz.style.left = c(a.x) + "px"; lz.style.top = c(a.y) - 5 + "px"; lz.style.width = Math.max(0, len) + "px";
      lz.style.transform = `rotate(${a.dir * 90}deg)`;
      W.appendChild(lz);
      lz.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T * 1.2, fill: "forwards", easing: "ease-in" }).finished.then(() => lz.remove());
      if (sh.hit) {
        const target = W.bots[1 - sh.from];
        if (sh.blocked) { SFX.tink(); floatText("BLOQUEOU!", c(sh.x), c(sh.y), "#2de2e6"); }
        else {
          SFX.pop(); shake(6);
          burst(c(sh.x), c(sh.y), sh.from ? ["#2de2e6", "#fff"] : ["#ff3df2", "#ffd23f"], 14);
          floatText("-1", c(sh.x), c(sh.y), "#ff4d6d");
          target.querySelector(".body").animate([{ filter: "brightness(4)" }, { filter: "none" }], { duration: 250 });
        }
      }
    }
  }
  await wait(T + 30);
}
function finish(res, info) {
  const last = res.frames[res.frames.length - 1].bots;
  const won = res.winner === 0;
  const SFX = HB().SFX;
  if (won) {
    SFX.win();
    const W = $("#a-world"); W.bots[1].querySelector(".body").animate([{ transform: "none" }, { transform: "scale(1.4) rotate(20deg)", filter: "brightness(4)" }, { transform: "scale(0) rotate(200deg)", opacity: 0 }], { duration: 700, fill: "forwards" });
    burst((last[1].x + .5) * cell, (last[1].y + .5) * cell, ["#ff4d6d", "#ffd23f", "#ff3df2"], 30);
  } else SFX.die();
  let msg = won ? `🏆 VITÓRIA contra ${HB().esc(info.name)}! (${last[0].hp}❤ restando, ${res.turns} turnos)`
    : res.winner === 1 ? `💥 DERROTA. ${HB().esc(info.name)} venceu com ${last[1].hp}❤.` : `🤝 EMPATE após ${res.turns} turnos.`;
  log(msg, won ? "w" : "e");
  const a = st();
  if (won && opponent.kind === "rival" && !a.beaten[opponent.idx]) {
    a.beaten[opponent.idx] = true; HB().persist(); renderRivals();
    window.RW.addCoins(40 + opponent.idx * 20, $("#a-result"));
    window.RW.grant("arena1");
    if (opponent.idx === RIVALS.length - 1) window.RW.grant("nucleo");
    log(`🎁 Você hackeou o cérebro do rival! Clique em <b>👁 Código do rival</b> e aprenda com ele.`, "y");
  }
  showResult(won, res.winner === -1, info);
}
function showResult(won, draw, info) {
  const d = $("#a-result");
  d.className = "a-result " + (won ? "win" : draw ? "draw" : "lose");
  d.innerHTML = `<b>${won ? "VITÓRIA!" : draw ? "EMPATE" : "DERROTA"}</b><small>${won ? "Seu código é melhor." : "Melhore sua IA e tente de novo!"}</small>`;
  d.animate([{ transform: "translate(-50%,-50%) scale(.2) rotate(-10deg)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1.1) rotate(3deg)", opacity: 1, offset: .5 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }], { duration: 500, fill: "forwards", easing: "ease-out" });
  setTimeout(() => d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }), 2600);
}

// ---------- fx ----------
function bubble(el, text) {
  el.querySelectorAll(".bubble").forEach((b) => b.remove());
  const b = document.createElement("div"); b.className = "bubble"; b.textContent = text; el.appendChild(b);
  setTimeout(() => b.remove(), 900);
}
function toFx(x, y) { const w = $("#a-world").getBoundingClientRect(), s = $("#a-stage").getBoundingClientRect(); return [x + w.left - s.left, y + w.top - s.top]; }
function burst(x, y, colors, n) {
  [x, y] = toFx(x, y);
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div"); p.className = "particle";
    const sz = 5 + Math.random() * 9; p.style.cssText = `width:${sz}px;height:${sz}px;left:${x}px;top:${y}px;background:${colors[i % colors.length]}`;
    $("#a-fx").appendChild(p);
    const ang = Math.random() * 6.28, dd = 30 + Math.random() * 70;
    p.animate([{ transform: "translate(-50%,-50%)" }, { transform: `translate(${Math.cos(ang) * dd}px,${Math.sin(ang) * dd}px) scale(0)` }], { duration: 500 + Math.random() * 300, fill: "forwards", easing: "cubic-bezier(.1,.8,.3,1)" }).finished.then(() => p.remove());
  }
}
function floatText(t, x, y, color) {
  [x, y] = toFx(x, y);
  const d = document.createElement("div"); d.className = "floattxt"; d.textContent = t; d.style.color = color; d.style.left = x + "px"; d.style.top = y + "px";
  $("#a-fx").appendChild(d);
  d.animate([{ transform: "translate(-50%,-50%) scale(.3)", opacity: 0 }, { transform: "translate(-50%,-120%) scale(1.1)", opacity: 1, offset: .3 }, { transform: "translate(-50%,-200%)", opacity: 0 }], { duration: 800, fill: "forwards" }).finished.then(() => d.remove());
}
function shake(a) { $("#a-stage").animate([{ transform: "none" }, { transform: `translate(${a}px,-${a / 2}px)` }, { transform: `translate(-${a}px,${a / 2}px)` }, { transform: "none" }], { duration: 220 }); }
function log(msg, cls = "") { const d = document.createElement("div"); d.className = cls; d.innerHTML = msg; $("#a-term").appendChild(d); $("#a-term").scrollTop = 1e6; }

// ---------- editor ----------
const ta = $("#a-code");
function saveCode() { st().code = ta.value; HB().persist(); }
function paint() {
  $("#a-hl").innerHTML = HB().highlight(ta.value, "js") + "\n";
  $("#a-gutter").innerHTML = ta.value.split("\n").map((_, i) => `<div>${i + 1}</div>`).join("");
}
ta.addEventListener("input", () => { paint(); saveCode(); });
ta.addEventListener("scroll", () => { $("#a-hl").scrollTop = ta.scrollTop; $("#a-gutter").scrollTop = ta.scrollTop; });
ta.addEventListener("keydown", (e) => {
  const ins = (t) => { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, "end"); paint(); saveCode(); };
  if (e.key === "Tab") { e.preventDefault(); ins("  "); }
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fight(); }
  else if (e.key === "Enter") {
    const line = ta.value.slice(0, ta.selectionStart).split("\n").pop();
    let ind = line.match(/^\s*/)[0]; if (/[{(]\s*$/.test(line)) ind += "  ";
    e.preventDefault(); ins("\n" + ind);
  }
});
$("#a-api").innerHTML = ["radar.inimigoNaMira()", "radar.estouNaMira()", "radar.direcaoDoInimigo()", "radar.frente()", "radar.perigoNaFrente()", "radar.distancia()", "radar.vidaInimigo()", "radar.inimigoComEscudo()", "eu.vida", "eu.escudoPronto", "eu.turno", "eu.memoria", 'eu.dizer("...")', '"mover"', '"atirar"', '"escudo"', '"direita"', '"esquerda"']
  .map((t) => `<span>${HB().esc(t)}</span>`).join("");
$("#a-api").onclick = (e) => { if (e.target.tagName === "SPAN") { ta.setRangeText(e.target.textContent, ta.selectionStart, ta.selectionEnd, "end"); ta.focus(); paint(); saveCode(); } };

$("#a-fight").onclick = fight;
$("#a-speed").onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $("#a-speed").textContent = speed + "x"; };
$("#a-share").onclick = async () => {
  const name = prompt("Nome do seu robô:", st().botName || "HackBot") || "HackBot";
  st().botName = name.slice(0, 20); saveCode();
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ n: st().botName, c: st().code }))));
  try { await navigator.clipboard.writeText(code); log("📋 Código de batalha copiado! Mande para um amigo desafiar você.", "w"); }
  catch (e) { prompt("Copie seu código de batalha:", code); }
};
$("#a-peek").onclick = () => {
  if (opponent.kind !== "rival") return log("O código do amigo é segredo. 😏", "y");
  if (!st().beaten[opponent.idx]) { HB().SFX.bump(); return log(`🔒 Vença ${RIVALS[opponent.idx].name} para hackear o cérebro dele.`, "e"); }
  log(`<pre class="peek">${HB().esc(RIVALS[opponent.idx].code)}</pre>`, "");
};
$("#a-reset").onclick = () => { if (confirm("Voltar ao código inicial da arena?")) { ta.value = STARTER; paint(); saveCode(); } };

// ---------- ranking online ----------
let mode = "camp";
document.querySelectorAll("#a-mode button").forEach((b) => b.onclick = () => {
  mode = b.dataset.mode; HB().SFX.click();
  document.querySelectorAll("#a-mode button").forEach((x) => x.classList.toggle("on", x === b));
  $("#rivals").classList.toggle("hidden", mode !== "camp");
  $("#ranking").classList.toggle("hidden", mode !== "rank");
  if (mode === "rank") loadRanking();
  else { opponent = { kind: "rival", idx: 0 }; renderRivals(); }
});
async function loadRanking() {
  const box = $("#ranking");
  const acc = HB().getAccount();
  box.innerHTML = `<div class="rank-top">
    <button class="btn small" id="rk-send">🚀 Enviar minha IA para o ranking</button>
    <button class="btn small" id="rk-reload">↻</button>
    <small>${acc ? "Sua IA luta contra robôs do seu nível e ganha pontos (Elo)." : "🔑 Crie uma conta (tela inicial) para entrar no ranking. Você ainda pode duelar!"}</small></div><div id="rk-list">carregando...</div>`;
  $("#rk-reload").onclick = loadRanking;
  $("#rk-send").onclick = sendBot;
  try {
    const { ranking } = await HB().api("GET", "/api/ranking");
    $("#rk-list").innerHTML = "";
    ranking.forEach((r) => {
      const row = document.createElement("div");
      row.className = "rank-row" + (acc && r.usuario && r.usuario.toLowerCase() === acc.usuario.toLowerCase() ? " me" : "");
      const medal = ["🥇", "🥈", "🥉"][r.pos - 1] || r.pos;
      row.innerHTML = `<span class="pos">${medal}</span><span>${HB().esc(r.nome)}<small>${r.usuario ? "@" + HB().esc(r.usuario) : "rival da campanha"}</small></span>
        <span class="elo">${r.elo}</span><span><small>${r.v}V ${r.d}D ${r.e}E</small></span><button class="btn small">⚔ Duelar</button>`;
      row.querySelector("button").onclick = () => {
        opponent = { kind: "online", botId: r.id, name: r.nome, visual: r.visual };
        HB().SFX.click(); buildArena(STARTS.map((s) => ({ ...s, hp: MAX_HP }))); fight();
      };
      $("#rk-list").appendChild(row);
    });
  } catch (e) { $("#rk-list").innerHTML = `<p>⚠ Ranking offline. Rode o servidor com <code>npm start</code>.</p>`; }
}
async function sendBot() {
  if (!HB().getAccount()) { HB().SFX.bump(); return log("🔑 Entre na sua conta (tela inicial) para participar do ranking.", "e"); }
  saveCode();
  const eq = HB().save.equip || {};
  const btn = $("#rk-send"); btn.disabled = true; btn.textContent = "⏳ lutando partidas de colocação...";
  try {
    const visual = { hue: (window.RW.ITEMS.find((i) => i.id === eq.cor) || {}).hue || 0, chapeu: eq.chapeu || "" };
    const r = await HB().api("POST", "/api/arena/enviar", { codigo: st().code, nome: st().botName || HB().getAccount().usuario, visual });
    $("#a-term").innerHTML = "";
    log(`🌐 <b>Sua IA entrou no ranking!</b> Elo <b>${r.elo}</b> · posição <b>#${r.posicao}</b>`, "w");
    r.lutas.forEach((l) => log(`${l.resultado === "vitória" ? "🏆" : l.resultado === "derrota" ? "💥" : "🤝"} ${HB().esc(l.contra)}: ${l.resultado} (${l.delta >= 0 ? "+" : ""}${l.delta})`, l.resultado === "vitória" ? "w" : l.resultado === "derrota" ? "e" : ""));
    window.RW.grant("ranking"); HB().SFX.win();
    loadRanking();
  } catch (e) { HB().SFX.err(); log("⚠ " + HB().esc(e.status ? e.message : "Servidor offline. Rode: npm start"), "e"); }
  finally { btn.disabled = false; btn.textContent = "🚀 Enviar minha IA para o ranking"; }
}

window.Arena = { open, battle, RIVALS };
})();
