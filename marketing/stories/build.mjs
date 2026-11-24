// Gera v1/index.html e v2/index.html (stories 1080x1920 do HackBot).
import { writeFileSync } from "node:fs";

const CSS = `
:root{--bg:#0a0618;--g:#00ffa3;--p:#ff2e88;--y:#ffd23f;--c:#2ee6ff;--ink:#fff}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:var(--bg)}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:'Archivo Black',sans-serif;color:var(--ink)}
.abs{position:absolute}
.full{position:absolute;inset:0}
.center{display:flex;flex-direction:column;align-items:center;justify-content:center}
#glow{background:radial-gradient(900px 900px at 50% 38%,rgba(124,58,237,.55),transparent 70%),radial-gradient(700px 700px at 85% 90%,rgba(255,46,136,.35),transparent 70%),radial-gradient(600px 600px at 0% 10%,rgba(46,230,255,.25),transparent 70%)}
#gridwrap{left:-540px;right:-540px;top:1050px;height:1400px;perspective:600px}
#grid{position:absolute;inset:0;opacity:.45;-webkit-mask-image:linear-gradient(transparent,#000 30%);background-image:linear-gradient(rgba(0,255,163,.45) 2px,transparent 2px),linear-gradient(90deg,rgba(0,255,163,.45) 2px,transparent 2px);background-size:120px 120px;transform-origin:50% 0}
#gridfade{left:0;right:0;top:1000px;height:500px;background:linear-gradient(var(--bg),transparent)}
#scan{background:repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 2px,transparent 2px 5px);pointer-events:none;z-index:50}
#vig{background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.6));z-index:49}
.flash{background:#fff;opacity:0;z-index:60}
.t{text-align:center;line-height:.95;text-transform:uppercase;letter-spacing:-.02em}
.big{font-size:140px}.mid{font-size:104px}.sm{font-size:64px}
.g{color:var(--g)}.p{color:var(--p)}.y{color:var(--y)}.c{color:var(--c)}
.stroke{-webkit-text-stroke:4px var(--ink);color:transparent}
.shadow{text-shadow:0 0 30px rgba(0,255,163,.6),8px 8px 0 #7c3aed}
.robot{image-rendering:auto;filter:drop-shadow(0 0 40px rgba(0,255,163,.6))}
.code{font-family:'JetBrains Mono',monospace;font-size:46px;background:rgba(10,6,30,.92);border:4px solid var(--g);border-radius:28px;padding:36px 40px;box-shadow:0 0 60px rgba(0,255,163,.35),14px 14px 0 #7c3aed;text-align:left;line-height:1.5;white-space:pre}
.code .k{color:var(--p)}.code .f{color:var(--c)}.code .n{color:var(--y)}.code .cm{color:#7d7aa8}
.bar{height:16px;border-radius:8px;background:rgba(255,255,255,.12);overflow:hidden}
.bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--g),var(--c),var(--p));transform-origin:0 50%}
.chip{font-family:'JetBrains Mono',monospace;font-size:72px;padding:18px 44px;border-radius:999px;border:5px solid currentColor;background:rgba(10,6,30,.85);box-shadow:0 0 40px currentColor}
.pill{background:var(--y);color:#120a2a;padding:14px 40px;border-radius:999px;font-size:54px}
.cap{left:60px;right:60px;top:1170px;display:flex;flex-wrap:wrap;justify-content:center;gap:0 22px;z-index:40}
.cap span{font-size:62px;text-transform:uppercase;color:#fff;-webkit-text-stroke:2px #000;paint-order:stroke;text-shadow:0 6px 0 #000,0 0 18px rgba(0,0,0,.8);display:inline-block}
.stamp{border:12px solid var(--p);color:var(--p);padding:10px 50px;border-radius:24px;font-size:170px;text-shadow:0 0 40px rgba(255,46,136,.7);box-shadow:0 0 50px rgba(255,46,136,.6),inset 0 0 30px rgba(255,46,136,.5)}
.url{font-family:'JetBrains Mono',monospace;font-size:40px;color:var(--g);background:rgba(0,0,0,.55);padding:16px 30px;border-radius:16px;border:3px solid var(--g)}
`;

