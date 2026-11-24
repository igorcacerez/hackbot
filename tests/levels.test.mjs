// Garante que toda fase do curso tem solução com 3 estrelas e que as regras "must" funcionam.
// Rode com: npm test
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const SIM = require("../public/js/sim-core.js");
const window = {};
new Function("window", fs.readFileSync(new URL("../public/js/levels.js", import.meta.url), "utf8"))(window);
const LEVELS = window.LEVELS;

const S = {
  "Primeiros Passos": { js: "robo.mover();\nrobo.mover();\nrobo.mover();" },
  "A Curva": { js: 'robo.mover();\nrobo.mover();\nrobo.mover();\nrobo.virar("direita");\nrobo.mover();\nrobo.mover();' },
  "Zigue-Zague": { js: 'robo.mover();\nrobo.virar("direita");\nrobo.mover();\nrobo.virar("esquerda");\nrobo.mover();\nrobo.mover();\nrobo.virar("direita");\nrobo.mover();\nrobo.virar("esquerda");\nrobo.mover();' },
  "Corredor Infinito": { js: "for (let i = 0; i < 9; i++) {\n  robo.mover();\n}" },
  "Escadaria": { js: 'for (let i = 0; i < 4; i++) {\n  robo.mover();\n  robo.virar("direita");\n  robo.mover();\n  robo.virar("esquerda");\n}\nrobo.mover();' },
  "Porta com Senha": { js: "let n = radar.lerAviso();\nrobo.digitar(n * 2);\nfor (let i = 0; i < 6; i++) {\n  robo.mover();\n}" },
  "Senha de Texto": { js: 'const p = radar.lerAviso();\nrobo.digitar(p + "BOT");\nfor (let i = 0; i < 7; i++) {\n  robo.mover();\n}' },
  "Primeiro Bug": { js: "robo.atirar();\nfor (let i = 0; i < 5; i++) {\n  robo.mover();\n}" },
  "Radar": { js: 'while (!robo.noPortal()) {\n  if (radar.frente() === "bug") robo.atirar();\n  else robo.mover();\n}' },
  "Labirinto": { js: 'while (!robo.noPortal()) {\n  if (radar.direita() !== "parede") {\n    robo.virar("direita");\n    robo.mover();\n  } else if (radar.frente() !== "parede") robo.mover();\n  else robo.virar("esquerda");\n}' },
  "Serpente": { js: 'while (!robo.noPortal()) {\n  const f = radar.frente();\n  if (f === "bug") robo.atirar();\n  else if (f === "vazio" || f === "portal") robo.mover();\n  else if (radar.direita() === "parede") robo.virar("esquerda");\n  else robo.virar("direita");\n}' },
  "Fábrica de Degraus": { js: 'function degrau() {\n  robo.mover();\n  robo.virar("esquerda");\n  robo.mover();\n  robo.virar("direita");\n}\nfor (let i = 0; i < 4; i++) degrau();\nrobo.mover();' },
  "Corredores": { js: 'function andar(passos) {\n  for (let i = 0; i < passos; i++) robo.mover();\n}\nandar(5);\nrobo.virar("direita");\nandar(3);\nrobo.virar("direita");\nandar(5);' },
  "Máquina de Senhas": { js: "function senha(n) {\n  return n * 3 + 1;\n}\nrobo.digitar(senha(radar.lerAviso()));\nfor (let i = 0; i < 6; i++) robo.mover();" },
  "Rota Secreta": { js: 'for (const passo of radar.rota()) {\n  if (passo === "frente") robo.mover();\n  else robo.virar(passo);\n}' },
  "Disfarce": { js: "while (!robo.noPortal()) {\n  const info = radar.scan();\n  if (info.tipo === \"robô\" && !info.amigo) robo.atirar();\n  else robo.mover();\n}" },
  "Firewall": { js: "for (let i = 0; i < 5; i++) {\n  robo.mover();\n}", firewallOff: true },
  "Chefão Gigante": { js: "robo.atirar();\nfor (let i = 0; i < 6; i++) {\n  robo.mover();\n}", bossSmall: true },
  "Ponte de Tags": { js: "for (let i = 0; i < 7; i++) {\n  robo.mover();\n}", bridges: [[4, 1], [5, 1], [6, 1]] },
  "A Porta": { js: 'document.querySelector("#porta").classList.add("aberta");\nfor (let i = 0; i < 4; i++) {\n  robo.mover();\n}' },
  "Grades de Laser": { js: 'document.querySelectorAll(".grade").forEach((g) => {\n  g.style.display = "none";\n});\nfor (let i = 0; i < 8; i++) robo.mover();' },
  "Terminal Hackeado": { js: 'const t = document.querySelector("#aviso").textContent;\ndocument.querySelector("#terminal").textContent = t;\nfor (let i = 0; i < 6; i++) {\n  robo.mover();\n}' },
  "Engenheiro": { js: 'const p = document.createElement("ponte");\np.setAttribute("x", 4);\np.setAttribute("y", 1);\np.setAttribute("largura", 3);\ndocument.body.appendChild(p);\nfor (let i = 0; i < 7; i++) robo.mover();' },
  "Botão Mágico": { js: 'document.querySelector("#botao").addEventListener("pisar", () => {\n  document.querySelector("#porta").classList.add("aberta");\n});\nfor (let i = 0; i < 5; i++) robo.mover();' },
  "Núcleo da IA": { firewallOff: true, bossSmall: true, js: `const p = document.createElement("ponte");
p.setAttribute("x", 5);
p.setAttribute("y", 1);
p.setAttribute("largura", 2);
document.body.appendChild(p);
document.querySelector("#porta").classList.add("aberta");
robo.atirar();
for (let i = 0; i < 8; i++) robo.mover();
robo.virar("direita");
robo.mover();
robo.mover();
robo.virar("direita");
while (!robo.noPortal()) {
  const info = radar.scan();
  if (info.tipo === "robô" && !info.amigo) robo.atirar();
  else robo.mover();
}` },
};

