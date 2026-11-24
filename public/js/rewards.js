// Moedas, loja, conquistas, baús e o visual do robô
(() => {
const $ = (s) => document.querySelector(s);
let save, persist, SFX;

const ITEMS = [
  // chapéus
  { id: "hat_cap", slot: "chapeu", name: "Boné Hacker", price: 80, img: "assets/hat_cap.png", emoji: "🧢" },
  { id: "hat_headphones", slot: "chapeu", name: "Fone Gamer", price: 120, img: "assets/hat_headphones.png", emoji: "🎧" },
  { id: "hat_horns", slot: "chapeu", name: "Chifrinhos", price: 150, img: "assets/hat_horns.png", emoji: "😈" },
  { id: "hat_wizard", slot: "chapeu", name: "Mago do Código", price: 220, img: "assets/hat_wizard.png", emoji: "🧙" },
  { id: "hat_crown", slot: "chapeu", name: "Coroa Dev Sênior", price: 450, img: "assets/hat_crown.png", emoji: "👑" },
  // óculos
  { id: "glasses_cool", slot: "oculos", name: "Óculos Deal With It", price: 100, img: "assets/glasses_cool.png", emoji: "🕶️" },
  // cores (hue-rotate)
  { id: "cor_lava", slot: "cor", name: "Pintura Lava", price: 60, hue: 150, swatch: "#ff5a3d" },
  { id: "cor_toxica", slot: "cor", name: "Pintura Tóxica", price: 60, hue: 260, swatch: "#7dff3d" },
  { id: "cor_oceano", slot: "cor", name: "Pintura Oceano", price: 60, hue: 40, swatch: "#3d8bff" },
  { id: "cor_chiclete", slot: "cor", name: "Pintura Chiclete", price: 60, hue: 300, swatch: "#ff7ad9" },
  { id: "cor_ouro", slot: "cor", name: "Pintura de Ouro", price: 300, filter: "sepia(1) saturate(3) hue-rotate(5deg) brightness(1.1)", swatch: "#ffcf3d" },
  // laser
  { id: "laser_rosa", slot: "laser", name: "Laser Rosa", price: 50, color: "#ff3df2", swatch: "#ff3df2" },
  { id: "laser_ouro", slot: "laser", name: "Laser Dourado", price: 80, color: "#ffd23f", swatch: "#ffd23f" },
  { id: "laser_verde", slot: "laser", name: "Laser Matrix", price: 80, color: "#4dff9a", swatch: "#4dff9a" },
  { id: "laser_arcoiris", slot: "laser", name: "Laser Arco-íris", price: 250, color: "rainbow", swatch: "linear-gradient(90deg,red,orange,yellow,lime,cyan,violet)" },
  // rastro
  { id: "rastro_brilho", slot: "rastro", name: "Rastro de Brilho", price: 120, emoji: "✨" },
  { id: "rastro_coracao", slot: "rastro", name: "Rastro de Coração", price: 120, emoji: "💖" },
  { id: "rastro_fogo", slot: "rastro", name: "Rastro de Fogo", price: 180, emoji: "🔥" },
  { id: "rastro_codigo", slot: "rastro", name: "Rastro de Código", price: 180, emoji: "{ }" },
];
const SLOTS = { chapeu: "Chapéus", oculos: "Óculos", cor: "Pinturas", laser: "Lasers", rastro: "Rastros" };

const ACH = [
  { id: "primeiro", icon: "👣", name: "Primeiro Passo", desc: "Vença a primeira fase", coins: 20 },
  { id: "loop", icon: "🔁", name: "Preguiçoso Profissional", desc: "Vença usando um for", coins: 30 },
  { id: "decisao", icon: "🚦", name: "Robô Pensante", desc: "Vença a fase Radar (if)", coins: 30 },
  { id: "funcao", icon: "🏭", name: "Criador de Comandos", desc: "Crie sua primeira função", coins: 40 },
  { id: "objeto", icon: "🪪", name: "Leitor de Objetos", desc: "Vença a fase Disfarce", coins: 40 },
  { id: "hacker", icon: "🎨", name: "Hacker de CSS", desc: "Derrube um firewall com CSS", coins: 40 },
  { id: "dom", icon: "🌉", name: "Mestre do DOM", desc: "Vença o Botão Mágico (eventos)", coins: 60 },
  { id: "zerou", icon: "🏁", name: "Zerou o Curso", desc: "Vença o Núcleo da IA", coins: 150 },
  { id: "estrelas10", icon: "⭐", name: "Colecionador", desc: "Junte 10 estrelas", coins: 30 },
  { id: "perfeito5", icon: "💎", name: "Código Limpo", desc: "5 fases com 3 estrelas", coins: 50 },
  { id: "perfeitoTudo", icon: "🌟", name: "Perfeccionista", desc: "TODAS as fases com 3 estrelas", coins: 300 },
  { id: "primeira", icon: "🎯", name: "De Primeira!", desc: "Vença uma fase na 1ª tentativa", coins: 25 },
  { id: "errar", icon: "🧪", name: "Errar é Aprender", desc: "Erre 10 vezes (cientistas erram muito!)", coins: 25 },
  { id: "exterminador", icon: "💥", name: "Exterminador de Bugs", desc: "Debugue 25 bugs", coins: 50 },
  { id: "aulas5", icon: "🎓", name: "Aluno Dedicado", desc: "Assista 5 aulas até o fim", coins: 30 },
  { id: "estilo", icon: "🛍️", name: "Estiloso", desc: "Compre seu primeiro item", coins: 20 },
  { id: "arena1", icon: "⚔️", name: "Gladiador", desc: "Vença um rival na Arena", coins: 30 },
  { id: "nucleo", icon: "👹", name: "Matador de Chefão", desc: "Vença o NÚCLEO na Arena", coins: 120 },
  { id: "ranking", icon: "🌐", name: "Competidor Online", desc: "Envie sua IA para o ranking", coins: 40 },
];

function init(s, p, sfx) {
  save = s; persist = p; SFX = sfx;
  save.coins = save.coins || 0; save.owned = save.owned || {}; save.equip = save.equip || {};
  save.ach = save.ach || {}; save.stats = save.stats || {}; save.chests = save.chests || {};
  refreshCoins();
}
function refreshCoins() { document.querySelectorAll(".coin-n").forEach((e) => { e.textContent = save.coins; }); }
function addCoins(n, from) {
  if (!n) return;
  save.coins += n; persist(); refreshCoins();
  document.querySelectorAll(".pill.coins").forEach((p) => p.animate([{ transform: "scale(1.35) rotate(-6deg)" }, { transform: "none" }], { duration: 400 }));
  if (from) flyCoins(from, n);
}
function flyCoins(from, n) {
  const target = [...document.querySelectorAll(".pill.coins")].find((p) => p.offsetParent);
  if (!target) return;
  const a = from.getBoundingClientRect ? from.getBoundingClientRect() : from;
  const b = target.getBoundingClientRect();
  for (let i = 0; i < Math.min(12, Math.max(3, n / 5)); i++) {
    const c = document.createElement("div"); c.className = "fly-coin"; c.textContent = "🪙";
    document.body.appendChild(c);
    const sx = a.left + a.width / 2 + (Math.random() - .5) * 60, sy = a.top + a.height / 2 + (Math.random() - .5) * 30;
    c.animate([{ transform: `translate(${sx}px,${sy}px) scale(.5)`, opacity: 0 }, { transform: `translate(${sx}px,${sy - 60}px) scale(1.3)`, opacity: 1, offset: .3 },
      { transform: `translate(${b.left + 20}px,${b.top + 6}px) scale(.6)`, opacity: 1 }], { duration: 900 + i * 60, easing: "cubic-bezier(.5,0,.3,1)" })
      .finished.then(() => { c.remove(); SFX && SFX.chip(); });
  }
}
function toast(html, cls = "") {
  const t = document.createElement("div"); t.className = "toast " + cls; t.innerHTML = html;
  $("#toasts").appendChild(t);
  t.animate([{ transform: "translateX(120%)" }, { transform: "translateX(-6%)", offset: .7 }, { transform: "none" }], { duration: 500, easing: "ease-out" });
  setTimeout(() => t.animate([{ opacity: 1 }, { opacity: 0, transform: "translateX(60%)" }], { duration: 400, fill: "forwards" }).finished.then(() => t.remove()), 3800);
}
function grant(id) {
  if (save.ach[id]) return false;
  const a = ACH.find((x) => x.id === id); if (!a) return false;
  save.ach[id] = Date.now(); persist();
  setTimeout(() => {
    SFX && SFX.win();
    toast(`<span class="t-ic">${a.icon}</span><div><small>Conquista desbloqueada!</small><b>${a.name}</b><em>+${a.coins} 🪙</em></div>`, "gold");
    addCoins(a.coins, $("#toasts").lastChild);
  }, 400);
  return true;
}
function stat(k, n = 1) { save.stats[k] = (save.stats[k] || 0) + n; persist(); return save.stats[k]; }
function checkStars(LEVELS) {
  const vals = LEVELS.map((_, i) => save.stars[i] || 0);
  const total = vals.reduce((a, b) => a + b, 0);
  if (total >= 10) grant("estrelas10");
  if (vals.filter((v) => v === 3).length >= 5) grant("perfeito5");
  if (vals.every((v) => v === 3)) grant("perfeitoTudo");
}

// ---------------- visual do robô ----------------
const item = (id) => ITEMS.find((i) => i.id === id);
function botFilter(equip) {
  const c = item(equip.cor);
  if (!c) return "";
  return c.filter || `hue-rotate(${c.hue}deg)`;
}
function decorate(face, equip = save.equip) {
  face.querySelectorAll(".deco").forEach((d) => d.remove());
  const img = face.querySelector(".sprite, .emoji");
  if (img) img.style.filter = botFilter(equip);
  ["chapeu", "oculos"].forEach((slot) => {
    const it = item(equip[slot]); if (!it) return;
    const d = document.createElement("div"); d.className = "deco deco-" + slot;
    const im = new Image(); im.src = it.img; im.alt = "";
    im.onerror = () => { d.textContent = it.emoji; d.classList.add("deco-emoji"); im.remove(); };
    d.appendChild(im); face.appendChild(d);
  });
}
function laserColor(equip = save.equip) { const it = item(equip.laser); return it ? it.color : null; }
function trail(equip = save.equip) { const it = item(equip.rastro); return it ? it.emoji : null; }

// ---------------- loja ----------------
function renderShop() {
  const list = $("#shop-list"); list.innerHTML = "";
  Object.entries(SLOTS).forEach(([slot, label]) => {
    const h = document.createElement("h3"); h.className = "grid-h"; h.textContent = label; list.appendChild(h);
    ITEMS.filter((i) => i.slot === slot).forEach((it, k) => {
      const owned = !!save.owned[it.id], on = save.equip[slot] === it.id;
      const c = document.createElement("div"); c.className = "shop-item card" + (owned ? " owned" : "") + (on ? " on" : "");
      c.style.animationDelay = k * 0.04 + "s";
      const icon = it.img ? `<img src="${it.img}" alt="" onerror="this.outerHTML='<span>${it.emoji}</span>'">` : it.swatch ? `<i class="sw" style="background:${it.swatch}"></i>` : `<span>${it.emoji}</span>`;
      c.innerHTML = `<div class="si-ic">${icon}</div><b>${it.name}</b>
        <button class="btn small">${on ? "✔ Usando" : owned ? "Usar" : "🪙 " + it.price}</button>`;
      c.querySelector("button").onclick = () => {
        if (on) { delete save.equip[slot]; persist(); SFX.click(); return renderShop(); }
        if (owned) { save.equip[slot] = it.id; persist(); SFX.click(); return renderShop(); }
        if (save.coins < it.price) { SFX.bump(); c.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 250 }); toast(`<span class="t-ic">🪙</span><div><b>Faltam ${it.price - save.coins} moedas</b><small>Pegue estrelas e chips nas fases!</small></div>`); return; }
        save.coins -= it.price; save.owned[it.id] = true; save.equip[slot] = it.id; persist(); refreshCoins();
        SFX.win(); grant("estilo");
        renderShop();
      };
      list.appendChild(c);
    });
  });
  renderPreview();
}
function renderPreview() {
  const b = $("#shop-bot");
  b.innerHTML = `<div class="face"><img class="sprite" src="assets/robot.png" alt=""></div>`;
  decorate(b.querySelector(".face"));
  const tr = trail(); const lc = laserColor();
  b.insertAdjacentHTML("beforeend", `<div class="pv-info">${tr ? "Rastro " + tr : ""} ${lc ? `<i class="sw" style="background:${lc === "rainbow" ? item(save.equip.laser).swatch : lc}"></i> laser` : ""}</div>`);
}

