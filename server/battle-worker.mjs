// Worker thread: roda batalhas no sandbox QuickJS sem travar o servidor principal.
import { parentPort, workerData } from "node:worker_threads";
import { getQuickJS, shouldInterruptAfterDeadline } from "quickjs-emscripten";

const QuickJS = await getQuickJS();
const CORE_SRC = workerData.coreSrc;
const MAX_OUT = 2_000_000; // bytes de resultado aceitos

// Prelúdio confiável: guarda as funções do motor e congela o ambiente
// ANTES do código dos alunos rodar. Assim um bot não consegue trocar
// JSON.stringify, Array.prototype etc. para falsificar o resultado.
function fonteBatalha(input) {
  return `${CORE_SRC}
;var __seed = ${Number(input.seed) >>> 0};
Math.random = function () { __seed = (__seed * 1664525 + 1013904223) >>> 0; return __seed / 4294967296; };
const __run = ARENA.battleCore, __json = JSON.stringify;
[Object, Array, Function, String, Number, Boolean, Math, JSON, Date, RegExp, Error, Symbol, Promise,
 Object.prototype, Array.prototype, Function.prototype, String.prototype, Number.prototype,
 Boolean.prototype, RegExp.prototype, Error.prototype, Date.prototype, Promise.prototype, Symbol.prototype,
 ARENA].forEach(function (o) { Object.freeze(o); });
Object.freeze(globalThis);
__json(__run(${JSON.stringify({ codes: input.codes, seed: input.seed })}));`;
}
function compilaFonte(codigo) {
  return `new Function(${JSON.stringify(codigo + "\n;return typeof turno === 'function' ? turno : null;")})`;
}

// confere o formato do resultado antes de confiar nele
function validaResultado(r) {
  const num = (v) => typeof v === "number" && Number.isFinite(v);
  if (!r || ![-1, 0, 1].includes(r.winner) || !num(r.turns) || !Array.isArray(r.frames) || r.frames.length > 200) return false;
  for (const f of r.frames) {
    if (!f || !Array.isArray(f.bots) || f.bots.length !== 2 || !Array.isArray(f.shots) || f.shots.length > 2) return false;
    for (const b of f.bots) if (!num(b.x) || !num(b.y) || !num(b.dir) || !num(b.hp)) return false;
  }
  return true;
}

parentPort.on("message", ({ id, tipo, input, prazoMs }) => {
  let resposta;
  try {
    if (tipo === "compilar") {
      QuickJS.evalCode(compilaFonte(input.codigo), { shouldInterrupt: shouldInterruptAfterDeadline(Date.now() + 1000), memoryLimitBytes: 16 << 20 });
      resposta = { ok: true };
    } else {
      const out = QuickJS.evalCode(fonteBatalha(input), {
        shouldInterrupt: shouldInterruptAfterDeadline(Date.now() + (prazoMs || 1500)),
        memoryLimitBytes: 64 << 20,
      });
      if (typeof out !== "string" || out.length > MAX_OUT) throw new Error("resultado inválido");
      const r = JSON.parse(out);
      if (!validaResultado(r)) throw new Error("resultado inválido");
      // só os campos esperados, com textos curtos
      r.frames.forEach((f) => f.bots.forEach((b) => { b.say = b.say ? String(b.say).slice(0, 30) : null; b.act = b.act ? String(b.act).slice(0, 10) : null; }));
      r.errs = (r.errs || []).slice(0, 2).map((e) => (e ? String(e).slice(0, 200) : null));
      resposta = { ok: true, res: r };
    }
  } catch (e) {
    resposta = { ok: false, erro: String((e && e.message) || e).slice(0, 200) };
  }
  parentPort.postMessage({ id, ...resposta });
});
parentPort.postMessage({ pronto: true });
