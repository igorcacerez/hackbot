// Simulação pura de uma fase. Roda num Web Worker (navegador) ou no Node (testes).
// Entrada: { grid, ents, start, code, cfg }  Saída: { events, result, errMsg, errLine }
var SIM = (function () {
function simCore(input) {
  const { grid: grid0, ents, start, code } = input;
  const cfg = input.cfg || {};
  const grid = grid0.map((r) => r.split(""));
  const events = [];
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  let rx = start.x, ry = start.y, dir = 0, steps = 0;
  const STOP = {};
  let result = "ended", errMsg = null, errLine = null;

  const cell = (x, y) => (grid[y] && grid[y][x]) || "X";
  const entAt = (x, y, pred) => ents.find((en) => en.alive && en.x === x && en.y === y && (!pred || pred(en)));
  const tick = () => { if (++steps > 800) { result = "loop"; throw STOP; } };

  // ---------------- mini-DOM do mundo ----------------
  const elements = [];
  let inEvent = false;
  function makeClassList(el) {
    return {
      add: (...c) => { c.forEach((k) => el._cls.add(String(k))); sync(el); },
      remove: (...c) => { c.forEach((k) => el._cls.delete(String(k))); sync(el); },
      toggle: (k) => { k = String(k); el._cls.has(k) ? el._cls.delete(k) : el._cls.add(k); sync(el); return el._cls.has(k); },
      contains: (k) => el._cls.has(String(k)),
      toString: () => [...el._cls].join(" "),
      get length() { return el._cls.size; },
    };
  }
  function makeEl(tag, opts) {
    const el = { _tag: tag, _cls: new Set(opts.cls || []), _attrs: {}, _listeners: {}, _ent: opts.ent || null,
      _text: opts.text || "", _children: [], _removed: false, _locked: !!opts.locked, _needsEvent: !!opts.needsEvent };
    const styleTarget = {};
    el.style = new Proxy(styleTarget, { set(t, k, v) { t[k] = String(v); sync(el); return true; } });
    el.classList = makeClassList(el);
    Object.defineProperties(el, {
      id: { get: () => el._attrs.id || "", set: (v) => { el._attrs.id = String(v); }, enumerable: true },
      tagName: { get: () => tag.toUpperCase(), enumerable: true },
      className: { get: () => [...el._cls].join(" "), set: (v) => { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); sync(el); } },
      textContent: { get: () => el._text, set: (v) => { el._text = String(v); onText(el); }, enumerable: true },
      innerText: { get: () => el._text, set: (v) => { el._text = String(v); onText(el); } },
      innerHTML: { get: () => el._text, set: (v) => { el._text = String(v).replace(/<[^>]*>/g, ""); onText(el); } },
      children: { get: () => el._children.slice() },
    });
    el.getAttribute = (k) => (k in el._attrs ? el._attrs[k] : null);
    el.setAttribute = (k, v) => { el._attrs[String(k)] = String(v); };
    el.hasAttribute = (k) => k in el._attrs;
    el.addEventListener = (type, fn) => {
      if (typeof fn !== "function") throw new TypeError("addEventListener precisa de uma função como 2º argumento");
      (el._listeners[type] = el._listeners[type] || []).push(fn);
    };
    el.remove = () => { el._removed = true; sync(el); };
    el.appendChild = (child) => { if (!child || !child._tag) throw new TypeError("appendChild precisa de um elemento criado com document.createElement"); el._children.push(child); onAppend(child); return child; };
    el.append = (...cs) => cs.forEach((c) => el.appendChild(c));
    el.querySelector = (s) => doc.querySelector(s);
    el.querySelectorAll = (s) => doc.querySelectorAll(s);
    if (opts.id) el._attrs.id = opts.id;
    el._lastOpen = isOpen(el);
    return el;
  }
  function isOpen(el) {
    if (!el._ent) return true;
    if (el._locked) return false;
    if (el._removed) return true;
    const st = el.style || {};
    return el._cls.has("aberta") || el._cls.has("aberto") || el._cls.has("desligada") || el._cls.has("desligado") ||
      st.display === "none" || st.visibility === "hidden" || (st.opacity !== undefined && parseFloat(st.opacity) < 0.3);
  }
  function sync(el) {
    if (!el._ent) return;
    if (el._needsEvent && !inEvent && !el._lastOpen && isOpen(el)) {
      // porta magnética: só abre dentro de um evento do botão
      el._cls.delete("aberta"); el._cls.delete("aberto");
      if (el.style) { delete el.style.display; delete el.style.opacity; delete el.style.visibility; }
      el._removed = false;
      events.push({ t: "say", text: "🧲 Porta magnética! Só abre quando o #botao é pisado.", warn: true });
      return;
    }
    const open = isOpen(el);
    if (open !== el._lastOpen) {
      el._lastOpen = open;
      el._ent.open = open;
      events.push({ t: "dom", id: el._ent.id, open });
    }
  }
  function onText(el) {
    if (!el._ent) return;
    events.push({ t: "text", id: el._ent.id, text: el._text.slice(0, 24) });
    if (el._ent.type === "T" && cfg.senha !== undefined) tryPassword(el._text, true);
  }
  function onAppend(child) {
    if (child._tag !== "ponte") { events.push({ t: "say", text: `<${child._tag}> não faz nada aqui. Tente <ponte>.`, warn: true }); return; }
    const x = parseInt(child.getAttribute("x")), y = parseInt(child.getAttribute("y")), w = parseInt(child.getAttribute("largura") || "1");
    if (!Number.isFinite(x) || !Number.isFinite(y)) { events.push({ t: "say", text: "A ponte precisa de x e y!", warn: true }); return; }
    const cells = [];
    for (let k = 0; k < Math.max(1, w); k++) {
      if (cell(x + k, y) === "_") {
        if ((cfg.pieces || 99) <= 0) { events.push({ t: "say", text: "Acabaram as tábuas!", warn: true }); break; }
        cfg.pieces = (cfg.pieces || 99) - 1;
        grid[y][x + k] = "="; cells.push({ x: x + k, y });
      }
    }
    if (cells.length) events.push({ t: "bridge", cells });
  }
  function matches(el, sel) {
    sel = sel.trim();
    const m = sel.match(/^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)$/);
    if (!m) throw new SyntaxError(`Seletor "${sel}" não entendido. Use "#id", ".classe" ou "tag".`);
    if (m[1] && m[1].toLowerCase() !== el._tag) return false;
    for (const part of (m[2].match(/[.#][\w-]+/g) || [])) {
      if (part[0] === "#" && el.id !== part.slice(1)) return false;
      if (part[0] === "." && !el._cls.has(part.slice(1))) return false;
    }
    return true;
  }
  const all = () => elements.filter((e) => !e._removed);
  const doc = {
    querySelector: (s) => { if (typeof s !== "string") throw new TypeError("querySelector precisa de um texto, ex: \"#porta\""); return all().find((e) => s.split(",").some((p) => matches(e, p))) || null; },
    querySelectorAll: (s) => { if (typeof s !== "string") throw new TypeError("querySelectorAll precisa de um texto, ex: \".grade\""); return all().filter((e) => s.split(",").some((p) => matches(e, p))); },
    getElementById: (id) => all().find((e) => e.id === id) || null,
    getElementsByClassName: (c) => all().filter((e) => e._cls.has(c)),
    createElement: (tag) => makeEl(String(tag).toLowerCase(), {}),
  };
  const mundo = makeEl("mundo", { id: "mundo" });
  doc.body = mundo; doc.documentElement = mundo;
  elements.push(mundo);
  // entidades do DOM da fase
  ents.forEach((en) => {
    if (!en.dom) return;
    const el = makeEl(en.dom.tag, { id: en.dom.id, cls: en.dom.cls, text: en.dom.text, ent: en, locked: en.dom.locked, needsEvent: en.dom.needsEvent });
    en.el = el; en.open = isOpen(el); el._lastOpen = en.open;
    elements.push(el);
  });
  // o próprio Array devolvido por querySelectorAll já tem forEach

  function blocking(x, y) {
    const c = cell(x, y);
    if (c === "X" || c === "#") return "parede";
    const d = entAt(x, y, (en) => en.dom && en.solid && !(en.el && isOpen(en.el)));
    if (d) return d.type === "D" ? "porta" : d.type === "G" ? "grade" : "parede";
    return null;
  }
  function look(d) {
    const x = rx + DX[d], y = ry + DY[d];
    const b = blocking(x, y);
    const en = entAt(x, y, (e) => e.kind === "bug" || e.kind === "friend");
    if (en) return cfg.disfarce ? "robô" : en.kind === "bug" ? "bug" : "amigo";
    if (b) return b;
    if (cell(x, y) === "_") return "buraco";
    if (entAt(x, y, (e) => e.kind === "chip")) return "chip";
    if (cell(x, y) === "E") return "portal";
    return "vazio";
  }
  function tryPassword(v, fromDom) {
    if (String(v).trim() === String(cfg.senha)) {
      events.push({ t: "access", ok: true });
      ents.forEach((en) => { if (en.el && en.el._locked) { en.el._locked = false; en.el._cls.add("aberta"); sync(en.el); } });
      cfg.senha = undefined;
      return true;
    }
    if (!fromDom || String(v).length >= String(cfg.senha).length) events.push({ t: "access", ok: false, tried: String(v).slice(0, 16) });
    return false;
  }
  function fire(el, type) {
    const ls = el._listeners[type] || [];
    if (!ls.length) return;
    inEvent = true;
    try { ls.forEach((fn) => fn({ type, target: el, alvo: el })); } finally { inEvent = false; }
  }

  const robo = {
    mover() {
      tick();
      const nx = rx + DX[dir], ny = ry + DY[dir];
      const b = blocking(nx, ny);
      if (b) { events.push({ t: "bump", x: rx, y: ry, dir, what: b }); return false; }
      const bug = entAt(nx, ny, (e) => e.kind === "bug");
      if (bug) {
        events.push({ t: "move", x: nx, y: ny, dir, half: true });
        events.push({ t: "bitten", by: bug.id, type: bug.type });
        result = "dead"; throw STOP;
      }
      const fr = entAt(nx, ny, (e) => e.kind === "friend");
      if (fr) { fr.alive = false; events.push({ t: "friendmove", id: fr.id }); return false; }
      rx = nx; ry = ny;
      events.push({ t: "move", x: rx, y: ry, dir });
      if (cell(rx, ry) === "_") { events.push({ t: "fall" }); result = "dead"; throw STOP; }
      const chip = entAt(rx, ry, (e) => e.kind === "chip");
      if (chip) { chip.alive = false; events.push({ t: "collect", id: chip.id }); }
      const plate = entAt(rx, ry, (e) => e.type === "P");
      if (plate) { events.push({ t: "plate", id: plate.id }); fire(plate.el, "pisar"); }
      if (cell(rx, ry) === "E") { events.push({ t: "win" }); result = "win"; throw STOP; }
      return true;
    },
    virar(lado) {
      tick();
      lado = String(lado || "").toLowerCase();
      if (lado === "direita" || lado === "right") dir = (dir + 1) % 4;
      else if (lado === "esquerda" || lado === "left") dir = (dir + 3) % 4;
      else throw new Error('virar() só entende "direita" ou "esquerda". Você mandou: ' + JSON.stringify(lado));
      events.push({ t: "turn", dir });
    },
    atirar() {
      tick();
      let x = rx, y = ry, hit = null;
      for (;;) {
        x += DX[dir]; y += DY[dir];
        const en = entAt(x, y, (e) => e.kind === "bug" || e.kind === "friend");
        if (en) { hit = en; break; }
        if (blocking(x, y)) break;
      }
      if (hit && hit.kind === "friend") {
        hit.alive = false;
        events.push({ t: "shoot", x, y, dir, kill: hit.id });
        events.push({ t: "friendhit", id: hit.id });
        result = "dead"; throw STOP;
      }
      if (hit && hit.armored && !hit.small) events.push({ t: "shoot", x, y, dir, ricochet: hit.id });
      else if (hit) { hit.alive = false; events.push({ t: "shoot", x, y, dir, kill: hit.id }); }
      else events.push({ t: "shoot", x, y, dir, wall: true });
    },
    digitar(v) {
      tick();
      if (cfg.senha === undefined) { events.push({ t: "say", text: "Não há terminal pedindo senha.", warn: true }); return false; }
      return tryPassword(v, false);
    },
    dizer(...txt) { tick(); events.push({ t: "say", text: txt.map(fmt).join(" ") }); },
    noPortal() { return cell(rx, ry) === "E"; },
  };
  function fmt(v) {
    if (typeof v === "string") return v;
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  const radar = {
    frente: () => look(dir),
    direita: () => look((dir + 1) % 4),
    esquerda: () => look((dir + 3) % 4),
    lerAviso: () => (cfg.aviso !== undefined ? cfg.aviso : null),
    rota: () => (cfg.rota ? cfg.rota.slice() : []),
    scan: () => {
      let x = rx, y = ry, d = 0;
      for (;;) {
        x += DX[dir]; y += DY[dir]; d++;
        const en = entAt(x, y, (e) => e.kind === "bug" || e.kind === "friend");
        if (en) return { tipo: "robô", amigo: en.kind === "friend", nome: en.kind === "friend" ? "Robô amigo" : en.name, distancia: d };
        const b = blocking(x, y);
        if (b) return { tipo: b, amigo: false, nome: b, distancia: d };
        if (cell(x, y) === "E") return { tipo: "portal", amigo: false, nome: "portal", distancia: d };
      }
    },
  };
  const consoleShim = { log: (...a) => robo.dizer(...a) };

  try {
    const fn = new Function("robo", "radar", "console", "document", code);
    fn(robo, radar, consoleShim, doc);
    if (result === "ended") events.push({ t: "ended" });
  } catch (err) {
    if (err !== STOP) {
      result = "error";
      errMsg = (err && err.name ? err.name + ": " : "") + (err && err.message);
      const m = String(err && err.stack).match(/<anonymous>:(\d+)/);
      if (m) errLine = Math.max(1, +m[1] - 2);
    }
  }
  return { events, result, errMsg, errLine, steps };
}
// Converte uma fase (levels.js) em dados de simulação
const BUGNAMES = { N: "NullPointer", L: "InfiniteLoop", U: "Undefined", B: "Chefão" };
const DOMDEF = {
  D: { tag: "porta", cls: ["porta"], solid: true },
  G: { tag: "grade", cls: ["grade", "laser"], solid: true },
  T: { tag: "terminal", cls: ["terminal"], solid: true },
  H: { tag: "aviso", cls: ["aviso"], solid: true },
  P: { tag: "botao", cls: ["botao"], solid: false },
};
function parseLevel(lv) {
  const ents = []; let start = null; const grid = [];
  const count = {};
  lv.map.forEach((row, y) => {
    let g = "";
    [...row].forEach((ch, x) => {
      let t = ch;
      const id = "e" + ents.length;
      if (ch === "R") { start = { x, y }; t = "."; }
      else if ("NLUB".includes(ch)) { ents.push({ id, kind: "bug", type: ch, name: BUGNAMES[ch], x, y, alive: true, armored: ch === "B" }); t = "."; }
      else if (ch === "F") { ents.push({ id, kind: "friend", type: "F", x, y, alive: true }); t = "."; }
      else if (ch === "C") { ents.push({ id, kind: "chip", type: "C", x, y, alive: true }); t = "."; }
      else if (ch === "#") { ents.push({ id, kind: "firewall", type: "#", x, y, alive: true }); }
      else if (DOMDEF[ch]) {
        const n = count[ch] = (count[ch] || 0);
        count[ch]++;
        const spec = ((lv.dom && lv.dom[ch]) || [])[n] || {};
        const def = DOMDEF[ch];
        ents.push({ id, kind: "dom", type: ch, x, y, alive: true, solid: def.solid,
          dom: { tag: def.tag, cls: def.cls.slice(), id: spec.id || def.tag + (n + 1), text: spec.text || "", locked: !!spec.locked, needsEvent: !!spec.needsEvent } });
        t = ".";
      }
      g += t;
    });
    grid.push(g);
  });
  return { grid, ents, start, cfg: Object.assign({ pieces: lv.pieces }, lv.cfg || {}) };
}
return { simCore, parseLevel };
})();
if (typeof module !== "undefined") module.exports = SIM;