// ---------------- conquistas ----------------
function renderTrophies() {
  const list = $("#ach-list"); list.innerHTML = "";
  const got = ACH.filter((a) => save.ach[a.id]).length;
  $("#ach-count").textContent = `${got}/${ACH.length}`;
  ACH.forEach((a, k) => {
    const c = document.createElement("div"); c.className = "ach card" + (save.ach[a.id] ? " got" : "");
    c.style.animationDelay = k * 0.03 + "s";
    c.innerHTML = `<div class="ach-ic">${save.ach[a.id] ? a.icon : "🔒"}</div><b>${a.name}</b><small>${a.desc}</small><em>+${a.coins} 🪙</em>`;
    list.appendChild(c);
  });
}

// ---------------- baú ----------------
function openChest(modId, title) {
  if (save.chests[modId]) return Promise.resolve();
  return new Promise((resolve) => {
    const box = $("#chest"); box.classList.remove("hidden");
    $("#chest-title").textContent = title;
    $("#chest-prize").innerHTML = "";
    const img = $("#chest-img"); img.style.display = "";
    img.getAnimations().forEach((a) => a.cancel());
    img.animate([{ transform: "rotate(-4deg)" }, { transform: "rotate(4deg)" }], { duration: 250, iterations: Infinity, direction: "alternate" });
    const btn = $("#chest-btn"); btn.textContent = "ABRIR!";
    btn.onclick = async () => {
      btn.onclick = null;
      SFX.click();
      await img.animate([{ transform: "scale(1)" }, { transform: "scale(.85,1.15)" }, { transform: "scale(1.3,.8)" }, { transform: "scale(1.6)", opacity: 0, filter: "brightness(3)" }], { duration: 900, fill: "forwards" }).finished;
      img.style.display = "none";
      const pool = ITEMS.filter((i) => !save.owned[i.id] && i.price <= 250);
      const prize = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      save.chests[modId] = true;
      let html;
      if (prize) { save.owned[prize.id] = true; html = `<div class="prize-ic">${prize.img ? `<img src="${prize.img}" onerror="this.outerHTML='${prize.emoji}'">` : prize.swatch ? `<i class="sw big" style="background:${prize.swatch}"></i>` : prize.emoji}</div><b>${prize.name}</b><small>Equipe na Loja!</small>`; }
      else { html = `<div class="prize-ic">🪙</div><b>+150 moedas</b>`; }
      persist();
      const p = $("#chest-prize"); p.innerHTML = html;
      SFX.win();
      p.animate([{ transform: "scale(0) rotate(-180deg)" }, { transform: "scale(1.3) rotate(10deg)", offset: .7 }, { transform: "none" }], { duration: 700, easing: "ease-out" });
      if (!prize) addCoins(150, p); else addCoins(50, p);
      btn.textContent = "Uhuul! ▶";
      btn.onclick = () => { box.classList.add("hidden"); resolve(); };
    };
  });
}

window.RW = { init, ITEMS, ACH, addCoins, grant, stat, checkStars, decorate, laserColor, trail, renderShop, renderTrophies, openChest, toast, refreshCoins, botFilter };
})();
