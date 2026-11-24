// Roda a simulação da fase num Web Worker (protege a página contra loops infinitos)
window.runSimulation = function (payload) {
  return new Promise((resolve) => {
    try { new Function("robo", "radar", "console", "document", payload.code); }
    catch (err) {
      resolve({ events: [], result: "error", errMsg: "SyntaxError: " + err.message, errLine: null });
      return;
    }
    const core = new URL("js/sim-core.js?v=" + (window.HB_V || ""), location.href).href;
    const src = `importScripts(${JSON.stringify(core)}); self.onmessage = (e) => self.postMessage(SIM.simCore(e.data));`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const w = new Worker(url);
    const timer = setTimeout(() => { w.terminate(); resolve({ events: [], result: "freeze", errMsg: null }); }, 1500);
    w.onmessage = (e) => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); resolve(e.data); };
    w.onerror = (e) => { clearTimeout(timer); w.terminate(); resolve({ events: [], result: "error", errMsg: e.message }); };
    w.postMessage(payload);
  });
};
