(() => {
const $ = (s) => document.querySelector(s);
const LEVELS = window.LEVELS, MODULES = window.MODULES;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const SPR = {
  robo: ["assets/robot.png", "🤖"], N: ["assets/bug_null.png", "👻"], L: ["assets/bug_loop.png", "🌀"],
  U: ["assets/bug_undefined.png", "👾"], B: ["assets/bug_undefined.png", "👹"], C: ["assets/chip.png", "🪙"],
  E: ["assets/portal.png", "🌀"], wall: ["assets/wall.png", null], F: ["assets/robot.png", "🤖"],
  D: ["assets/door.png", "🚪"], P: ["assets/plate.png", "🔘"],
};
const BUG_NAMES = { N: "NullPointer", L: "InfiniteLoop", U: "Undefined", B: "Chefão" };
const ARENA_LEVEL = LEVELS.findIndex((l) => l.name === "Radar");

// ---------- sprites com fallback ----------
const imgOk = {};
Object.values(SPR).forEach(([src]) => { const i = new Image(); i.onload = () => { imgOk[src] = true; }; i.onerror = () => { imgOk[src] = false; }; i.src = src; });
function sprite(key) {
  const [src, emo] = SPR[key];
  const emoji = () => { const s = document.createElement("span"); s.className = "emoji"; s.textContent = emo; return s; };
  if (imgOk[src] === false && emo) return emoji();
  const img = new Image(); img.className = "sprite"; img.src = src; img.alt = "";
  img.onerror = () => { if (emo) img.replaceWith(emoji()); else img.remove(); };
  return img;
}
document.querySelectorAll("img[data-src]").forEach((img) => {
  img.onerror = () => { const s = document.createElement("span"); s.className = img.className + " emoji"; s.style.fontSize = "100px"; s.textContent = img.dataset.emoji; img.replaceWith(s); };
  img.src = img.dataset.src;
});

// ---------- save + conta ----------
const save = { stars: {}, code: {} };
try { Object.assign(save, JSON.parse(localStorage.getItem("hackbot") || "{}")); } catch (e) {}
let account = null, syncTimer = null;
function persist() {
  try { localStorage.setItem("hackbot", JSON.stringify(save)); } catch (e) {}
  if (account) { clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 1500); }
}
function syncNow() {
  if (!account) return;
  api("PUT", "/api/progresso", { progresso: save }).catch(() => {});
}
function replaceSave(obj) {
  Object.keys(save).forEach((k) => delete save[k]);
  Object.assign(save, { stars: {}, code: {} }, obj || {});
  window.RW.init(save, persist, SFX);
  try { localStorage.setItem("hackbot", JSON.stringify(save)); } catch (e) {}
}
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  let data = {}; try { data = await r.json(); } catch (e) {}
  if (!r.ok) throw Object.assign(new Error(data.erro || "Erro " + r.status), { status: r.status });
  return data;
}
const unlocked = (i) => i === 0 || (save.stars[i - 1] || 0) > 0;

// ---------- som (sintetizado) ----------
let actx;
function beep(freq = 440, dur = 0.1, type = "square", vol = 0.08, slide = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}
const SFX = {
  step: () => beep(220 + Math.random() * 40, 0.06, "triangle", 0.06, 120),
  bump: () => beep(110, 0.15, "square", 0.08, -60),
  turn: () => beep(500, 0.05, "sine", 0.05, 200),
  laser: () => beep(1400, 0.18, "sawtooth", 0.05, -1200),
  pop: () => { beep(180, 0.2, "square", 0.08, -150); beep(900, 0.1, "triangle", 0.05, 600); },
  chip: () => { beep(988, 0.07, "square", 0.05); setTimeout(() => beep(1319, 0.12, "square", 0.05), 60); },
  tink: () => beep(2200, 0.08, "triangle", 0.06),
  die: () => beep(400, 0.6, "sawtooth", 0.08, -380),
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18, "square", 0.06), i * 110)),
  err: () => { beep(150, 0.12, "square", 0.08); setTimeout(() => beep(110, 0.2, "square", 0.08), 120); },
  click: () => beep(660, 0.04, "triangle", 0.05),
  door: () => { beep(300, 0.25, "sawtooth", 0.05, 500); setTimeout(() => beep(900, 0.1, "sine", 0.05), 200); },
  beep: () => beep(1200, 0.05, "square", 0.04),
};
window.RW.init(save, persist, SFX);

// ---------- telas ----------
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  if (id === "map") renderMap();
  if (id === "title") renderTitle();
  if (id === "codex") renderCodex();
  if (id === "shop") window.RW.renderShop();
  if (id === "trophies") window.RW.renderTrophies();
  if (id === "arena" && window.Arena) window.Arena.open();
  if (id !== "game") stopRun();
  window.RW.refreshCoins();
}
document.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { SFX.click(); show(b.dataset.go); });

