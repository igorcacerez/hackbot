// Gera a narração das aulas com ElevenLabs (text-to-speech).
//
// 1) Crie o arquivo .env na raiz do projeto:
//      ELEVENLABS_API_KEY=sua_chave_aqui
//      ELEVENLABS_VOICE_ID=id_da_voz        (opcional; escolha em elevenlabs.io > Voices)
// 2) Rode:  npm run narrar            (só gera o que falta ou mudou)
//           npm run narrar -- --force (regera tudo)
//           npm run narrar -- for     (só a aula "for")
//
// Os MP3 vão para public/audio/ e o jogo usa automaticamente (sem eles, usa a voz do navegador).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // voz padrão multilíngue
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
if (!KEY) {
  console.error("Falta ELEVENLABS_API_KEY no arquivo .env (veja o topo deste script).");
  process.exit(1);
}

const window = {};
new Function("window", fs.readFileSync(path.join(ROOT, "public/js/lessons.js"), "utf8"))(window);
const OUT = path.join(ROOT, "public/audio");
fs.mkdirSync(OUT, { recursive: true });
const manifestPath = path.join(OUT, "manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const force = process.argv.includes("--force");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// pronúncia: o TTS lê melhor assim
const falar = (t) => t.replace(/\brobo\b/g, "robô").replace(/JavaScript/g, "Java Script");

let feitos = 0, pulados = 0;
for (const [id, lesson] of Object.entries(window.LESSONS)) {
  if (only.length && !only.includes(id)) continue;
  for (let i = 0; i < lesson.scenes.length; i++) {
    const text = falar(lesson.scenes[i].say);
    const hash = crypto.createHash("sha1").update(VOICE + MODEL + text).digest("hex").slice(0, 8);
    const file = `${id}-${i}-${hash}.mp3`;
    const key = `${id}-${i}`;
    if (!force && manifest[key] === file && fs.existsSync(path.join(OUT, file))) { pulados++; continue; }
    process.stdout.write(`🎙️  ${key} ... `);
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true } }),
    });
    if (!res.ok) {
      console.log("ERRO", res.status, (await res.text()).slice(0, 200));
      if (res.status === 401 || res.status === 402 || res.status === 429) break;
      continue;
    }
    if (manifest[key] && manifest[key] !== file) fs.rmSync(path.join(OUT, manifest[key]), { force: true });
    fs.writeFileSync(path.join(OUT, file), Buffer.from(await res.arrayBuffer()));
    manifest[key] = file;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    feitos++;
    console.log("ok");
  }
}
console.log(`\nPronto: ${feitos} gerados, ${pulados} já existiam.`);