// Legendas palavra a palavra: [[ [palavra,inicio], ...], ...] -> cada frase fica até a próxima
function captions(phrases, end, prefix) {
  let html = "", js = "";
  phrases.forEach((ph, i) => {
    const s = ph[0][1];
    const e = i + 1 < phrases.length ? phrases[i + 1][0][1] : end;
    html += `<div id="${prefix}cap${i}" class="abs cap clip" data-start="${s.toFixed(2)}" data-duration="${(e - s).toFixed(2)}" data-track-index="9">`;
    ph.forEach(([w, t], j) => {
      const hot = w.endsWith("*");
      html += `<span id="${prefix}w${i}_${j}">${hot ? w.slice(0, -1) : w}</span>`;
      js += `tl.fromTo("#${prefix}w${i}_${j}",{opacity:0,y:30,scale:.7},{opacity:1,y:0,scale:1,duration:.18,ease:"back.out(3)"},${t});`;
      if (hot) js += `tl.to("#${prefix}w${i}_${j}",{color:"#ffd23f",duration:.05},${t});`;
    });
    html += `</div>`;
  });
  return { html, js };
}

function page({ id, dur, scenes, js, caps, vo }) {
  const c = captions(caps, dur, id);
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>${CSS}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="1080" data-height="1920">
<div id="glow" class="full"></div>
<div id="gridwrap" class="abs"><div id="grid"></div></div>

<div id="stage" class="full" style="transform:scale(.86);transform-origin:50% 30%">${scenes}</div>
${c.html}
<div id="scan" class="full"></div><div id="vig" class="full"></div>
<audio id="vo" class="clip" data-start="0.3" data-duration="${vo}" data-track-index="20" src="assets/vo.mp3" data-volume="1"></audio>
<audio id="music" class="clip" data-start="0" data-duration="${dur}" data-track-index="21" src="assets/music.wav" data-volume="0.35"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
const _seen=new Set(),_ft=tl.fromTo.bind(tl);tl.fromTo=(t,a,b,p)=>{if(_seen.has(t))b={...b,immediateRender:false};_seen.add(t);return _ft(t,a,b,p)};
const O=0.3; // offset da narração
gsap.set("#grid",{rotationX:62});
tl.fromTo("#grid",{backgroundPositionY:"0px"},{backgroundPositionY:"${Math.round(dur * 240)}px",duration:${dur},ease:"none"},0);
tl.fromTo("#glow",{scale:1},{scale:1.15,duration:${dur},ease:"sine.inOut"},0);
function flash(sel,t){tl.fromTo(sel,{opacity:.85},{opacity:0,duration:.25,ease:"power2.out"},t);}
function shake(sel,t,a=18){tl.fromTo(sel,{x:-a},{x:0,duration:.35,ease:"elastic.out(1,.25)"},t);}
${js}
${c.js.replace(/,(\d+(?:\.\d+)?)\);/g, (m, t) => `,${(+t + 0.3).toFixed(2)});`)}
window.__timelines["main"] = tl;
tl.seek(0);
</script></body></html>`;
}

// ---------------- VÍDEO 1: "E se programar fosse um jogo?" ----------------
const v1 = {
  id: "a", vo: 16.9,
  dur: 18.6,
  caps: [
    [["E", 0], ["se", .2], ["aprender", .28], ["programação*", .68], ["fosse", 1.34], ["um", 1.6], ["jogo?*", 1.78]],
    [["No", 2.62], ["HackBot,*", 2.72], ["você", 3.44], ["não", 3.66], ["responde", 3.98], ["perguntas.", 4.5]],
    [["Você", 5.38], ["programa", 5.62], ["um", 6.3], ["robô!*", 6.34]],
    [["Escreva", 7.26], ["JavaScript*", 7.64], ["de", 8.1], ["verdade,", 8.54]],
    [["derrote", 9.42], ["bugs*", 9.72], ["e", 10.08], ["suba", 10.38], ["no", 10.82], ["ranking*", 10.9]],
    [["da", 11.22], ["arena", 11.46], ["online.*", 11.7]],
    [["Do", 12.42], ["primeiro", 12.58], ["comando", 12.9], ["até", 13.6], ["o", 13.94], ["DOM.*", 14.14]],
    [["E", 14.66], ["é", 14.82], ["grátis!*", 14.92]],
    [["Joga", 15.84], ["agora!*", 16.14]],
  ],
  scenes: `