// ---------- título + login ----------
function renderTitle() {
  const box = $("#title-auth");
  if (account) {
    box.innerHTML = `<p class="hello">Olá, <b>${esc(account.usuario)}</b>! 👋</p>
      <button class="btn big pulse" id="btn-play">▶ CONTINUAR</button><br><button class="btn small" id="btn-logout">Sair da conta</button>`;
    $("#btn-logout").onclick = async () => { await api("POST", "/api/logout").catch(() => {}); account = null; replaceSave({}); renderTitle(); };
  } else {
    box.innerHTML = `<button class="btn big pulse" id="btn-play">▶ JOGAR</button>
      <div class="auth-row"><button class="btn small" id="btn-login">🔑 Entrar</button><button class="btn small" id="btn-signup">✨ Criar conta</button></div>
      <small class="guest-note">Sem conta, seu progresso fica só neste navegador.</small>`;
    $("#btn-login").onclick = () => openAuth("login");
    $("#btn-signup").onclick = () => openAuth("cadastro");
  }
  $("#btn-play").onclick = () => { SFX.win(); show("map"); };
}
let authMode = "login";
function openAuth(mode) {
  authMode = mode; $("#auth").classList.remove("hidden"); $("#auth-err").textContent = "";
  document.querySelectorAll("#auth-mode button").forEach((b) => b.classList.toggle("on", b.dataset.m === mode));
  $("#auth-form").classList.toggle("cad", mode === "cadastro");
  $("#auth-go").textContent = mode === "login" ? "Entrar ▶" : "Criar conta ▶";
  $("#auth-form").senha.autocomplete = mode === "login" ? "current-password" : "new-password";
  setTimeout(() => $("#auth-form").usuario.focus(), 50);
}
document.querySelectorAll("#auth-mode button").forEach((b) => b.onclick = () => openAuth(b.dataset.m));
$("#auth-cancel").onclick = () => $("#auth").classList.add("hidden");
$("#auth-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target, go = $("#auth-go");
  go.disabled = true;
  try {
    const body = { usuario: f.usuario.value.trim(), senha: f.senha.value };
    let u;
    if (authMode === "cadastro") u = await api("POST", "/api/cadastro", { ...body, curso: f.curso.value, progresso: save });
    else u = await api("POST", "/api/login", body);
    account = { usuario: u.usuario, curso: u.curso };
    // conta nova leva o progresso de convidado; conta existente traz o progresso salvo
    if (authMode === "login" && u.progresso && Object.keys(u.progresso).length) replaceSave(u.progresso);
    else syncNow();
    f.senha.value = "";
    $("#auth").classList.add("hidden");
    SFX.win(); window.RW.toast(`<span class="t-ic">🔑</span><div><b>Bem-vindo, ${esc(account.usuario)}!</b><small>Seu progresso agora fica salvo na nuvem.</small></div>`);
    renderTitle();
  } catch (err) {
    SFX.err(); $("#auth-err").textContent = err.status ? err.message : "Servidor offline. Rode: npm start";
  } finally { go.disabled = false; }
};
api("GET", "/api/eu").then((u) => {
  account = { usuario: u.usuario, curso: u.curso };
  if (u.progresso && Object.keys(u.progresso).length) replaceSave(u.progresso); else syncNow();
  renderTitle();
}).catch(() => renderTitle());
window.addEventListener("beforeunload", () => { if (account) { clearTimeout(syncTimer); navigator.sendBeacon && fetch("/api/progresso", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progresso: save }), keepalive: true }).catch(() => {}); } });

// ---------- mapa ----------
function renderMap() {
  const box = $("#map-path"); box.innerHTML = "";
  let total = 0;
  $("#user-pill").textContent = account ? "👤 " + account.usuario : "👤 convidado";
  MODULES.forEach((mod, mi) => {
    const idx = LEVELS.map((l, i) => (l.mod === mod.id ? i : -1)).filter((i) => i >= 0);
    const done = idx.filter((i) => save.stars[i]).length;
    const sec = document.createElement("section"); sec.className = "module";
    sec.style.setProperty("--mc", mod.color);
    sec.style.animationDelay = mi * 0.06 + "s";
    const chestState = save.chests && save.chests[mod.id] ? "🔓" : done === idx.length ? "🎁" : "🔒";
    sec.innerHTML = `<header><div><small>${mod.world} · Módulo ${mi + 1}</small><h3>${mod.name}</h3></div>
      <div class="mod-prog"><i style="width:${(done / idx.length) * 100}%"></i></div><span class="mod-chest" title="Baú do módulo">${chestState}</span></header><div class="nodes"></div>`;
    const nodes = sec.querySelector(".nodes");
    idx.forEach((i) => {
      const lv = LEVELS[i], st = save.stars[i] || 0; total += st;
      const n = document.createElement("div");
      const isCur = unlocked(i) && !st;
      n.className = "node" + (st ? " done" : "") + (!unlocked(i) ? " locked" : "") + (isCur ? " current" : "");
      n.innerHTML = `<div class="disc">${unlocked(i) ? (lv.lesson ? (window.LESSONS[lv.lesson] || {}).emoji || i + 1 : i + 1) : "🔒"}</div>
        <div class="nm">${lv.name}</div><div class="st">${"★".repeat(st)}<i>${"★".repeat(3 - st)}</i></div>${lv.lesson && unlocked(i) && !(save.seen || {})[lv.lesson] ? '<span class="new-badge">AULA NOVA</span>' : ""}`;
      n.onclick = () => { if (unlocked(i)) { SFX.click(); startLevel(i); } else { SFX.bump(); n.animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: 250 }); } };
      nodes.appendChild(n);
    });
    if (chestState === "🎁") sec.querySelector(".mod-chest").onclick = () => window.RW.openChest(mod.id, `Baú: ${mod.name}`).then(renderMap);
    // arena logo depois do módulo de decisões
    if (mod.id === "m4") {
      const open = (save.stars[ARENA_LEVEL] || 0) > 0;
      const a = document.createElement("div");
      a.className = "node arena-node" + (open ? "" : " locked");
      a.innerHTML = `<div class="disc">${open ? "⚔" : "🔒"}</div><div class="nm">ARENA</div><div class="st small">${open ? "batalhe e suba no ranking!" : "vença a fase Radar"}</div>`;
      a.onclick = () => { if (open) { SFX.click(); show("arena"); } else SFX.bump(); };
      nodes.appendChild(a);
    }
    box.appendChild(sec);
  });
  $("#total-stars").textContent = total + "/" + LEVELS.length * 3;
  const cur = box.querySelector(".node.current");
  if (cur) setTimeout(() => cur.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
}

// ---------- códex ----------
function renderCodex() {
  const list = $("#codex-list"); list.innerHTML = "";
  LEVELS.forEach((lv, i) => {
    if (!lv.lesson) return;
    const L0 = window.LESSONS[lv.lesson]; if (!L0) return;
    const open = unlocked(i);
    const c = document.createElement("div"); c.className = "codex-item card" + (open ? "" : " locked");
    c.innerHTML = `<div class="cx-ic">${open ? L0.emoji : "🔒"}</div><b>${L0.title}</b><small>${open ? L0.summary : "Chegue na fase " + (i + 1) + " para liberar"}</small>${open ? '<span class="btn small">▶ Assistir</span>' : ""}`;
    if (open) c.onclick = () => { SFX.click(); window.Lesson.open(lv.lesson, (fin) => { if (fin) lessonDone(lv.lesson); }); };
    list.appendChild(c);
  });
}
function lessonDone(id) {
  save.seen = save.seen || {};
  if (!save.seen[id]) { save.seen[id] = 1; persist(); if (Object.keys(save.seen).length >= 5) window.RW.grant("aulas5"); }
}

// ---------- fase ----------
let L = null;
let curTab = "js";
let speed = 1;
let runToken = 0;

