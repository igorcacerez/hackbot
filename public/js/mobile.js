// Comportamentos só do celular: barra de símbolos, modo digitação, missão recolhível e navegação inferior.
(() => {
const $ = (s) => document.querySelector(s);
const mq = window.matchMedia("(max-width: 760px)");
const isMobile = () => mq.matches;

// ---------- barra de símbolos (o teclado do celular esconde esses caracteres) ----------
const SYMS = [
  ["⇥", "  ", "wide"], ["( )", "()", "", 1], ["{ }", "{}", "", 1], ["[ ]", "[]", "", 1], [";", ";"], ['" "', '""', "", 1],
  [".", "."], ["=", " = "], ["===", " === "], ["<", " < "], [">", " > "], ["+", " + "], ["!", "!"], ["&&", " && "], ["||", " || "],
  ["=>", " => "], ["` `", "``", "", 1], ["${ }", "${}", "", 1], ["◀", "LEFT", "wide"], ["▶", "RIGHT", "wide"],
];
function buildBar(bar, ta) {
  if (!bar || !ta) return;
  SYMS.forEach(([label, text, cls, back]) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label; if (cls) b.className = cls;
    b.setAttribute("aria-label", text === "LEFT" ? "cursor para a esquerda" : text === "RIGHT" ? "cursor para a direita" : `inserir ${text.trim()}`);
    // pointerdown + preventDefault: o editor não perde o foco e o teclado continua aberto
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (text === "LEFT" || text === "RIGHT") {
        const p = Math.max(0, Math.min(ta.value.length, ta.selectionStart + (text === "LEFT" ? -1 : 1)));
        ta.setSelectionRange(p, p); return;
      }
      const s = ta.selectionStart;
      ta.setRangeText(text, s, ta.selectionEnd, "end");
      if (back) { const p = ta.selectionStart - back; ta.setSelectionRange(p, p); }
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      if (navigator.vibrate) navigator.vibrate(8);
    });
    bar.appendChild(b);
  });
}
buildBar($("#symbar"), $("#code"));
buildBar($("#a-symbar"), $("#a-code"));

// ---------- modo digitação: com o teclado aberto o código ganha espaço ----------
["#code", "#a-code"].forEach((sel) => {
  const ta = $(sel);
  ta.setAttribute("autocorrect", "off");
  ta.setAttribute("enterkeyhint", "enter");
  ta.addEventListener("focus", () => { if (isMobile()) document.body.classList.add("typing"); });
  ta.addEventListener("blur", () => setTimeout(() => {
    if (!document.activeElement || !document.activeElement.matches("#code, #a-code")) document.body.classList.remove("typing");
  }, 120));
  // rolagem lateral do código: o realce acompanha o texto
  ta.addEventListener("scroll", () => {
    const hl = sel === "#code" ? $("#hl") : $("#a-hl");
    hl.scrollLeft = ta.scrollLeft;
  });
});
// botão "Pronto": fecha o teclado e volta a mostrar o mundo
[["#btn-run", "#code"], ["#a-fight", "#a-code"]].forEach(([runSel, taSel]) => {
  const done = document.createElement("button");
  done.type = "button"; done.className = "btn small kbd-done"; done.textContent = "✓ Pronto";
  done.setAttribute("aria-label", "Fechar teclado");
  done.addEventListener("pointerdown", (e) => { e.preventDefault(); $(taSel).blur(); document.body.classList.remove("typing"); });
  $(runSel).insertAdjacentElement("beforebegin", done);
});
// mantém a linha do cursor visível acima do teclado
function keepCaretVisible(ta) {
  const editor = ta.closest(".editor");
  if (!editor || !isMobile()) return;
  const line = ta.value.slice(0, ta.selectionStart).split("\n").length;
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 24;
  const y = (line - 1) * lh + 10;
  if (y < editor.scrollTop + lh || y > editor.scrollTop + editor.clientHeight - lh * 2) {
    editor.scrollTop = Math.max(0, y - editor.clientHeight / 2);
  }
}
["#code", "#a-code"].forEach((sel) => {
  const ta = $(sel);
  ["input", "click", "keyup"].forEach((ev) => ta.addEventListener(ev, () => keepCaretVisible(ta)));
  ta.addEventListener("focus", () => setTimeout(() => keepCaretVisible(ta), 350)); // depois do teclado abrir
});

// ao rodar ou lutar, fecha o teclado para o mundo aparecer
["#btn-run", "#a-fight"].forEach((sel) => $(sel).addEventListener("pointerdown", () => {
  if (isMobile() && document.activeElement && document.activeElement.matches("#code, #a-code")) document.activeElement.blur();
}));

// ---------- missão recolhível ----------
$("#mission").addEventListener("click", (e) => {
  if (!isMobile() || e.target.closest("a")) return;
  $("#mission").classList.toggle("open");
});

// ---------- navegação inferior: aparece nas telas de "menu" ----------
const NAV_SCREENS = ["map", "codex", "shop", "trophies"];
let lastScreen = null;
const setClass = (el, cls, on) => { if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on); };
function syncNav() {
  const active = document.querySelector(".screen.active");
  const id = active && active.id;
  if (id === lastScreen) return; // só reage quando a tela realmente muda
  lastScreen = id;
  setClass(document.body, "nav-on", NAV_SCREENS.includes(id));
  document.querySelectorAll("#mnav button").forEach((b) => setClass(b, "on", b.dataset.go === id));
  if (id !== "game" && id !== "arena") setClass(document.body, "typing", false);
  setClass($("#mission"), "open", false);
}
// observa só as telas (nunca o body inteiro: mexer em classes dentro do callback geraria um loop)
const obs = new MutationObserver(syncNav);
document.querySelectorAll(".screen").forEach((s) => obs.observe(s, { attributes: true, attributeFilter: ["class"] }));
document.querySelectorAll("#mnav button").forEach((b) => b.addEventListener("click", () => {
  if (window.HB) { window.HB.SFX.click(); window.HB.show(b.dataset.go); }
}));
syncNav();

// mundo do jogo se redesenha quando a altura muda (teclado abre/fecha, giro da tela)
let rt;
window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => window.dispatchEvent(new Event("hb:relayout")), 150); });
})();