<div id="s1" class="full clip" data-start="0" data-duration="2.95" data-track-index="1">
  <div id="s1top" class="abs t sm c" style="top:330px;left:0;right:0">E se aprender</div>
  <div id="s1prog" class="abs t big g shadow" style="top:420px;left:0;right:0;font-size:112px">PROGRAMAÇÃO</div>
  <div id="s1jogo" class="abs t mid" style="top:580px;left:0;right:0">fosse um <span class="y">jogo?</span></div>
  <img id="s1robot" class="abs robot" src="assets/robot.png" style="left:290px;top:720px;width:500px"/>
  <div id="s1q" class="abs t big p" style="left:760px;top:680px;font-size:220px">?</div>
</div>
<div id="s2" class="full clip" data-start="2.95" data-duration="2.7" data-track-index="1">
  <div id="s2logo" class="abs t" style="top:380px;left:0;right:0;font-size:190px"><span class="g">HACK</span>BOT</div>
  <div id="s2quiz" data-layout-allow-overlap class="abs center" style="left:190px;top:700px;width:700px;height:340px;border:5px dashed #7d7aa8;border-radius:30px;background:rgba(255,255,255,.05)">
    <div class="t sm" style="color:#7d7aa8">QUIZ CHATO</div>
    <div class="t" style="font-family:'JetBrains Mono';font-size:40px;color:#7d7aa8;margin-top:104px">A) ___ B) ___ C) ___</div>
  </div>
  <div id="s2x" class="abs t p" style="left:0;right:0;top:640px;font-size:460px;line-height:1">✕</div>
</div>
<div id="s3" class="full clip" data-start="5.65" data-duration="1.9" data-track-index="1">
  <div id="s3t" class="abs t mid" style="top:330px;left:0;right:0">Você <span class="g">programa</span><br/>um robô</div>
  <div id="s3tiles" class="abs" style="left:110px;top:900px;width:860px;height:180px;display:flex;gap:16px">
    <div style="flex:1;border:4px solid var(--g);border-radius:18px;background:rgba(0,255,163,.12)"></div><div style="flex:1;border:4px solid var(--g);border-radius:18px;background:rgba(0,255,163,.12)"></div><div style="flex:1;border:4px solid var(--g);border-radius:18px;background:rgba(0,255,163,.12)"></div><div style="flex:1;border:4px solid var(--y);border-radius:18px;background:rgba(255,210,63,.25)"></div>
  </div>
  <img id="s3robot" class="abs robot" src="assets/robot.png" style="left:110px;top:700px;width:220px"/>
  <img id="s3portal" class="abs" src="assets/portal.png" style="left:770px;top:720px;width:200px"/>
</div>
<div id="s4" class="full clip" data-start="7.55" data-duration="2.15" data-track-index="1">
  <div id="s4t" class="abs t mid" style="top:310px;left:0;right:0"><span class="y">JavaScript</span><br/>de verdade</div>
  <div id="s4code" class="abs code" style="left:90px;top:580px;width:900px"><span id="s4l1"><span class="k">for</span> (<span class="k">let</span> i = <span class="n">0</span>; i &lt; <span class="n">3</span>; i++) {</span>
<span id="s4l2">  robo.<span class="f">andar</span>();</span>
<span id="s4l3">  robo.<span class="f">pular</span>();</span>
<span id="s4l4">}</span>
<span id="s4l5" class="cm">// ✔ fase concluída ★★★</span></div>
</div>
<div id="s5" class="full clip" data-start="9.7" data-duration="3.0" data-track-index="1">
  <img id="s5b1" class="abs" src="assets/bug_null.png" style="left:80px;top:380px;width:260px"/>
  <img id="s5b2" class="abs" src="assets/bug_loop.png" style="left:410px;top:310px;width:260px"/>
  <img id="s5b3" class="abs" src="assets/bug_undefined.png" style="left:740px;top:380px;width:260px"/>
  <div id="s5laser" class="abs" style="left:0;right:0;top:500px;height:26px;background:linear-gradient(90deg,transparent,var(--p),#fff,var(--p),transparent);box-shadow:0 0 40px var(--p)"></div>
  <div id="s5rank" class="abs" style="left:170px;top:720px;width:740px">
    <div class="t sm y" style="text-align:left;margin-bottom:20px">🏆 RANKING</div>
    <div id="s5r1" style="display:flex;justify-content:space-between;font-size:52px;padding:14px 26px;border-radius:16px;background:rgba(0,255,163,.2);border:4px solid var(--g);margin-bottom:12px"><span>#1 VOCÊ</span><span class="g">1840</span></div>
    <div id="s5r2" style="display:flex;justify-content:space-between;font-size:44px;padding:12px 26px;color:#9a97c4"><span>#2 bot_ana</span><span>1710</span></div>
    <div id="s5r3" style="display:flex;justify-content:space-between;font-size:44px;padding:12px 26px;color:#9a97c4"><span>#3 robozin</span><span>1655</span></div>
  </div>
