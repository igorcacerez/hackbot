// Roteiro de emoções para o Eleven v3: uma tag de abertura por cena + ajustes no meio da frase.
// Gera scripts/narracao-v3.json  →  { "aula-cena": "texto com [tags]" }
// Rode: node scripts/emocoes.mjs
import fs from "node:fs";
const window = {};
new Function("window", fs.readFileSync(new URL("../public/js/lessons.js", import.meta.url), "utf8"))(window);

// tag de abertura de cada cena, na ordem
const TAGS = {
  comandos: ["[excited]", "[playfully]", "[curious]", "[cheerfully]", "[proudly]"],
  argumentos: ["[playfully]", "[curious]", "[seriously]", "[excited]", "[warmly]"],
  for: ["[sighs]", "[excited]", "[curious]", "[amazed]", "[playfully]"],
  variaveis: ["[warmly]", "[curious]", "[excited]", "[playfully]", "[cheerfully]"],
  strings: ["[curious]", "[playfully]", "[excited]", "[gasps]", "[proudly]"],
  metodos: ["[excited]", "[playfully]", "[curious]", "[dramatically]"],
  if: ["[excited]", "[curious]", "[seriously]", "[confident]", "[proudly]"],
  while: ["[curious]", "[playfully]", "[warmly]", "[whispers]", "[cheerfully]"],
  logicos: ["[playfully]", "[excited]", "[curious]", "[proudly]"],
  funcoes: ["[excited]", "[curious]", "[whispers]", "[confident]", "[proudly]"],
  parametros: ["[curious]", "[warmly]", "[excited]", "[cheerfully]"],
  retorno: ["[playfully]", "[curious]", "[excited]", "[seriously]"],
  arrays: ["[curious]", "[whispers]", "[excited]", "[cheerfully]"],
  objetos: ["[warmly]", "[curious]", "[excited]", "[confident]"],
  css: ["[playfully]", "[curious]", "[excited]", "[mischievously]"],
  html: ["[cheerfully]", "[curious]", "[playfully]"],
  "dom-select": ["[dramatically]", "[curious]", "[mischievously]", "[excited]", "[proudly]"],
  "dom-all": ["[curious]", "[excited]", "[warmly]"],
  "dom-text": ["[playfully]", "[curious]", "[cheerfully]"],
  "dom-create": ["[excited]", "[curious]", "[proudly]"],
  "dom-events": ["[curious]", "[excited]", "[whispers]", "[amazed]"],
};
// ajustes no meio das frases (risadas, ênfases, sussurros)
const AJUSTES = [
  ["Que preguiça!", "Que preguiça! [laughs]"],
  ["...de propósito!", "[mischievously] ...de propósito!"],
  ["E programadores são preguiçosos... de propósito!", "E programadores são preguiçosos... [laughs] de propósito!"],
  ["Ninguém coloca o bolo no forno antes de misturar a massa!", "[laughs] Ninguém coloca o bolo no forno antes de misturar a massa!"],
  ["Repare nas aspas!", "[seriously] Repare nas aspas!"],
  ["dá vinte e dois, e não quatro!", "dá vinte e dois... [gasps] e não quatro!"],
  ["Cuidado! Número", "[whispers] Cuidado! [normal] Número"],
  ["Cuidado com o InfiniteLoop!", "Cuidado com o InfiniteLoop! [nervously]"],
  ["Faltou um, não sai!", "Faltou um... [sighs] não sai!"],
  ["Criar a função não executa nada!", "Criar a função não executa nada! [normal]"],
  ["A contagem começa no ZERO!", "A contagem começa no... [dramatically] ZERO!"],
  ["Agora é com você!", "[excited] Agora é com você!"],
  ["Bora testar?", "[playfully] Bora testar?"],
  ["Hackeie com estilo!", "[laughs] Hackeie com estilo!"],
  ["ela é chamada!", "ela é chamada! [excited]"],
];
const pron = (t) => t.replace(/\brobo\b/g, "robô").replace(/JavaScript/g, "JavaScript");

const out = {};
let chars = 0;
for (const [id, L] of Object.entries(window.LESSONS)) {
  L.scenes.forEach((sc, i) => {
    let t = pron(sc.say);
    for (const [a, b] of AJUSTES) if (t.includes(a)) { t = t.replace(a, b); break; }
    t = `${(TAGS[id] || [])[i] || "[warmly]"} ${t}`;
    out[`${id}-${i}`] = t; chars += t.length;
  });
}
fs.writeFileSync(new URL("./narracao-v3.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(Object.keys(out).length, "cenas,", chars, "caracteres");
