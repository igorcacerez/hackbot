// Importa os N MP3 mais recentes do ElevenLabs (Downloads), em ordem de geração, para as chaves dadas.
// Uso: node scripts/importar-lote.mjs for-0 for-1 for-2 ...
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const chaves = process.argv.slice(2);
const down = path.join(os.homedir(), "Downloads");
const arqs = fs.readdirSync(down).filter((f) => /^ElevenLabs_.*Raquel.*\.mp3$/.test(f)).sort().slice(-chaves.length);
if (arqs.length !== chaves.length) { console.error(`Esperava ${chaves.length} arquivos, achei ${arqs.length}`); process.exit(1); }
const OUT = new URL("../public/audio/", import.meta.url);
const mf = new URL("manifest.json", OUT);
const m = JSON.parse(fs.readFileSync(mf, "utf8").replace(/^﻿/, "") || "{}");
chaves.forEach((k, i) => {
  fs.renameSync(path.join(down, arqs[i]), new URL(`${k}.mp3`, OUT));
  m[k] = `${k}.mp3`;
  console.log(`✔ ${arqs[i].slice(11, 30)} → ${k}.mp3`);
});
fs.writeFileSync(mf, JSON.stringify(m, null, 2));