</div>
<div id="s6" class="full clip" data-start="12.7" data-duration="2.2" data-track-index="1">
  <div id="s6t" class="abs t mid" style="top:330px;left:0;right:0">do <span class="c">1º comando</span><br/>até o <span class="p">DOM</span></div>
  <div id="s6path" class="abs" style="left:90px;top:720px;width:900px;display:flex;flex-direction:column;gap:22px;font-family:'JetBrains Mono';font-size:48px">
    <div id="s6a">▸ robo.andar()</div><div id="s6b">▸ for / while / if</div><div id="s6c">▸ funções &amp; arrays</div><div id="s6d" class="p">▸ document.querySelector</div>
  </div>
  <div class="abs bar" style="left:90px;top:1100px;width:900px"><i id="s6bar"></i></div>
  <div id="s6n" class="abs t sm y" style="left:0;right:0;top:1140px">25 FASES · 8 MÓDULOS</div>
</div>
<div id="s7" class="full clip" data-start="14.9" data-duration="3.7" data-track-index="1">
  <div id="s7stamp" class="abs center" style="left:0;right:0;top:330px"><div class="t stamp">GRÁTIS</div></div>
  <img id="s7robot" class="abs robot" src="assets/robot.png" style="left:340px;top:600px;width:400px"/>
  <img id="s7crown" class="abs" src="assets/hat_crown.png" style="left:450px;top:510px;width:180px"/>
  <div id="s7cta" class="abs t mid g shadow" style="left:0;right:0;top:1040px">JOGA AGORA ▶</div>
  <div id="s7url" class="abs center" style="left:0;right:0;top:1170px"><div class="url">roboscript.igorcacerez.com.br</div></div>
</div>
<div id="fl1" class="full flash clip" data-start="2.9" data-duration="0.4" data-track-index="8"></div>
<div id="fl2" class="full flash clip" data-start="14.85" data-duration="0.4" data-track-index="8"></div>
`,
  js: `
