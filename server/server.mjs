// HackBot — servidor (Node 22.5+ com node:sqlite embutido)
// Contas (usuário, senha, curso), progresso salvo e ranking da Arena.
// O código das IAs dos alunos roda num sandbox QuickJS (WebAssembly), nunca no Node direto.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { Worker } from "node:worker_threads";
import os from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 5177);
// Por padrão só aceita conexões desta máquina. Para a sala de aula: HOST=0.0.0.0 atrás de um proxy HTTPS (e COOKIE_SECURE=1).
const HOST = process.env.HOST || "127.0.0.1";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "1";
const CORE_SRC = fs.readFileSync(path.join(PUBLIC, "js", "battle-core.js"), "utf8");
const CORE = (() => { const m = { exports: {} }; new Function("module", CORE_SRC)(m); return m.exports; })();
const COURSES = ["js-do-zero-ao-dom"];

// ---------------- banco ----------------
fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
const db = new DatabaseSync(path.join(ROOT, "data", "hackbot.db"));
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT UNIQUE NOT NULL COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  curso TEXT NOT NULL,
  progresso TEXT NOT NULL DEFAULT '{}',
  criado_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  rival_idx INTEGER UNIQUE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  visual TEXT NOT NULL DEFAULT '{}',
  elo REAL NOT NULL DEFAULT 1000,
  vitorias INTEGER NOT NULL DEFAULT 0,
  derrotas INTEGER NOT NULL DEFAULT 0,
  empates INTEGER NOT NULL DEFAULT 0,
  atualizado_em INTEGER NOT NULL
);
`);
// os rivais da campanha também jogam no ranking
CORE.RIVALS.forEach((r, i) => {
  db.prepare(`INSERT INTO bots (rival_idx, nome, codigo, visual, elo, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(rival_idx) DO UPDATE SET codigo = excluded.codigo, nome = excluded.nome`)
    .run(i, "🤖 " + r.name, r.code, JSON.stringify({ hue: r.hue }), 800 + i * 150, Date.now());
});

// ---------------- senha / sessão ----------------
function hashSenha(senha) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha, salt, 64);
  return salt.toString("hex") + ":" + hash.toString("hex");
}
function confereSenha(senha, guardado) {
  const [salt, hash] = guardado.split(":");
  const teste = crypto.scryptSync(senha, Buffer.from(salt, "hex"), 64);
  return crypto.timingSafeEqual(teste, Buffer.from(hash, "hex"));
}
const SESSAO_MS = 30 * 24 * 3600 * 1000;
function criaSessao(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expira_em) VALUES (?, ?, ?)").run(token, userId, Date.now() + SESSAO_MS);
  return token;
}
function usuarioDaReq(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || "");
  if (!m) return null;
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expira_em > ?`).get(m[1], Date.now());
  return row ? { ...row, token: m[1] } : null;
}
const cookie = (token, maxAge) => `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${COOKIE_SECURE ? "; Secure" : ""}`;
// hash falso: login de usuário inexistente gasta o mesmo tempo que um real
const HASH_FALSO = hashSenha(crypto.randomBytes(12).toString("hex"));

// limite simples de tentativas por IP (login/cadastro) e por usuário (batalhas)
const tentativas = new Map();
function limite(chave, max, janelaMs) {
  const agora = Date.now();
  const lista = (tentativas.get(chave) || []).filter((t) => agora - t < janelaMs);
  lista.push(agora); tentativas.set(chave, lista);
  return lista.length > max;
}
setInterval(() => { const agora = Date.now(); for (const [k, l] of tentativas) if (!l.length || agora - l[l.length - 1] > 3600e3) tentativas.delete(k); }, 600e3).unref();