function startLevel(i, skipLesson) {
  const lv = LEVELS[i];
  save.code[i] = save.code[i] || {};
  L = { i, lv, code: { js: save.code[i].js ?? lv.js ?? "", css: save.code[i].css ?? lv.css ?? "", html: save.code[i].html ?? lv.html ?? "" } };
  const mod = MODULES.find((m) => m.id === lv.mod);
  $("#lvl-name").textContent = `${i + 1}. ${lv.name}`;
  $("#lvl-world").textContent = `${mod.world} · ${mod.name}`;
  $("#mission").innerHTML = lv.intro + (lv.must ? `<div class="must">🎯 ${lv.must.map((m) => m.msg).join(" · ")}</div>` : "");
  $("#btn-lesson").style.display = lv.lesson ? "" : "none";
  curTab = "js";
  renderTabs(); renderApi(); show("game");
  buildWorld(); loadTab();
  $("#term").innerHTML = "";
  log("> sistema pronto. escreva o código e aperte RODAR. (Ctrl+Enter)", "y");
  if (lv.lesson && !skipLesson && !(save.seen || {})[lv.lesson]) setTimeout(() => window.Lesson.open(lv.lesson, (fin) => { lessonDone(lv.lesson); }), 350);
}
$("#btn-lesson").onclick = () => { if (L && L.lv.lesson) window.Lesson.open(L.lv.lesson, (fin) => { if (fin) lessonDone(L.lv.lesson); }); };
$("#btn-hint").onclick = () => {
  if (!L) return;
  const les = window.LESSONS[L.lv.lesson] || window.LESSONS[(LEVELS.slice(0, L.i).reverse().find((l) => l.lesson) || {}).lesson];
  log(`💡 <b>Dica:</b> ${L.lv.intro}`, "y");
  if (les) log(`📌 <b>${les.title}:</b> ${les.summary}`, "y");
  const recap = les && les.scenes.find((s) => s.vis.type === "recap");
  if (recap) log(recap.vis.lines.map((l) => `<code>${esc(l)}</code>`).join("<br>"), "");
};

function buildWorld() {
  stopRun();
  const W = $("#world"), stage = $("#stage");
  const p = window.SIM_PARSE(L.lv);
  L.grid = p.grid; L.ents = p.ents; L.start = p.start; L.cfg = p.cfg; L.robot = { x: p.start.x, y: p.start.y, dir: 0 };
  const cols = L.grid[0].length, rows = L.grid.length;
  const cell = Math.max(28, Math.floor(Math.min((stage.clientWidth - 40) / cols, (stage.clientHeight - 40) / rows, 96)));
  L.cell = cell;
  document.documentElement.style.setProperty("--cell", cell + "px");
  W.style.width = cols * cell + "px"; W.style.height = rows * cell + "px";
  W.innerHTML = "";
  const place = (el, x, y) => { el.style.left = x * cell + "px"; el.style.top = y * cell + "px"; W.appendChild(el); return el; };
  L.grid.forEach((row, y) => [...row].forEach((c, x) => {
    const t = document.createElement("div");
    t.className = "tile " + (c === "X" ? "metal" : c === "_" ? "buraco" : "chao");
    t.style.animation = `nodeIn .4s ${(x + y) * 0.02}s cubic-bezier(.2,1.6,.4,1) backwards`;
    place(t, x, y);
    if (c === "E") { const pe = document.createElement("div"); pe.className = "ent portal"; const b = document.createElement("div"); b.className = "body"; b.appendChild(sprite("E")); pe.appendChild(b); place(pe, x, y); }
    if (L.lv.coords && c !== "X") { const k = document.createElement("div"); k.className = "coord"; k.textContent = x + "," + y; place(k, x, y); }
  }));
  L.bridgeLayer = document.createElement("div"); W.appendChild(L.bridgeLayer);
  L.ents.forEach((en) => {
    const el = document.createElement("div");
    const b = document.createElement("div"); b.className = "body";
    if (en.kind === "bug") { el.className = `ent bug ${{ N: "null", L: "loop", U: "undefined", B: "chefe" }[en.type]}`; b.appendChild(sprite(en.type)); }
    else if (en.kind === "friend") { el.className = "ent amigo"; b.appendChild(sprite("F")); el.insertAdjacentHTML("beforeend", '<span class="heart">💚</span>'); }
    else if (en.kind === "chip") { el.className = "ent chip"; b.appendChild(sprite("C")); }
    else if (en.kind === "firewall") { el.className = "ent firewall"; if (imgOk["assets/wall.png"]) { b.classList.add("hasimg"); b.appendChild(sprite("wall")); } }
    else if (en.kind === "dom") {
      el.className = `ent dom dom-${en.dom.tag} ` + en.dom.cls.join(" ");
      el.dataset.id = en.dom.id;
      if (en.type === "D") { b.appendChild(sprite("D")); if (en.dom.locked) el.insertAdjacentHTML("beforeend", '<span class="lock">🔒</span>'); if (en.dom.needsEvent) el.insertAdjacentHTML("beforeend", '<span class="lock">🧲</span>'); }
      else if (en.type === "P") b.appendChild(sprite("P"));
      else if (en.type === "G") b.innerHTML = "<i></i><i></i><i></i>";
      else b.innerHTML = `<div class="screen-txt">${esc(en.dom.text || "")}</div>`;
      el.insertAdjacentHTML("beforeend", `<span class="dom-tag">#${esc(en.dom.id)}</span>`);
    }
    el.appendChild(b); place(el, en.x, en.y); en.el = el;
    if (en.kind === "dom") el.insertBefore(b, el.firstChild);
  });
  const r = document.createElement("div"); r.className = "ent robo";
  r.innerHTML = `<div class="arrow"></div><div class="body"><div class="face"></div></div>`;
  r.querySelector(".face").appendChild(sprite("robo"));
  window.RW.decorate(r.querySelector(".face"));
  place(r, L.start.x, L.start.y); L.robotEl = r;
  setDir(0);
  applyUserCss(); applyHtml();
  L.chipsTotal = L.ents.filter((e) => e.kind === "chip").length; L.chips = 0; updateChips();
}
function setDir(d) {
  L.robot.dir = d;
  L.robotEl.querySelector(".arrow").style.transform = `rotate(${d * 90}deg)`;
  L.robotEl.querySelector(".face").style.transform = d === 2 ? "scaleX(-1)" : d === 3 ? "rotate(-12deg)" : d === 1 ? "rotate(12deg)" : "";
}
function updateChips() { $("#chip-count").textContent = `💾 ${L.chips}/${L.chipsTotal}`; }