// s1 — gancho já visível no frame 0
tl.fromTo("#s1prog",{scale:1.25,opacity:1},{scale:1,duration:.5,ease:"expo.out"},0);
tl.fromTo("#s1top",{opacity:.0,y:-30},{opacity:1,y:0,duration:.3},0.05);
tl.fromTo("#s1jogo",{opacity:0,scale:.4},{opacity:1,scale:1,duration:.4,ease:"back.out(3)"},O+1.3);
tl.fromTo("#s1robot",{y:60,rotation:-6},{y:0,rotation:6,duration:.45,ease:"sine.inOut",yoyo:true,repeat:5},0);
tl.fromTo("#s1q",{scale:0,rotation:-40},{scale:1,rotation:12,duration:.5,ease:"back.out(4)"},O+1.78);
tl.fromTo("#s1prog",{x:0},{x:0,keyframes:{x:[0,-14,12,-6,0]},duration:.3},O+0.68);
// s2
flash("#fl1",2.9);
tl.fromTo("#s2logo",{scale:3,opacity:0},{scale:1,opacity:1,duration:.35,ease:"expo.out"},2.95);
shake("#s2logo",3.3,30);
tl.fromTo("#s2quiz",{opacity:0,y:80},{opacity:1,y:0,duration:.35,ease:"power3.out"},O+3.4);
tl.fromTo("#s2x",{scale:2.5,opacity:0,rotation:-25},{scale:1,opacity:1,rotation:0,duration:.25,ease:"back.out(2)"},O+4.5);
tl.to("#s2quiz",{opacity:.3,scale:.92,duration:.2},O+4.55);
// s3
tl.fromTo("#s3t",{opacity:0,y:-60},{opacity:1,y:0,duration:.3,ease:"back.out(2)"},5.65);
tl.fromTo("#s3tiles",{opacity:0,scaleX:0},{opacity:1,scaleX:1,duration:.35,ease:"expo.out"},5.7);
tl.fromTo("#s3robot",{x:0},{x:640,duration:1.1,ease:"steps(3)"},6.0);
tl.fromTo("#s3portal",{rotation:0,scale:.8},{rotation:360,scale:1.1,duration:1.9,ease:"none"},5.65);
// s4
tl.fromTo("#s4t",{opacity:0,scale:1.4},{opacity:1,scale:1,duration:.3,ease:"expo.out"},7.55);
tl.fromTo("#s4code",{opacity:0,y:120,rotation:-4},{opacity:1,y:0,rotation:0,duration:.4,ease:"back.out(1.8)"},7.6);
["#s4l1","#s4l2","#s4l3","#s4l4","#s4l5"].forEach((s,i)=>tl.fromTo(s,{opacity:0},{opacity:1,duration:.05},7.9+i*.28));
tl.fromTo("#s4code",{boxShadow:"0 0 60px rgba(0,255,163,.35),14px 14px 0 #7c3aed"},{boxShadow:"0 0 140px rgba(0,255,163,.9),14px 14px 0 #7c3aed",duration:.3},9.2);
// s5
["#s5b1","#s5b2","#s5b3"].forEach((s,i)=>{tl.fromTo(s,{scale:0,y:-200},{scale:1,y:0,duration:.35,ease:"back.out(3)"},9.7+i*.1);
  tl.to(s,{scale:1.6,opacity:0,rotation:90,duration:.25,ease:"power2.in"},O+9.85+i*.12);});
tl.fromTo("#s5laser",{scaleX:0,opacity:1},{scaleX:1,duration:.15,ease:"expo.out"},O+9.75);
tl.to("#s5laser",{opacity:0,duration:.3},O+10.2);
tl.fromTo("#s5rank",{opacity:0,y:100},{opacity:1,y:0,duration:.35,ease:"power3.out"},O+10.3);
tl.fromTo("#s5r1",{y:150},{y:0,duration:.5,ease:"back.out(2)"},O+10.9);
tl.fromTo("#s5r1",{scale:1},{scale:1.08,duration:.2,yoyo:true,repeat:1},O+11.5);
// s6
tl.fromTo("#s6t",{opacity:0,y:-50},{opacity:1,y:0,duration:.3,ease:"back.out(2)"},12.7);
["#s6a","#s6b","#s6c","#s6d"].forEach((s,i)=>tl.fromTo(s,{opacity:0,x:-120},{opacity:1,x:0,duration:.25,ease:"power3.out"},12.85+i*.32));
tl.fromTo("#s6bar",{scaleX:0},{scaleX:1,duration:1.4,ease:"power2.inOut"},12.85);
tl.fromTo("#s6n",{opacity:0,scale:.6},{opacity:1,scale:1,duration:.3,ease:"back.out(3)"},14.2);
// s7
flash("#fl2",14.85);
tl.fromTo("#s7stamp",{scale:4,opacity:0,rotation:-20},{scale:1,opacity:1,rotation:-6,duration:.3,ease:"power4.in"},O+14.75);
shake("#s7stamp",O+15.05,40);
tl.fromTo("#s7robot",{y:400,opacity:0},{y:0,opacity:1,duration:.5,ease:"back.out(1.6)"},15.2);
tl.fromTo("#s7crown",{y:-500,rotation:-30},{y:0,rotation:-8,duration:.5,ease:"bounce.out"},15.5);
tl.fromTo("#s7cta",{opacity:0,scale:.5},{opacity:1,scale:1,duration:.35,ease:"back.out(3)"},O+15.84);
tl.fromTo("#s7cta",{scale:1},{scale:1.07,duration:.4,ease:"sine.inOut",yoyo:true,repeat:3},16.6);
tl.fromTo("#s7url",{opacity:0,y:40},{opacity:1,y:0,duration:.3},16.4);
tl.fromTo("#s7robot",{rotation:-4},{rotation:4,duration:.5,ease:"sine.inOut",yoyo:true,repeat:3},16.0);
`,
};

// ---------------- VÍDEO 2: "Seu robô está travado" ----------------
const v2 = {
  id: "b", vo: 19.2,
  dur: 20.4,
  caps: [
    [["Psiu!*", 0]],
    [["Seu", .76], ["robô", 1.04], ["está", 1.36], ["travado!*", 1.56]],
    [["E", 2.66], ["só", 2.72], ["você*", 3.04], ["pode", 3.44], ["salvá-lo!", 3.68]],
    [["Com", 4.62], ["código!*", 4.72]],
    [["Use", 5.78], ["for,*", 5.94], ["if,*", 6.64], ["funções*", 7.36], ["e", 7.86], ["arrays*", 8.14]],
    [["para", 8.46], ["atravessar", 8.74], ["25*", 9.24], ["fases.", 9.72]],
    [["Ganhe", 10.96], ["moedas,*", 11.3], ["compre", 12.04], ["chapéus*", 12.28]],
    [["e", 12.86], ["desafie", 13.0], ["outros", 13.54], ["jogadores", 13.9], ["na", 14.5], ["arena.*", 14.7]],
    [["HackBot!*", 15.34]],
    [["Aprenda", 16.24], ["JavaScript*", 16.76], ["jogando!", 17.14]],
    [["Link", 18.24], ["na", 18.46], ["bio!*", 18.66]],
  ],
  scenes: `