// ---------------- batalhas no sandbox (worker threads) ----------------
// Cada batalha roda num worker com QuickJS; o servidor nunca trava esperando.
const N_WORKERS = Math.max(1, Math.min(4, os.cpus().length - 1));
const MAX_FILA = 40;
const workers = [], fila = [], pendentes = new Map();
let seq = 0;
function criaWorker() {
  const w = new Worker(new URL("./battle-worker.mjs", import.meta.url), { workerData: { coreSrc: CORE_SRC }, resourceLimits: { maxOldGenerationSizeMb: 256 } });
  w.livre = false; w.job = null;
  w.on("message", (m) => {
    if (m.pronto) { w.livre = true; return proximo(); }
    const job = pendentes.get(m.id); pendentes.delete(m.id);
    clearTimeout(w.timer); w.livre = true; w.job = null;
    if (job) job.resolve(m);
    proximo();
  });
  w.on("error", (e) => console.error("worker:", e.message));
  w.on("exit", () => {
    const i = workers.indexOf(w); if (i >= 0) workers.splice(i, 1);
    if (w.job) { const job = pendentes.get(w.job); pendentes.delete(w.job); if (job) job.resolve({ ok: false, erro: "travou" }); }
    workers.push(criaWorker());
  });
  return w;
}
for (let i = 0; i < N_WORKERS; i++) workers.push(criaWorker());
function proximo() {
  while (fila.length) {
    const w = workers.find((x) => x.livre);
    if (!w) return;
    const job = fila.shift();
    w.livre = false; w.job = job.id;
    // rede de segurança: se o QuickJS não interromper, mata o worker
    w.timer = setTimeout(() => w.terminate(), (job.msg.prazoMs || 1500) + 3000);
    w.postMessage(job.msg);
  }
}
function noWorker(msg) {
  if (fila.length >= MAX_FILA) return Promise.resolve({ ok: false, ocupado: true, erro: "Servidor ocupado" });
  return new Promise((resolve) => {
    const id = ++seq;
    pendentes.set(id, { resolve });
    fila.push({ id, msg: { ...msg, id } });
    proximo();
  });
}
async function batalhaSegura(codigoA, codigoB, seed, prazoMs = 1500) {
  const r = await noWorker({ tipo: "batalha", input: { codes: [codigoA, codigoB], seed }, prazoMs });
  if (r.ok) return r.res;
  return { erro: r.ocupado ? "Arena lotada! Tente em alguns segundos." : "A batalha travou (loop infinito ou memória demais).", winner: -2, ocupado: !!r.ocupado };
}
async function compilaNoSandbox(codigo) {
  const r = await noWorker({ tipo: "compilar", input: { codigo } });
  return r.ok ? null : r.erro;
}
function elo(a, b, resultadoA) {
  const K = 32, esperadoA = 1 / (1 + 10 ** ((b - a) / 400));
  return K * (resultadoA - esperadoA);
}
function registraLuta(botA, botB, res) {
  const r = res.winner === 0 ? 1 : res.winner === 1 ? 0 : 0.5;
  const d = elo(botA.elo, botB.elo, r);
  const up = db.prepare(`UPDATE bots SET elo = elo + ?, vitorias = vitorias + ?, derrotas = derrotas + ?, empates = empates + ? WHERE id = ?`);
  up.run(d, r === 1 ? 1 : 0, r === 0 ? 1 : 0, r === 0.5 ? 1 : 0, botA.id);
  up.run(-d, r === 0 ? 1 : 0, r === 1 ? 1 : 0, r === 0.5 ? 1 : 0, botB.id);
  botA.elo += d; botB.elo -= d;
  return Math.round(d);
}

