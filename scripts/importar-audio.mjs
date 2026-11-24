// Move o MP3 mais recente do ElevenLabs (pasta Downloads) para public/audio e registra no manifest.
// Uso: node scripts/importar-audio.mjs comandos-0
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const chave = process.argv[2];
if (!/^[\w-]+-\d+$/.test(chave || "")) { console.error("uso: node scripts/importar-audio.mjs <aula>-<cena>"); process.exit(1); }
const down = path.join(os.homedir(), "Downloads");
const arq = fs.readdirSync(down).filter((f) => /^ElevenLabs_.*\.mp3$/.test(f))
  .map((f) => ({ f, t: fs.statSync(path.join(down, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
if (!arq || Date.now() - arq.t > 5 * 60e3) { console.error("Nenhum MP3 recente do ElevenLabs em Downloads"); process.exit(1); }
const OUT = new URL("../public/audio/", import.meta.url);
const destino = `${chave}.mp3`;
fs.renameSync(path.join(down, arq.f), new URL(destino, OUT));
const mf = new URL("manifest.json", OUT);
const m = JSON.parse(fs.readFileSync(mf, "utf8").replace(/^﻿/, "") || "{}");
m[chave] = destino;
fs.writeFileSync(mf, JSON.stringify(m, null, 2));
console.log(`✔ ${arq.f} → public/audio/${destino}`);