<div id="s1" class="full clip" data-start="0" data-duration="2.95" data-track-index="1">
  <div id="s1red" class="full" style="background:radial-gradient(circle at 50% 45%,rgba(255,46,136,.45),transparent 65%)"></div>
  <div id="s1err" class="abs t p" style="top:320px;left:0;right:0;font-size:96px">⚠ ERRO</div>
  <div id="s1t" class="abs t big" style="top:430px;left:0;right:0">ROBÔ<br/><span class="p">TRAVADO</span></div>
  <img id="s1robot" class="abs robot" src="assets/robot.png" style="left:300px;top:770px;width:480px;filter:grayscale(.6) drop-shadow(0 0 40px rgba(255,46,136,.8))"/>
  <div id="s1console" class="abs" style="left:110px;top:1140px;font-family:'JetBrains Mono';font-size:36px;color:var(--p)">Uncaught TypeError: robo is stuck</div>
</div>
<div id="s2" class="full clip" data-start="2.95" data-duration="3.1" data-track-index="1">
  <div id="s2t" class="abs t mid" style="top:340px;left:0;right:0">só <span class="y">você</span><br/>pode salvá-lo</div>
  <div id="s2code" class="abs center" style="left:0;right:0;top:640px"><div class="t g shadow" style="font-family:'JetBrains Mono';font-size:210px">{ }</div></div>
  <div id="s2t2" class="abs t big g shadow" style="top:930px;left:0;right:0">COM CÓDIGO</div>
</div>
<div id="s3" class="full clip" data-start="6.05" data-duration="5.1" data-track-index="1">
  <div id="s3for" class="abs chip p" style="left:110px;top:360px">for</div>
  <div id="s3if" class="abs chip c" style="left:640px;top:460px">if</div>
  <div id="s3fn" class="abs chip y" style="left:150px;top:600px">funções()</div>
  <div id="s3arr" class="abs chip g" style="left:560px;top:740px">[arrays]</div>
  <div id="s3num" class="abs t" style="left:0;right:0;top:860px;font-size:300px"><span id="s3count" class="y">25</span></div>
  <div id="s3f" class="abs t mid" style="left:0;right:0;top:1140px">FASES</div>