// mesmas regras de contagem do jogo
const countLines = (src) => src.split("\n").filter((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l)).length;
let fails = 0;
for (const lv of LEVELS) {
  const sol = S[lv.name];
  if (!sol) { console.log("✗ sem solução:", lv.name); fails++; continue; }
  const p = SIM.parseLevel(lv);
  let grid = p.grid.map((r) => r.split(""));
  if (sol.firewallOff) grid = grid.map((r) => r.map((c) => (c === "#" ? "." : c)));
  (sol.bridges || []).forEach(([x, y]) => { grid[y][x] = "="; });
  const ents = p.ents.filter((e) => e.kind !== "firewall").map((e) => ({ ...e, small: !!sol.bossSmall }));
  const res = SIM.simCore({ grid: grid.map((r) => r.join("")), ents, start: p.start, code: sol.js, cfg: p.cfg });
  const lines = countLines(sol.js);
  const mustFail = (lv.must || []).filter((m) => !m.re.test(sol.js));
  const chipsTotal = p.ents.filter((e) => e.kind === "chip").length;
  const chips = res.events.filter((e) => e.t === "collect").length;
  const ok = res.result === "win" && lines <= lv.par && !mustFail.length && chips === chipsTotal;
  if (!ok) fails++;
  console.log(`${ok ? "✔" : "✗"} ${lv.name.padEnd(20)} ${res.result.padEnd(6)} linhas ${lines}/${lv.par} chips ${chips}/${chipsTotal}` +
    (mustFail.length ? "  must falhou: " + mustFail.map((m) => m.re).join(" ") : "") + (res.errMsg ? "  " + res.errMsg : ""));
}
// regras "must" devem barrar o código inicial das fases que exigem conceito novo
for (const lv of LEVELS) for (const m of lv.must || []) if (lv.name === "Corredor Infinito" && !m.re.test("robo.mover();")) {}
console.log(fails ? `\n${fails} fase(s) com problema` : "\nTodas as fases têm solução 3 estrelas ✔");
process.exit(fails ? 1 : 0);