// ---------- CSS / HTML do jogador ----------
const userStyle = document.createElement("style"); document.head.appendChild(userStyle);
function applyUserCss() {
  if (!L.lv.tabs.includes("css")) { userStyle.textContent = ""; return; }
  const src = L.code.css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@[^{;]+;/g, "");
  let out = "";
  src.replace(/([^{}]+)\{([^{}]*)\}/g, (_, sel, body) => {
    const s = sel.split(",").map((x) => "#world " + x.trim()).filter((x) => x !== "#world ").join(",");
    if (s) out += `${s}{${body}}\n`;
  });
  userStyle.textContent = out;
}
function applyHtml() {
  L.bridges = []; L.htmlWarn = null;
  if (!L.bridgeLayer) return;
  L.bridgeLayer.innerHTML = "";
  if (!L.lv.tabs.includes("html")) return;
  const doc = new DOMParser().parseFromString(L.code.html, "text/html");
  let used = 0;
  doc.querySelectorAll("ponte").forEach((p) => {
    const x = +p.getAttribute("x"), y = +p.getAttribute("y"), w = +(p.getAttribute("largura") || 1);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    for (let k = 0; k < Math.max(1, w); k++) {
      const cx = x + k;
      if (L.grid[y] && L.grid[y][cx] === "_") {
        if (used >= (L.lv.pieces || 99)) { L.htmlWarn = `Só existem ${L.lv.pieces} tábuas!`; continue; }
        used++; L.bridges.push({ x: cx, y });
        addPlank(cx, y, k);
      }
    }
  });
}
function addPlank(x, y, k = 0) {
  const t = document.createElement("div"); t.className = "tile ponte";
  t.style.left = x * L.cell + "px"; t.style.top = y * L.cell + "px"; t.style.animationDelay = k * 0.07 + "s";
  L.bridgeLayer.appendChild(t);
}
function readHacks() {
  const grid = L.grid.map((r) => [...r]);
  L.bridges.forEach((b) => grid[b.y][b.x] = "=");
  const ents = [];
  L.ents.forEach((en) => {
    const cs = getComputedStyle(en.el);
    const hidden = cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.3;
    if (en.kind === "firewall") { if (hidden) grid[en.y][en.x] = "."; return; }
    let scale = 1;
    const m = cs.transform.match(/matrix\(([^)]+)\)/);
    if (m) { const [a, b] = m[1].split(",").map(Number); scale = Math.hypot(a, b); }
    if (cs.scale && cs.scale !== "none") scale *= parseFloat(cs.scale);
    const copy = { ...en, small: scale <= 0.6 }; delete copy.el;
    ents.push(copy);
  });
  return { grid: grid.map((r) => r.join("")), ents };
}