// ---------------- HTTP ----------------
function json(res, status, data, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(data));
}
function lerCorpo(req, max = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let tam = 0; const partes = [];
    req.on("data", (c) => { tam += c.length; if (tam > max) { reject(new Error("grande demais")); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { resolve(partes.length ? JSON.parse(Buffer.concat(partes).toString("utf8")) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".json": "application/json", ".webp": "image/webp", ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
function servirArquivo(req, res) {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  // URLs limpas: /aprender-javascript -> aprender-javascript.html ; /x.html -> 301 para /x
  if (p.endsWith(".html") && p !== "/index.html") { res.writeHead(301, { Location: p.slice(0, -5) }); return res.end(); }
  if (!path.extname(p)) p += ".html";
  const arq = path.normalize(path.join(PUBLIC, p));
  if (!arq.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(arq, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return res.end('<!doctype html><meta charset="utf-8"><title>Página não encontrada | HackBot</title><p style="font-family:sans-serif">Página não encontrada. <a href="/">Voltar ao HackBot</a></p>'); }
    const ext = path.extname(arq);
    // assets estáticos ficam em cache; HTML/JS/CSS sempre revalidam (deploy automático)
    const cache = /\.(png|jpg|webp|mp3|mp4|ico)$/.test(ext) ? "public, max-age=604800" : "no-cache";
    res.writeHead(200, { "Content-Type": TIPOS[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(arq).pipe(res);
  });
}
const publico = (u) => ({ usuario: u.usuario, curso: u.curso, progresso: JSON.parse(u.progresso || "{}") });

const rotas = {
  "GET /api/cursos": () => [200, { cursos: [{ id: "js-do-zero-ao-dom", nome: "JavaScript: do zero ao DOM" }] }],

  async "POST /api/cadastro"(req) {
    if (limite("cad:" + req.socket.remoteAddress, 10, 3600e3)) return [429, { erro: "Muitas tentativas. Tente mais tarde." }];
    const { usuario, senha, curso, progresso } = await lerCorpo(req);
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(usuario || "")) return [400, { erro: "Usuário: 3 a 20 letras, números, _ . -" }];
    if (typeof senha !== "string" || senha.length < 6 || senha.length > 100) return [400, { erro: "Senha: pelo menos 6 caracteres." }];
    if (!COURSES.includes(curso)) return [400, { erro: "Escolha um curso." }];
    if (db.prepare("SELECT 1 FROM users WHERE usuario = ?").get(usuario)) return [409, { erro: "Esse usuário já existe." }];
    const prog = JSON.stringify(progresso && typeof progresso === "object" ? progresso : {});
    const { lastInsertRowid } = db.prepare("INSERT INTO users (usuario, senha_hash, curso, progresso, criado_em) VALUES (?, ?, ?, ?, ?)")
      .run(usuario, hashSenha(senha), curso, prog.length < 200000 ? prog : "{}", Date.now());
    const u = db.prepare("SELECT * FROM users WHERE id = ?").get(lastInsertRowid);
    return [201, publico(u), { "Set-Cookie": cookie(criaSessao(u.id), SESSAO_MS / 1000) }];
  },

  async "POST /api/login"(req) {
    if (limite("login:" + req.socket.remoteAddress, 20, 15 * 60e3)) return [429, { erro: "Muitas tentativas. Espere 15 minutos." }];
    const { usuario, senha } = await lerCorpo(req);
    const u = db.prepare("SELECT * FROM users WHERE usuario = ?").get(String(usuario || ""));
    const ok = confereSenha(String(senha || "").slice(0, 100), u ? u.senha_hash : HASH_FALSO);
    if (!u || !ok) return [401, { erro: "Usuário ou senha incorretos." }];
    return [200, publico(u), { "Set-Cookie": cookie(criaSessao(u.id), SESSAO_MS / 1000) }];
  },

  "POST /api/logout"(req, u) {
    if (u) db.prepare("DELETE FROM sessions WHERE token = ?").run(u.token);
    return [200, { ok: true }, { "Set-Cookie": cookie("", 0) }];
  },

  "GET /api/eu"(req, u) { return u ? [200, publico(u)] : [401, { erro: "Não logado" }]; },

  async "PUT /api/progresso"(req, u) {
    if (!u) return [401, { erro: "Não logado" }];
    const { progresso } = await lerCorpo(req, 300 * 1024);
    if (!progresso || typeof progresso !== "object") return [400, { erro: "Progresso inválido" }];
    db.prepare("UPDATE users SET progresso = ? WHERE id = ?").run(JSON.stringify(progresso), u.id);
    return [200, { ok: true }];
  },

  "GET /api/ranking"() {
    const lista = db.prepare(`SELECT b.id, b.nome, b.elo, b.vitorias, b.derrotas, b.empates, b.visual, b.rival_idx, u.usuario
      FROM bots b LEFT JOIN users u ON u.id = b.user_id ORDER BY b.elo DESC LIMIT 100`).all();
    return [200, { ranking: lista.map((b, i) => ({ pos: i + 1, id: b.id, nome: b.nome, usuario: b.usuario || null, rival: b.rival_idx !== null,
      elo: Math.round(b.elo), v: b.vitorias, d: b.derrotas, e: b.empates, visual: JSON.parse(b.visual) })) }];
  },

  async "POST /api/arena/enviar"(req, u) {
    if (!u) return [401, { erro: "Crie uma conta para entrar no ranking." }];
    if (limite("env:" + u.id, 6, 60e3)) return [429, { erro: "Calma! Espere um minuto para reenviar." }];
    const { codigo, nome, visual } = await lerCorpo(req);
    if (typeof codigo !== "string" || codigo.length > 8000) return [400, { erro: "Código vazio ou grande demais (máx. 8000 caracteres)." }];
    const erro = await compilaNoSandbox(codigo);
    if (erro) return [400, { erro: "Seu código tem erro: " + erro }];
    // luta de teste curta: código que trava não entra no ranking
    const teste = await batalhaSegura(codigo, `function turno(){ return "esperar"; }`, 1, 700);
    if (teste.ocupado) return [503, { erro: teste.erro }];
    if (teste.winner === -2) return [400, { erro: "🌀 InfiniteLoop! Seu robô travou na luta de teste. Confira seus while/for." }];
    if (teste.errs && teste.errs[0]) return [400, { erro: "Seu robô deu erro na luta de teste: " + teste.errs[0] }];
    const nomeBot = String(nome || u.usuario).replace(/[<>]/g, "").slice(0, 20) || u.usuario;
    const vis = JSON.stringify(visual && typeof visual === "object" ? { hue: Number(visual.hue) || 0, chapeu: String(visual.chapeu || "").slice(0, 30) } : {});
    db.prepare(`INSERT INTO bots (user_id, nome, codigo, visual, atualizado_em) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET nome = excluded.nome, codigo = excluded.codigo, visual = excluded.visual, atualizado_em = excluded.atualizado_em`)
      .run(u.id, nomeBot, codigo, vis, Date.now());
    const meu = db.prepare("SELECT * FROM bots WHERE user_id = ?").get(u.id);
    // partidas de colocação: até 8 adversários perto do seu nível
    const rivais = db.prepare("SELECT * FROM bots WHERE id != ? ORDER BY ABS(elo - ?) LIMIT 8").all(meu.id, meu.elo);
    const lutas = [];
    for (const r of rivais) {
      const res = await batalhaSegura(meu.codigo, r.codigo, crypto.randomInt(1, 1e9));
      if (res.winner === -2) { lutas.push({ contra: r.nome, resultado: "erro", delta: 0 }); continue; }
      const delta = registraLuta(meu, r, res);
      lutas.push({ contra: r.nome, resultado: res.winner === 0 ? "vitória" : res.winner === 1 ? "derrota" : "empate", delta });
    }
    const pos = db.prepare("SELECT COUNT(*) AS n FROM bots WHERE elo > ?").get(meu.elo).n + 1;
    return [200, { elo: Math.round(meu.elo), posicao: pos, lutas }];
  },

  async "POST /api/arena/duelo"(req, u) {
    if (limite("duelo:" + (u ? u.id : req.socket.remoteAddress), 20, 60e3)) return [429, { erro: "Muitos duelos. Respire um pouco!" }];
    const { botId, codigo } = await lerCorpo(req);
    const alvo = db.prepare("SELECT * FROM bots WHERE id = ?").get(Number(botId));
    if (!alvo) return [404, { erro: "Robô não encontrado." }];
    if (typeof codigo !== "string" || codigo.length > 8000) return [400, { erro: "Código inválido." }];
    // duelo amistoso: não mexe no ranking, e o código do adversário nunca sai do servidor
    const res = await batalhaSegura(codigo, alvo.codigo, crypto.randomInt(1, 1e9));
    if (res.winner === -2) return [res.ocupado ? 503 : 400, { erro: res.erro }];
    res.errs = [res.errs[0], res.errs[1] ? "O adversário teve um erro" : null];
    return [200, { ...res, adversario: { nome: alvo.nome, visual: JSON.parse(alvo.visual) } }];
  },
};

const server = http.createServer(async (req, res) => {
  try {
    let url;
    try { url = new URL(req.url, "http://x"); decodeURIComponent(url.pathname); }
    catch (e) { res.writeHead(400); return res.end("URL inválida"); }
    const chave = `${req.method} ${url.pathname}`;
    const rota = rotas[chave];
    if (!rota) {
      if (url.pathname.startsWith("/api/")) return json(res, 404, { erro: "Rota não existe" });
      if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
      return servirArquivo(req, res);
    }
    if (req.method !== "GET") {
      // proteção contra CSRF: exige que a requisição venha do próprio site
      const origem = req.headers.origin;
      let host = null; try { host = origem && new URL(origem).host; } catch (e) {}
      if (!origem || host !== req.headers.host) return json(res, 403, { erro: "Origem não permitida" });
    }
    const [status, data, headers] = await rota(req, usuarioDaReq(req));
    json(res, status, data, headers);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 400, { erro: "Requisição inválida" }); else res.end();
  }
});
setInterval(() => db.prepare("DELETE FROM sessions WHERE expira_em < ?").run(Date.now()), 3600e3).unref();
server.listen(PORT, HOST, () => console.log(`HackBot rodando em http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`));