</div>
<div id="s4" class="full clip" data-start="11.15" data-duration="2.35" data-track-index="1">
  <img id="s4c1" class="abs" src="assets/coin.png" style="left:120px;top:280px;width:150px"/>
  <img id="s4c2" class="abs" src="assets/coin.png" style="left:450px;top:230px;width:130px"/>
  <img id="s4c3" class="abs" src="assets/coin.png" style="left:780px;top:310px;width:160px"/>
  <img id="s4c4" class="abs" src="assets/coin.png" style="left:280px;top:200px;width:110px"/>
  <img id="s4c5" class="abs" src="assets/coin.png" style="left:640px;top:180px;width:120px"/>
  <img id="s4robot" class="abs robot" src="assets/robot.png" style="left:330px;top:700px;width:420px"/>
  <img id="s4hat1" class="abs" src="assets/hat_wizard.png" style="left:430px;top:500px;width:220px"/>
  <img id="s4hat2" class="abs" src="assets/hat_crown.png" style="left:450px;top:580px;width:180px"/>
  <img id="s4glass" class="abs" src="assets/glasses_cool.png" style="left:420px;top:780px;width:240px"/>
  <div id="s4pill" class="abs center" style="left:0;right:0;top:1160px"><div class="pill t">+250 🪙 LOJA</div></div>
</div>
<div id="s5" class="full clip" data-start="13.5" data-duration="2.0" data-track-index="1">
  <img id="s5l" class="abs robot" src="assets/robot.png" style="left:40px;top:640px;width:400px"/>
  <img id="s5r" class="abs robot" src="assets/robot.png" style="left:640px;top:640px;width:400px;filter:hue-rotate(140deg) drop-shadow(0 0 40px rgba(255,46,136,.8))"/>
  <div id="s5vs" class="abs t p" style="left:0;right:0;top:700px;font-size:220px;text-shadow:0 0 50px var(--p)">VS</div>
  <div id="s5t" class="abs t mid" style="left:0;right:0;top:340px">ARENA <span class="c">ONLINE</span></div>
</div>
<div id="s6" class="full clip" data-start="15.5" data-duration="4.9" data-track-index="1">
  <div id="s6logo" class="abs t" style="top:340px;left:0;right:0;font-size:190px"><span class="g">HACK</span>BOT</div>
  <div id="s6sub" class="abs t sm" style="top:550px;left:0;right:0">aprenda <span class="y">JavaScript</span><br/>jogando</div>
  <img id="s6robot" class="abs robot" src="assets/robot.png" style="left:360px;top:720px;width:360px"/>
  <div id="s6bio" class="abs center" style="left:0;right:0;top:1140px"><div class="pill t" style="background:var(--g)">LINK NA BIO ↓</div></div>
</div>
<div id="fl1" class="full flash clip" data-start="2.9" data-duration="0.4" data-track-index="8"></div>
<div id="fl2" class="full flash clip" data-start="15.45" data-duration="0.4" data-track-index="8"></div>
`,
  js: `
// s1 — alerta, visível no frame 0
tl.fromTo("#s1t",{scale:1.15},{scale:1,duration:.4,ease:"expo.out"},0);
tl.fromTo("#s1red",{opacity:.3},{opacity:1,duration:.25,yoyo:true,repeat:9,ease:"steps(1)"},0);
tl.fromTo("#s1err",{opacity:1},{opacity:.2,duration:.2,yoyo:true,repeat:11,ease:"steps(1)"},0);
tl.fromTo("#s1robot",{x:-14},{x:14,duration:.06,yoyo:true,repeat:30,ease:"none"},O+0.76);
tl.fromTo("#s1t",{x:0},{keyframes:{x:[0,-22,18,-10,0],skewX:[0,-12,10,0,0]},duration:.3},O+1.56);
tl.fromTo("#s1console",{opacity:0},{opacity:1,duration:.05},O+1.7);
// s2
flash("#fl1",2.9);
tl.fromTo("#s2t",{opacity:0,y:-60},{opacity:1,y:0,duration:.3,ease:"back.out(2)"},2.95);
tl.fromTo("#s2code",{scale:0,rotation:-180},{scale:1,rotation:0,duration:.55,ease:"back.out(2)"},O+3.3);
tl.fromTo("#s2t2",{opacity:0,scale:2.4},{opacity:1,scale:1,duration:.25,ease:"power4.in"},O+4.55);
shake("#s2t2",O+4.8,30);
tl.fromTo("#s2code",{scale:1},{scale:1.12,duration:.3,yoyo:true,repeat:1},O+4.8);
// s3
[["#s3for",5.94],["#s3if",6.64],["#s3fn",7.36],["#s3arr",8.14]].forEach(([s,t],i)=>{
  tl.fromTo(s,{scale:0,rotation:(i%2?20:-20)},{scale:1,rotation:(i%2?4:-4),duration:.35,ease:"back.out(3)"},O+t-.05);
  tl.fromTo(s,{y:0},{y:-24,duration:.8,ease:"sine.inOut",yoyo:true,repeat:3},O+t+.3);});
