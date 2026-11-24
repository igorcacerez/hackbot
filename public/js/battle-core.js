// Núcleo da batalha da Arena. Compartilhado: navegador (Web Worker) e servidor (sandbox QuickJS).
var ARENA = (function () {
const MAP = [
  "XXXXXXXXXXX",
  "X.........X",
  "X..X...X..X",
  "X.........X",
  "X..X...X..X",
  "X.........X",
  "XXXXXXXXXXX",
];
const STARTS = [{ x: 1, y: 1, dir: 0 }, { x: 9, y: 5, dir: 2 }];
const MAX_HP = 5, MAX_TURNS = 80;

const STARTER = `// Esta função roda A CADA TURNO.
// Ela deve RETORNAR uma ação:
// "mover" "direita" "esquerda" "atirar" "escudo" "esperar"
// (o escudo bloqueia tiros por 2 turnos e recarrega em 6)

function turno(eu, radar) {
  if (radar.inimigoNaMira()) {
    return "atirar";
  }
  return "direita";
}
`;

// ---------- rivais (o código deles é revelado quando você vence) ----------
const RIVALS = [
  {
    name: "Torradeira", hue: 40, desc: "Gira e atira. Só isso. Mais burra que uma torradeira.",
    code: `function turno(eu, radar) {
  if (eu.turno % 3 === 0) return "atirar"; // atira a cada 3 turnos, mirando ou não
  if (radar.frente() === "vazio" && Math.random() < 0.5) return "mover";
  return "direita";
}`,
  },
  {
    name: "Patrulheiro", hue: 200, desc: "Anda até bater na parede. Atira se te vê.",
    code: `function turno(eu, radar) {
  if (radar.inimigoNaMira()) return "atirar";
  if (radar.frente() !== "vazio") {
    return Math.random() < 0.5 ? "direita" : "esquerda";
  }
  return "mover";
}`,
  },
  {
    name: "Caçador", hue: 120, desc: "Vira na sua direção e persegue. Rápido.",
    code: `function turno(eu, radar) {
  if (radar.inimigoNaMira()) return "atirar";
  // depois de desviar de uma parede, anda um passo
  if (eu.memoria.desvio) {
    eu.memoria.desvio = false;
    if (radar.frente() === "vazio") return "mover";
  }
  const lado = radar.direcaoDoInimigo();
  if (lado === "direita") return "direita";
  if (lado !== "frente") return "esquerda";
  if (radar.frente() !== "vazio") {
    eu.memoria.desvio = true;
    return Math.random() < 0.5 ? "direita" : "esquerda";
  }
  return "mover";
}`,
  },
  {
    name: "Tanque", hue: 300, desc: "Usa escudo quando você mira nele. Paciência é a arma.",
    code: `function turno(eu, radar) {
  if (radar.estouNaMira() && eu.escudoPronto) return "escudo";
  if (radar.inimigoNaMira()) return "atirar";
  if (eu.memoria.desvio) {
    eu.memoria.desvio = false;
    if (radar.frente() === "vazio") return "mover";
  }
  const lado = radar.direcaoDoInimigo();
  if (lado === "direita") return "direita";
  if (lado !== "frente") return "esquerda";
  if (radar.frente() !== "vazio") {
    eu.memoria.desvio = true;
    return Math.random() < 0.5 ? "direita" : "esquerda";
  }
  return "mover";
}`,
  },
  {
    name: "NÚCLEO", hue: 0, desc: "O chefão final. Escudo, flanco e nunca entra na sua mira.",
    code: `function turno(eu, radar) {
  const m = eu.memoria;
  if (radar.estouNaMira() && eu.escudoPronto) return "escudo";
  if (radar.inimigoNaMira()) return "atirar";
  // contornando: anda alguns passos de lado
  if (m.flanco > 0) {
    m.flanco--;
    if (radar.frente() === "vazio" && !radar.perigoNaFrente()) return "mover";
  }
  const lado = radar.direcaoDoInimigo();
  if (lado === "direita") return "direita";
  if (lado !== "frente") return "esquerda";
  // caminho bloqueado ou perigoso? flanqueia!
  if (radar.frente() !== "vazio" || radar.perigoNaFrente()) {
    m.flanco = 2;
    return Math.random() < 0.5 ? "direita" : "esquerda";
  }
  return "mover";
}`,
  },
];


function battleCore(input) {
    var map = input.map || MAP, starts = input.starts || STARTS, codes = input.codes, maxHp = input.maxHp || MAX_HP, maxTurns = input.maxTurns || MAX_TURNS, seed = input.seed || 1;
    let s = seed >>> 0;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
    const wall = (x, y) => !map[y] || map[y][x] !== ".";
    const bots = starts.map((st, i) => ({ i, x: st.x, y: st.y, dir: st.dir, hp: maxHp, cd: 0, mem: {}, err: null, fn: null }));
    bots.forEach((b, i) => {
      try {
        b.fn = new Function(codes[i] + "\n;return typeof turno === 'function' ? turno : null;")();
        if (!b.fn) b.err = "Não achei a função turno(eu, radar)";
      } catch (err) { b.err = err.name + ": " + err.message; }
    });
    function inLine(a, b) { // b está na linha de tiro de a?
      let x = a.x, y = a.y;
      for (;;) { x += DX[a.dir]; y += DY[a.dir]; if (wall(x, y)) return false; if (x === b.x && y === b.y) return true; }
    }
    function relDir(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const abs = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 2) : (dy >= 0 ? 1 : 3);
      return ["frente", "direita", "tras", "esquerda"][(abs - a.dir + 4) % 4];
    }
    const frames = [];
    const snap = (acts, shots) => frames.push({
      bots: bots.map((b) => ({ x: b.x, y: b.y, dir: b.dir, hp: b.hp, shield: !!b.shield, act: acts ? acts[b.i] : null, say: b.say || null })),
      shots: shots || [],
    });
    snap();
    const ACTS = ["mover", "direita", "esquerda", "atirar", "escudo", "esperar"];
    let turn = 0;
    for (; turn < maxTurns && bots.every((b) => b.hp > 0); turn++) {
      const acts = bots.map((b) => {
        b.say = null;
        if (!b.fn) return "esperar";
        const o = bots[1 - b.i];
        const eu = { x: b.x, y: b.y, vida: b.hp, escudoPronto: b.cd === 0, turno: turn, memoria: b.mem,
          dizer: (t) => { b.say = String(t).slice(0, 30); } };
        const radar = {
          inimigoNaMira: () => inLine(b, o),
          estouNaMira: () => inLine(o, b),
          direcaoDoInimigo: () => relDir(b, o),
          frente: () => { const x = b.x + DX[b.dir], y = b.y + DY[b.dir]; return wall(x, y) ? "parede" : (x === o.x && y === o.y) ? "inimigo" : "vazio"; },
          perigoNaFrente: () => { const x = b.x + DX[b.dir], y = b.y + DY[b.dir]; return !wall(x, y) && inLine(o, { x, y }); },
          distancia: () => Math.abs(o.x - b.x) + Math.abs(o.y - b.y),
          vidaInimigo: () => o.hp,
          inimigoComEscudo: () => (o.shieldT || 0) > 0,
        };
        let steps = 0;
        try {
          const t0 = Date.now();
          const r = b.fn(eu, radar);
          if (Date.now() - t0 > 200) throw new Error("turno() demorou demais");
          if (!ACTS.includes(r)) { b.say = "??? " + String(r).slice(0, 12); return "esperar"; }
          return r;
        } catch (err) { b.err = err.name + ": " + err.message; b.say = "ERRO!"; return "esperar"; }
      });
      // 1) escudos
      bots.forEach((b, i) => { if (b.cd > 0) b.cd--; if (acts[i] === "escudo" && b.cd === 0) { b.shieldT = 2; b.cd = 6; } b.shield = b.shieldT > 0; });
      // 2) giros
      bots.forEach((b, i) => { if (acts[i] === "direita") b.dir = (b.dir + 1) % 4; if (acts[i] === "esquerda") b.dir = (b.dir + 3) % 4; });
      // 3) movimento
      const targets = bots.map((b, i) => acts[i] === "mover" ? { x: b.x + DX[b.dir], y: b.y + DY[b.dir] } : { x: b.x, y: b.y });
      const clash = targets[0].x === targets[1].x && targets[0].y === targets[1].y;
      bots.forEach((b, i) => {
        if (acts[i] !== "mover" || clash) return;
        const t = targets[i], o = bots[1 - i];
        if (wall(t.x, t.y) || (t.x === o.x && t.y === o.y && acts[1 - i] !== "mover")) return;
        b.x = t.x; b.y = t.y;
      });
      // 4) tiros (iniciativa: quem mira há mais tempo atira primeiro)
      bots.forEach((b) => { b.aim = inLine(b, bots[1 - b.i]) ? (b.aim || 0) + 1 : 0; });
      const shots = [];
      const order = [0, 1].filter((i) => acts[i] === "atirar").sort((p, q) => (bots[q].aimPrev || 0) - (bots[p].aimPrev || 0));
      const first = order.length === 2 && (bots[order[0]].aimPrev || 0) > (bots[order[1]].aimPrev || 0) ? order[0] : -1;
      order.forEach((i) => {
        const b = bots[i], o = bots[1 - i];
        if (b.hp <= 0) return; // derrubado antes de atirar
        let x = b.x, y = b.y, hit = false;
        for (;;) { x += DX[b.dir]; y += DY[b.dir]; if (wall(x, y)) break; if (x === o.x && y === o.y) { hit = true; break; } }
        const sh = { from: i, x, y, hit, blocked: hit && o.shield, first: i === first };
        shots.push(sh);
        if (sh.blocked) b.aim = 0; // escudo quebra sua mira (perde a iniciativa)
        if (first === i && hit && !sh.blocked) o.hp--;
      });
      shots.forEach((sh) => { if (sh.hit && !sh.blocked && !sh.first) bots[1 - sh.from].hp--; });
      bots.forEach((b) => { b.aimPrev = b.aim; });
      bots.forEach((b) => { if (b.shieldT > 0) b.shieldT--; });
      snap(acts, shots);
    }
    const hp = bots.map((b) => b.hp);
    const winner = hp[0] === hp[1] ? -1 : hp[0] > hp[1] ? 0 : 1;
    return { frames, winner, turns: turn, errs: bots.map((b) => b.err) };
}
return { MAP, STARTS, MAX_HP, MAX_TURNS, STARTER, RIVALS, battleCore };
})();
if (typeof module !== "undefined") module.exports = ARENA;