// ---------- editor ----------
const TABNAME = { js: "robo.js", css: "hack.css", html: "build.html" };
function renderTabs() {
  const t = $("#tabs"); t.innerHTML = "";
  L.lv.tabs.forEach((k) => {
    const b = document.createElement("button");
    const isNew = k !== "js" && !LEVELS.slice(0, L.i).some((l) => l.tabs.includes(k));
    b.className = `tab ${k}` + (k === curTab ? " on" : "") + (isNew && k !== curTab ? " new" : "");
    b.textContent = TABNAME[k];
    b.onclick = () => { saveTab(); curTab = k; SFX.click(); renderTabs(); loadTab(); };
    t.appendChild(b);
  });
}
const SNIPPETS = {
  "if / else": "if (radar.frente() === \"bug\") {\n  \n} else {\n  \n}",
  "while (...) { }": "while (!robo.noPortal()) {\n  \n}",
  "for (const x of lista) { }": "for (const passo of lista) {\n  \n}",
  "lista.forEach(el => { })": "lista.forEach((el) => {\n  \n});",
  "function nome() { }": "function nome() {\n  \n}",
  "function f(parametro) { }": "function f(parametro) {\n  \n}",
  'el.addEventListener("pisar", () => { })': 'el.addEventListener("pisar", () => {\n  \n});',
};
function renderApi() {
  const a = $("#api"); a.innerHTML = "";
  // comandos novos desta fase primeiro, depois os antigos (do mais recente ao mais antigo)
  LEVELS.slice(0, L.i + 1).map((lv, li) => [lv, li]).reverse().forEach(([lv, li]) => lv.unlock.forEach((u) => {
    if (u.startsWith("Você")) return;
    const s = document.createElement("span"); s.textContent = u;
    if (li === L.i) s.className = "new";
    s.onclick = () => insert(SNIPPETS[u] || (u.startsWith("CSS: ") ? u.slice(5) + ": " : u));
    a.appendChild(s);
  }));
}
const ta = $("#code");
function loadTab() { ta.value = L.code[curTab]; paint(); }
function saveTab() { L.code[curTab] = ta.value; save.code[L.i][curTab] = ta.value; persist(); }
function insert(txt) { const s = ta.selectionStart; ta.setRangeText(txt, s, ta.selectionEnd, "end"); ta.focus(); onEdit(); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function highlight(src, kind) {
  if (kind === "css") return esc(src).replace(/(\/\*[\s\S]*?\*\/)|([.#][\w-]+)(?=[^{}]*\{)|([\w-]+)(?=\s*:)|(\d+\.?\d*(px|%|deg)?)/g,
    (m, c, sel, prop) => c ? `<span class="c">${c}</span>` : sel ? `<span class="k">${sel}</span>` : prop ? `<span class="o">${prop}</span>` : `<span class="n">${m}</span>`);
  if (kind === "html") return esc(src).replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w-]+)|([\w-]+)(=)|("[^"]*")/g,
    (m, c, lt, tag, at, eq) => c ? `<span class="c">${c}</span>` : tag ? `${lt}<span class="t">${tag}</span>` : at ? `<span class="a">${at}</span>${eq}` : `<span class="s">${m}</span>`);
  return esc(src).replace(/(\/\/.*)|("[^"\n]*"|'[^'\n]*'|`[^`]*`)|\b(for|while|if|else|let|const|var|function|return|true|false|break|continue|of|in|new|null|undefined)\b|\b(\d+)\b|\b(robo|radar|console|document)\b|\.(\w+)(?=\()|(=&gt;)/g,
    (m, c, s, k, n, o, f, arrow) => c ? `<span class="c">${c}</span>` : s ? `<span class="s">${s}</span>` : k ? `<span class="k">${k}</span>` : n ? `<span class="n">${n}</span>` : o ? `<span class="o">${o}</span>` : f ? `.<span class="f">${f}</span>` : `<span class="k">${arrow}</span>`);
}
function countLines(src) { return src.split("\n").filter((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l)).length; }
function paint(errLine) {
  $("#hl").innerHTML = highlight(ta.value, curTab) + "\n";
  const n = ta.value.split("\n").length;
  $("#gutter").innerHTML = Array.from({ length: n }, (_, i) => `<div class="${curTab === "js" && errLine === i + 1 ? "err" : ""}">${i + 1}</div>`).join("");
  const lc = countLines(curTab === "js" ? ta.value : L.code.js);
  const el = $("#lines"); el.innerHTML = `linhas JS<br>${lc} / meta ${L.lv.par}`;
  el.classList.toggle("ok", lc <= L.lv.par);
}
function onEdit() {
  L.code[curTab] = ta.value; saveTab(); paint();
  if (curTab === "css") applyUserCss();
  if (curTab === "html") applyHtml();
}
ta.addEventListener("input", onEdit);
ta.addEventListener("keydown", (e) => {
  if (e.key === "Tab") { e.preventDefault(); insert("  "); }
  else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
  else if (e.key === "Enter") {
    const line = ta.value.slice(0, ta.selectionStart).split("\n").pop();
    let ind = line.match(/^\s*/)[0]; if (/[{(]\s*$/.test(line)) ind += "  ";
    e.preventDefault(); insert("\n" + ind);
  }
  const pairs = { "(": ")", "{": "}", "[": "]", '"': '"', "`": "`" };
  if (pairs[e.key] && ta.selectionStart === ta.selectionEnd) {
    e.preventDefault(); const s = ta.selectionStart; ta.setRangeText(e.key + pairs[e.key], s, s, "start"); ta.selectionStart = ta.selectionEnd = s + 1; onEdit();
  }
});
ta.addEventListener("scroll", () => { $("#hl").scrollTop = ta.scrollTop; });
function log(msg, cls = "") { const d = document.createElement("div"); d.className = cls; d.innerHTML = msg; $("#term").appendChild(d); $("#term").scrollTop = 1e6; }

$("#btn-speed").onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $("#btn-speed").textContent = speed + "x"; SFX.click(); };
$("#btn-reset").onclick = () => { if (!confirm("Voltar o código desta aba ao original?")) return; ta.value = L.lv[curTab] || ""; onEdit(); buildWorld(); };
$("#btn-run").onclick = () => run();
window.addEventListener("resize", () => { if (L && $("#game").classList.contains("active") && !L.running) buildWorld(); });

// ---------- execução ----------
function stopRun() {
  runToken++;
  if (L) L.running = false;
  const b = $("#btn-run"); b.classList.remove("running"); b.textContent = "▶ RODAR";
}
async function run() {
  if (L.running) { stopRun(); buildWorld(); return; }
  saveTab();
  const miss = (L.lv.must || []).filter((m) => !m.re.test(L.code.js));
  if (miss.length) {
    SFX.err(); $("#term").innerHTML = "";
    log("🎯 <b>Missão de aprendizado:</b> " + miss.map((m) => m.msg).join(" · "), "e");
    $("#mission").animate([{ transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "none" }], { duration: 300 });
    return;
  }
  buildWorld();
  await wait(60);
  if (L.htmlWarn) log("🔨 " + L.htmlWarn, "e");
  const hacks = readHacks();
  L.running = true;
  save.attempts = save.attempts || {}; save.attempts[L.i] = (save.attempts[L.i] || 0) + 1;
  const token = ++runToken;
  const b = $("#btn-run"); b.classList.add("running"); b.textContent = "■ PARAR";
  $("#term").innerHTML = ""; log("> compilando robo.js...", "y");
  const res = await window.runSimulation({ grid: hacks.grid, ents: hacks.ents, start: L.start, code: L.code.js, cfg: L.cfg });
  if (token !== runToken) return;
  if (res.result === "error") return onError(res);
  if (res.result === "freeze") { await glitch(); return fail("🌀 <b>InfiniteLoop</b> te pegou! Seu código nunca termina. Algum <code>while</code> nunca fica falso?"); }
  if (res.result === "loop") res.events = res.events.slice(0, 12);
  for (const ev of res.events) {
    if (token !== runToken) return;
    await play(ev);
  }
  if (token !== runToken) return;
  if (res.result === "loop") fail("🌀 <b>InfiniteLoop</b>! Ações demais... o robô ficou tonto.");
  else if (res.result === "dead") fail("💥 Robô destruído! Ajuste o código e tente de novo.");
  else if (res.result === "ended") { bubble(L.robotEl, "...e agora? 🤔"); fail("O código acabou mas o robô não chegou no portal."); }
  else if (res.result === "win") win();
}
function fail(msg) {
  log(msg, "e"); stopRun();
  if (window.RW.stat("fails") >= 10) window.RW.grant("errar");
}
async function onError(res) {
  SFX.err();
  let msg = res.errMsg || "Erro desconhecido";
  let m;
  if ((m = msg.match(/ReferenceError: (\S+) is not defined/))) msg = `👾 <b>Undefined</b> te pegou! <code>${esc(m[1])}</code> não existe. Erro de digitação? (maiúsculas contam!)`;
  else if ((m = msg.match(/TypeError: Cannot read propert(?:y|ies) of null/))) msg = `👻 <b>NullPointer!</b> O <code>querySelector</code> não achou nada. Confira o seletor: <code>#id</code> ou <code>.classe</code>.`;
  else if ((m = msg.match(/TypeError: (.+) is not a function/))) msg = `🤖 <code>${esc(m[1])}</code> não é um comando. Veja os botões abaixo do código.`;
  else if (msg.startsWith("SyntaxError")) msg = `👻 <b>NullPointer</b> de sintaxe: ${esc(msg.slice(13))}. Faltou fechar <code>( )</code>, <code>{ }</code> ou aspas?`;
  else msg = "⚠ " + esc(msg);
  if (res.errLine) { msg += ` <span class="y">(linha ${res.errLine})</span>`; if (curTab === "js") paint(res.errLine); }
  await glitch();
  fail(msg);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T = () => 340 / speed;
const px = (x, y) => [x * L.cell, y * L.cell];
const center = (x, y) => [(x + 0.5) * L.cell, (y + 0.5) * L.cell];
const entById = (id) => L.ents.find((e) => e.id === id);

async function play(ev) {
  const r = L.robotEl, body = r.querySelector(".body");
  if (ev.t === "move") {
    const [fx, fy] = [L.robot.x, L.robot.y];
    let tx = ev.x, ty = ev.y;
    if (ev.half) { tx = fx + (ev.x - fx) * 0.45; ty = fy + (ev.y - fy) * 0.45; }
    const [ax, ay] = px(fx, fy), [bx, by] = px(tx, ty);
    SFX.step();
    body.animate([{ transform: "scale(1,1)" }, { transform: "scale(1.18,.82)", offset: .18 }, { transform: "scale(.88,1.14) translateY(-16px)", offset: .5 }, { transform: "scale(1.14,.86)", offset: .86 }, { transform: "scale(1,1)" }], { duration: T(), easing: "ease-out" });
    await r.animate([{ left: ax + "px", top: ay + "px" }, { left: ax + "px", top: ay + "px", offset: .16 }, { left: bx + "px", top: by + "px" }], { duration: T(), easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).finished;
    r.style.left = bx + "px"; r.style.top = by + "px";
    if (!ev.half) { L.robot.x = ev.x; L.robot.y = ev.y; dust(...center(fx, fy)); }
  } else if (ev.t === "turn") {
    SFX.turn();
    body.animate([{ transform: "scale(1) rotate(0)" }, { transform: "scale(.85,1.1) rotate(-10deg)", offset: .4 }, { transform: "scale(1)" }], { duration: T() * 0.7 });
    setDir(ev.dir); await wait(T() * 0.7);
  } else if (ev.t === "bump") {
    SFX.bump();
    const [dx, dy] = DIRS[ev.dir];
    await body.animate([{ transform: "none" }, { transform: `translate(${dx * 14}px,${dy * 14}px) scale(${dx ? .8 : 1.1},${dx ? 1.1 : .8})`, offset: .3 }, { transform: `translate(${-dx * 4}px,${-dy * 4}px)`, offset: .6 }, { transform: "none" }], { duration: T() }).finished;
    floatText(ev.what === "porta" ? "TRANCADA!" : ev.what === "grade" ? "ZZZT!" : "BONK!", ...center(L.robot.x + dx * .5, L.robot.y + dy * .5), "#ff9a3d");
  } else if (ev.t === "shoot") {
    SFX.laser();
    const [sx, sy] = center(L.robot.x, L.robot.y);
    const [dx, dy] = DIRS[ev.dir];
    const ex = (ev.x + 0.5 - dx * 0.5) * L.cell, ey = (ev.y + 0.5 - dy * 0.5) * L.cell;
    body.animate([{ transform: `translate(${-dx * 10}px,${-dy * 10}px) scale(.9,1.1)` }, { transform: "none" }], { duration: T() * 0.6, easing: "ease-out" });
    const lz = document.createElement("div"); lz.className = "laser";
    const lc = window.RW.laserColor();
    if (lc === "rainbow") lz.classList.add("rainbow"); else if (lc) { lz.style.background = `linear-gradient(90deg,#fff,${lc})`; lz.style.boxShadow = `0 0 18px ${lc}`; }
    lz.style.left = sx + "px"; lz.style.top = sy - 5 + "px"; lz.style.width = Math.hypot(ex - sx, ey - sy) + "px";
    $("#world").appendChild(lz);
    await lz.animate([{ transform: `rotate(${ev.dir * 90}deg) scaleX(0)` }, { transform: `rotate(${ev.dir * 90}deg) scaleX(1)` }], { duration: T() * 0.4, easing: "ease-in", fill: "forwards" }).finished;
    lz.animate([{ opacity: 1 }, { opacity: 0, height: "2px" }], { duration: 250, fill: "forwards" }).finished.then(() => lz.remove());
    const target = entById(ev.kill || ev.ricochet);
    if (ev.kill) {
      SFX.pop(); shake(8);
      burst(...center(target.x, target.y), ["#ff3df2", "#ffd23f", "#2de2e6", "#6a2cff"], 22);
      if (target.kind === "bug") { floatText("DEBUGADO!", ...center(target.x, target.y), "#4dff9a"); if (window.RW.stat("kills") >= 25) window.RW.grant("exterminador"); }
      await target.el.querySelector(".body").animate([{ transform: "scale(1)" }, { transform: "scale(1.5,.4)", offset: .3, filter: "brightness(3)" }, { transform: "scale(0) rotate(90deg)", opacity: 0 }], { duration: T() * 1.1, fill: "forwards" }).finished;
      target.el.style.visibility = "hidden";
    } else if (ev.ricochet) {
      SFX.tink(); shake(3);
      burst(ex, ey, ["#fff", "#2de2e6"], 10);
      floatText("TINK! grande demais", ...center(target.x, target.y), "#ff4d6d");
      target.el.querySelector(".body").animate([{ transform: "none" }, { transform: "translateX(6px) scale(1.05)" }, { transform: "none" }], { duration: 300 });
      await wait(T());
    } else { burst(ex, ey, ["#2de2e6", "#fff"], 6); await wait(T() * 0.4); }
  } else if (ev.t === "collect") {
    SFX.chip();
    const en = entById(ev.id);
    L.chips++; updateChips();
    floatText("+1", ...center(en.x, en.y), "#ffd23f");
    burst(...center(en.x, en.y), ["#ffd23f", "#fff"], 8);
    en.el.animate([{ transform: "none" }, { transform: "translateY(-60px) scale(1.6)", opacity: 0 }], { duration: 400, fill: "forwards", easing: "cubic-bezier(.2,1.6,.4,1)" });
    $("#chip-count").animate([{ transform: "scale(1.4) rotate(-6deg)" }, { transform: "none" }], { duration: 300 });
  } else if (ev.t === "say") {
    log((ev.warn ? "⚠ " : "🤖 ") + esc(ev.text), ev.warn ? "y" : "w"); bubble(ev.warn ? L.robotEl : r, ev.text); await wait(T() * 1.6);
  } else if (ev.t === "dom") {
    const en = entById(ev.id);
    en.el.classList.toggle("is-open", ev.open);
    SFX.door();
    burst(...center(en.x, en.y), ["#2de2e6", "#fff", "#ffd23f"], 12);
    floatText(ev.open ? (en.type === "G" ? "DESLIGADA!" : "ABRIU!") : "FECHOU", ...center(en.x, en.y), "#2de2e6");
    await wait(T() * 1.2);
  } else if (ev.t === "text") {
    const en = entById(ev.id);
    const s = en.el.querySelector(".screen-txt"); if (s) { s.textContent = ev.text; s.animate([{ filter: "brightness(3)" }, { filter: "none" }], { duration: 400 }); }
    SFX.beep(); await wait(T() * 0.8);
  } else if (ev.t === "access") {
    const term = L.ents.find((e) => e.type === "T");
    if (ev.ok) { SFX.win(); log("🔓 ACESSO LIBERADO!", "w"); if (term) { term.el.classList.add("granted"); floatText("ACESSO OK", ...center(term.x, term.y), "#4dff9a"); } L.ents.forEach((e) => { if (e.type === "D") { const l = e.el.querySelector(".lock"); if (l) l.remove(); } }); }
    else { SFX.err(); log(`⛔ Senha errada: <code>${esc(ev.tried || "")}</code>`, "e"); if (term) { term.el.classList.add("denied"); setTimeout(() => term.el.classList.remove("denied"), 600); floatText("NEGADO!", ...center(term.x, term.y), "#ff4d6d"); } }
    await wait(T() * 1.4);
  } else if (ev.t === "bridge") {
    SFX.door();
    ev.cells.forEach((c, k) => addPlank(c.x, c.y, k));
    log(`🔨 Ponte criada com ${ev.cells.length} tábua(s)!`, "w");
    await wait(T() * 1.5);
  } else if (ev.t === "plate") {
    const en = entById(ev.id);
    en.el.classList.add("pressed"); SFX.beep();
    floatText("CLICK!", ...center(en.x, en.y), "#ffd23f");
    await wait(T() * 0.6);
  } else if (ev.t === "friendmove") {
    const en = entById(ev.id);
    bubble(en.el, "Valeu! 💚");
    await en.el.animate([{ transform: "none" }, { transform: "translateY(-30px) scale(1.1)", offset: .3 }, { transform: "translateY(-140px) scale(.4)", opacity: 0 }], { duration: T() * 1.6, fill: "forwards" }).finished;
  } else if (ev.t === "friendhit") {
    log("😱 Você atingiu um <b>robô amigo</b>! Use <code>radar.scan()</code> e confira <code>info.amigo</code> antes de atirar.", "e");
    shake(10);
  } else if (ev.t === "bitten") {
    const bug = entById(ev.by);
    log(`💀 Mordido por <b>${BUG_NAMES[ev.type]}</b>!`, "e");
    bug.el.querySelector(".body").animate([{ transform: "none" }, { transform: "scale(1.4) translateX(-10px)" }, { transform: "none" }], { duration: 300 });
    await explodeRobot();
  } else if (ev.t === "fall") {
    SFX.die(); log("🕳 Caiu no buraco!", "e");
    await body.animate([{ transform: "none" }, { transform: "scale(.2) rotate(540deg)", opacity: 0 }], { duration: 700, fill: "forwards", easing: "ease-in" }).finished;
  } else if (ev.t === "win") {
    SFX.win();
    await body.animate([{ transform: "none" }, { transform: "scale(1.3,.7)", offset: .2 }, { transform: "translateY(-30px) rotate(360deg) scale(.4)", opacity: 0 }], { duration: 700, fill: "forwards", easing: "ease-in" }).finished;
  }
}

async function explodeRobot() {
  SFX.die(); shake(14);
  const [x, y] = center(L.robot.x, L.robot.y);
  const f = document.createElement("div"); f.className = "flash"; $("#fx").appendChild(f);
  f.animate([{ opacity: .7 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).finished.then(() => f.remove());
  burst(x, y, ["#ff4d6d", "#ffd23f", "#888", "#2de2e6"], 30);
  await L.robotEl.querySelector(".body").animate([{ transform: "none", filter: "none" }, { transform: "scale(1.3)", filter: "brightness(4) hue-rotate(140deg)", offset: .3 }, { transform: "scale(.6) rotate(-30deg) translateY(10px)", filter: "grayscale(1) brightness(.5)" }], { duration: 600, fill: "forwards" }).finished;
}
async function glitch() {
  const b = L.robotEl.querySelector(".body");
  await b.animate([{ transform: "none" }, { transform: "translateX(-6px) skewX(20deg)", filter: "hue-rotate(90deg)" }, { transform: "translateX(6px) skewX(-20deg)", filter: "invert(1)" }, { transform: "none" }], { duration: 400, iterations: 2 }).finished;
}
function bubble(el, text) {
  el.querySelectorAll(".bubble").forEach((b) => b.remove());
  const b = document.createElement("div"); b.className = "bubble"; b.textContent = String(text).slice(0, 44); el.appendChild(b);
  setTimeout(() => b.remove(), 1800);
}
function worldToFx(x, y) { const w = $("#world").getBoundingClientRect(), s = $("#stage").getBoundingClientRect(); return [x + w.left - s.left, y + w.top - s.top]; }
function burst(x, y, colors, n) {
  [x, y] = worldToFx(x, y);
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div"); p.className = "particle";
    const sz = 6 + Math.random() * 10; p.style.width = p.style.height = sz + "px";
    p.style.left = x + "px"; p.style.top = y + "px"; p.style.background = colors[i % colors.length];
    $("#fx").appendChild(p);
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90;
    p.animate([{ transform: "translate(-50%,-50%) scale(1)" }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 30}px) scale(0)` }], { duration: 500 + Math.random() * 400, easing: "cubic-bezier(.1,.8,.3,1)", fill: "forwards" }).finished.then(() => p.remove());
  }
}
function dust(x, y) {
  const tr = window.RW.trail();
  [x, y] = worldToFx(x, y + L.cell * 0.3);
  for (let i = 0; i < (tr ? 3 : 4); i++) {
    const p = document.createElement("div"); p.className = tr ? "trail" : "particle";
    if (tr) { p.textContent = tr; p.style.cssText = `left:${x}px;top:${y}px`; }
    else p.style.cssText = `left:${x}px;top:${y}px;width:10px;height:10px;background:rgba(255,255,255,.4);border:0`;
    $("#fx").appendChild(p);
    p.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: .9 }, { transform: `translate(${(i - 1.5) * 18}px,${tr ? -30 : -10}px) scale(${tr ? .4 : 2}) rotate(${(i - 1) * 30}deg)`, opacity: 0 }], { duration: tr ? 700 : 400, fill: "forwards" }).finished.then(() => p.remove());
  }
}
function floatText(t, x, y, color) {
  [x, y] = worldToFx(x, y);
  const d = document.createElement("div"); d.className = "floattxt"; d.textContent = t; d.style.color = color;
  d.style.left = x + "px"; d.style.top = y + "px"; $("#fx").appendChild(d);
  d.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: 0 }, { transform: "translate(-50%,-110%) scale(1.2) rotate(-6deg)", opacity: 1, offset: .25 }, { transform: "translate(-50%,-220%) scale(1)", opacity: 0 }], { duration: 1000, fill: "forwards", easing: "ease-out" }).finished.then(() => d.remove());
}
function shake(a) { $("#stage").animate([{ transform: "none" }, { transform: `translate(${a}px,${-a / 2}px) rotate(.5deg)` }, { transform: `translate(${-a}px,${a / 2}px)` }, { transform: `translate(${a / 2}px,0)` }, { transform: "none" }], { duration: 300 }); }
function confetti() {
  const s = $("#fx").getBoundingClientRect();
  for (let i = 0; i < 70; i++) {
    const p = document.createElement("div"); p.className = "particle";
    p.style.cssText = `left:${Math.random() * s.width}px;top:-20px;width:${8 + Math.random() * 8}px;height:${12 + Math.random() * 10}px;border-radius:3px;background:${["#ff3df2", "#ffd23f", "#2de2e6", "#4dff9a", "#6a2cff"][i % 5]}`;
    $("#fx").appendChild(p);
    p.animate([{ transform: "translateY(0) rotate(0)" }, { transform: `translate(${(Math.random() - .5) * 200}px,${s.height + 40}px) rotate(${Math.random() * 900}deg)` }], { duration: 1400 + Math.random() * 1400, delay: Math.random() * 400, easing: "cubic-bezier(.3,.1,.6,1)", fill: "forwards" }).finished.then(() => p.remove());
  }
}

// ---------- vitória + recompensas ----------
const ACH_BY_LEVEL = { "Primeiros Passos": "primeiro", "Corredor Infinito": "loop", "Radar": "decisao", "Fábrica de Degraus": "funcao", "Disfarce": "objeto", "Firewall": "hacker", "Botão Mágico": "dom", "Núcleo da IA": "zerou" };
function win() {
  stopRun(); confetti();
  const lines = countLines(L.code.js);
  const goals = [
    ["Chegar ao portal", true],
    [`Coletar todos os chips (${L.chips}/${L.chipsTotal})`, L.chips >= L.chipsTotal],
    [`Usar no máximo ${L.lv.par} linhas de JS (você: ${lines})`, lines <= L.lv.par],
  ];
  const stars = goals.filter((g) => g[1]).length;
  const prev = save.stars[L.i] || 0;
  const firstWin = !prev;
  save.stars[L.i] = Math.max(prev, stars);
  let coins = Math.max(0, stars - prev) * 15;
  if (firstWin) coins += L.chips * 2 + 10;
  persist();
  log(`✔ Missão cumprida! ${"★".repeat(stars)}`, "w");
  if (ACH_BY_LEVEL[L.lv.name]) window.RW.grant(ACH_BY_LEVEL[L.lv.name]);
  if (firstWin && save.attempts && save.attempts[L.i] === 1) window.RW.grant("primeira");
  window.RW.checkStars(LEVELS);
  if (L.i === ARENA_LEVEL && firstWin) setTimeout(() => window.RW.toast(`<span class="t-ic">⚔️</span><div><b>ARENA LIBERADA!</b><small>Batalhe com sua IA no mapa.</small></div>`, "gold"), 1500);
  setTimeout(() => {
    $("#m-title").textContent = ["", "Passou!", "Muito bom!", "PERFEITO!"][stars];
    $("#m-goals").innerHTML = goals.map(([t, ok]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
    $("#m-reward").innerHTML = coins ? `<span class="rw">+${coins} 🪙</span>` : `<small>Recompensa já coletada. Busque as 3 ⭐!</small>`;
    const nx = LEVELS[L.i + 1];
    $("#m-loot").innerHTML = nx ? (nx.unlock.length ? `🎁 Próxima fase libera: ${esc(nx.unlock.join(" · "))}` : `▶ Próxima: ${esc(nx.name)}`) : "🏆 Você zerou o HackBot! Volte e pegue todas as ⭐";
    const st = $("#m-stars").children;
    [...st].forEach((s, i) => { s.className = ""; if (i < stars) setTimeout(() => { s.className = "on"; beep(600 + i * 200, 0.15, "square", 0.06); }, 300 + i * 280); });
    $("#m-next").style.display = nx ? "" : "none";
    $("#modal").classList.remove("hidden");
    if (coins) setTimeout(() => window.RW.addCoins(coins, $("#m-reward")), 1100);
  }, 600);
}
function moduleChest(after) {
  const mod = L.lv.mod;
  const idx = LEVELS.map((l, i) => (l.mod === mod ? i : -1)).filter((i) => i >= 0);
  if (idx.every((i) => save.stars[i]) && !(save.chests || {})[mod]) {
    const m = MODULES.find((x) => x.id === mod);
    return window.RW.openChest(mod, `Módulo "${m.name}" completo!`).then(after);
  }
  after();
}
$("#m-retry").onclick = () => { $("#modal").classList.add("hidden"); buildWorld(); };
$("#m-next").onclick = () => { $("#modal").classList.add("hidden"); const nx = L.i + 1; moduleChest(() => startLevel(nx)); };

window.SIM_PARSE = (lv) => (window.SIM ? window.SIM.parseLevel(lv) : null);
window.HB = { SFX, sprite, show, beep, esc, highlight, save, persist, api, getAccount: () => account };
})();