tl.fromTo("#s3num",{opacity:0,scale:.3},{opacity:1,scale:1,duration:.4,ease:"back.out(2.5)"},O+9.1);
tl.fromTo("#s3f",{opacity:0,y:40},{opacity:1,y:0,duration:.3},O+9.6);
tl.fromTo("#s3num",{textShadow:"0 0 0 #ffd23f"},{textShadow:"0 0 80px #ffd23f",duration:.4,yoyo:true,repeat:1},O+9.6);
// s4
["#s4c1","#s4c2","#s4c3","#s4c4","#s4c5"].forEach((s,i)=>tl.fromTo(s,{y:-500,rotation:0},{y:520+i*40,rotation:360,duration:1.4,ease:"power2.in"},11.15+i*.12));
tl.fromTo("#s4robot",{scale:.5,opacity:0},{scale:1,opacity:1,duration:.35,ease:"back.out(2)"},11.15);
tl.fromTo("#s4pill",{opacity:0,scale:.4},{opacity:1,scale:1,duration:.3,ease:"back.out(3)"},O+11.3);
tl.fromTo("#s4hat1",{y:-600,opacity:1},{y:0,duration:.35,ease:"bounce.out"},O+12.1);
tl.to("#s4hat1",{y:-700,duration:.25,ease:"power2.in"},O+12.6);
tl.fromTo("#s4hat2",{y:-600},{y:0,duration:.35,ease:"bounce.out"},O+12.75);
tl.fromTo("#s4glass",{scale:0},{scale:1,duration:.25,ease:"back.out(3)"},O+12.5);
// s5
tl.fromTo("#s5l",{x:-500},{x:0,duration:.35,ease:"expo.out"},13.5);
tl.fromTo("#s5r",{x:500,scaleX:-1},{x:0,scaleX:-1,duration:.35,ease:"expo.out"},13.5);
tl.fromTo("#s5vs",{scale:4,opacity:0},{scale:1,opacity:1,duration:.25,ease:"power4.in"},13.75);
shake("#s5vs",14.0,40);
tl.fromTo("#s5t",{opacity:0,y:-40},{opacity:1,y:0,duration:.3},13.6);
tl.to("#s5l",{x:80,duration:.15,yoyo:true,repeat:1},O+14.7);
tl.to("#s5r",{x:-80,duration:.15,yoyo:true,repeat:1},O+14.7);
// s6
flash("#fl2",15.45);
tl.fromTo("#s6logo",{scale:3,opacity:0},{scale:1,opacity:1,duration:.35,ease:"expo.out"},O+15.2);
shake("#s6logo",O+15.55,30);
tl.fromTo("#s6sub",{opacity:0,y:40},{opacity:1,y:0,duration:.35,ease:"power3.out"},O+16.2);
tl.fromTo("#s6robot",{y:400},{y:0,duration:.5,ease:"back.out(1.6)"},15.7);
tl.fromTo("#s6robot",{rotation:-5},{rotation:5,duration:.5,ease:"sine.inOut",yoyo:true,repeat:5},16.2);
tl.fromTo("#s6bio",{opacity:0,scale:.4},{opacity:1,scale:1,duration:.35,ease:"back.out(3)"},O+18.2);
tl.fromTo("#s6bio",{y:0},{y:24,duration:.3,ease:"sine.inOut",yoyo:true,repeat:3},O+18.6);
`,
};

writeFileSync("v1/index.html", page(v1));
writeFileSync("v2/index.html", page(v2));
console.log("ok");
