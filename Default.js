const express = require('express');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const CIRC = 2 * Math.PI * 54; // circunferência do anel (r = 54)

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
}

function getLocalIP() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

// Uso de cada "pata" (núcleo) desde a última leitura
let prevCpu = os.cpus().map((c) => ({ ...c.times }));
let lastUsage = null;
let lastRead = 0;
function getCoreUsage() {
  // Leituras muito próximas dão porcentagens instáveis: reaproveita a última
  if (lastUsage && Date.now() - lastRead < 1000) return lastUsage;
  const cur = os.cpus();
  const usage = cur.map((c, i) => {
    const p = prevCpu[i] || { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
    const idle = c.times.idle - p.idle;
    const total = Object.keys(c.times).reduce((a, k) => a + c.times[k] - (p[k] || 0), 0);
    return total > 0 ? Math.round((1 - idle / total) * 100) : 0;
  });
  prevCpu = cur.map((c) => ({ ...c.times }));
  lastUsage = usage;
  lastRead = Date.now();
  return usage;
}

// "Caixa de areia" (disco)
function getDisk() {
  try {
    const st = fs.statfsSync(path.parse(process.cwd()).root);
    const total = st.blocks * st.bsize;
    const used = total - st.bavail * st.bsize;
    return {
      totalGB: (total / 1e9).toFixed(1),
      usedGB: (used / 1e9).toFixed(1),
      percent: Math.round((used / total) * 100)
    };
  } catch (e) {
    return null; // statfsSync exige Node 18.15+
  }
}

function getStats() {
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  const usedMem = totalMem - freeMem;
  const cores = getCoreUsage();
  const [l1, l5, l15] = os.loadavg();
  const now = new Date();
  return {
    uptime: formatUptime(os.uptime()),
    processUptime: formatUptime(process.uptime()),
    loadAvg: l1.toFixed(2),
    load1: l1.toFixed(2),
    load5: l5.toFixed(2),
    load15: l15.toFixed(2),
    cores,
    loadPercent: Math.round(cores.reduce((a, b) => a + b, 0) / (cores.length || 1)),
    usedMem,
    freeMem,
    totalMem,
    memUsagePercent: Math.round((usedMem / totalMem) * 100),
    processMem: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
    rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
    disk: getDisk(),
    hour: now.getHours(),
    serverTime: now.toLocaleString('pt-BR')
  };
}

app.get('/api/stats', (req, res) => res.json(getStats()));

app.get('/', (req, res) => {
  const cpus = os.cpus();
  const s = getStats();
  const nets = Object.entries(os.networkInterfaces()).flatMap(([name, list]) =>
    list.filter((i) => i.family === 'IPv4' || i.family === 4)
        .map((i) => ({ name, address: i.address, mac: i.mac, internal: i.internal })));
  const strip = Array.from({ length: 10 }, (_, i) => `<span class="${i % 2 ? 'w' : 'p'}">Meow Monitor</span>`).join('');
  const marquee = `<div class="marquee" aria-hidden="true"><div class="track">${strip}${strip}</div></div>`;
  const offset = (p) => (CIRC * (1 - p / 100)).toFixed(1);

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MeowNitor Perfeito 🐾</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Archivo:ital,wght@0,500;0,700;0,800;1,800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #151416; --panel: #1c1a1f; --line: #2e2b34;
    --muted: #b3abbd; --pink: #ff2e93; --ink-blue: #3a3fb0; --blue: #2f3dff;
    --yellow: #ffc933; --cyan: #27e1f2; --red: #ff1f3d; --green: #8dff3a;
    --cream: #f1ebe0; --black: #0b0a0c; --danger: #ff1f3d;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { color-scheme: dark; scroll-behavior: smooth; }
  body {
    font-family: 'Archivo', 'Segoe UI', sans-serif;
    background-color: var(--bg);
    background-image:
      linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
    background-size: 28px 28px;
    color: #fff; min-height: 100vh; line-height: 1.5; overflow-x: hidden;
  }
  h1, h2, h3, .num, .display { font-family: 'Bagel Fat One', 'Archivo', sans-serif; font-weight: 400; }
  button { font-family: inherit; }
  :focus-visible { outline: 3px solid var(--cyan); outline-offset: 3px; }

  .page { max-width: 1080px; margin: 0 auto; padding: 24px 0 0; }
  .page > .tab-bar, .page > .actions, .page > .fact-box, .page > .tab-content, .page > #boxText { margin-left: 20px; margin-right: 20px; }

  /* Faixas de texto repetido */
  .marquee { background: var(--black); overflow: hidden; white-space: nowrap; padding: 8px 0; position: relative; z-index: 3; }
  .marquee .track { display: inline-flex; animation: scroll 30s linear infinite; }
  .marquee span { font-weight: 800; font-style: italic; font-size: .95rem; margin-right: 28px; }
  .marquee .p { color: var(--pink); } .marquee .w { color: #fff; }
  @keyframes scroll { to { transform: translateX(-50%); } }

  /* Hero */
  .hero { position: relative; background: var(--cream); color: #17131a; margin: 0 0 28px; overflow: hidden; border: 3px solid var(--black); }
  .hero-body {
    position: relative; display: grid; grid-template-columns: 1.1fr .9fr; gap: 20px; padding: 34px 34px 44px;
    background: repeating-linear-gradient(98deg, transparent 0 30px, rgba(255,46,147,.2) 30px 31px);
  }
  .hero-body::before {
    content: ''; position: absolute; top: 0; right: 0; width: 200px; height: 100px;
    background: repeating-conic-gradient(var(--red) 0 25%, var(--black) 0 50%) 0 0 / 50px 50px;
  }
  .hero-left, .hero-right { position: relative; z-index: 2; }
  .top-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .dots { display: flex; gap: 8px; }
  .dots i { width: 14px; height: 14px; border-radius: 50%; background: var(--cyan); }
  .dots i:nth-child(2) { background: var(--pink); } .dots i:nth-child(3) { background: var(--red); }
  .status { display: inline-flex; align-items: center; gap: 8px; background: var(--black); color: var(--green); font-weight: 800; font-size: .8rem; padding: 4px 12px; border-radius: 999px; }
  .status i { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 50% { opacity: .35; } }
  .eyes { display: flex; margin: 18px 0 0; }
  .eyes b { width: 34px; height: 42px; background: #fff; border: 3px solid var(--black); border-radius: 50%; position: relative; margin-right: -6px; }
  .eyes b::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: var(--black); right: 5px; bottom: 7px; }
  .title { display: flex; flex-direction: column; line-height: .98; margin: 6px 0 26px; }
  .title span { font-size: clamp(2.6rem, 8.5vw, 4.9rem); color: var(--ink-blue); }
  .title .t1 { text-shadow: 5px 5px 0 var(--yellow); }
  .title .t2 { text-shadow: 5px 5px 0 #ff9b3d; }
  .tapes { display: flex; flex-wrap: wrap; gap: 14px 18px; max-width: 360px; }
  .tape { position: relative; display: inline-block; padding: 7px 20px; color: #fff; font-weight: 800; font-size: .95rem; text-decoration: none; transform: rotate(-2deg); transition: transform .15s; }
  .tape:nth-child(even) { transform: rotate(1.5deg); }
  .tape:hover { transform: rotate(0) scale(1.06); }
  .tape.pink { background: var(--pink); } .tape.blue { background: var(--blue); } .tape.red { background: var(--red); }
  .tape.green { background: #2fd35a; color: var(--black); }
  .tape::before, .tape::after { content: ''; position: absolute; width: 20px; height: 9px; background: rgba(255,255,255,.9); }
  .tape::before { left: -8px; top: -3px; transform: rotate(-38deg); }
  .tape::after { right: -8px; bottom: -3px; transform: rotate(-38deg); }

  .hero-right { min-height: 340px; display: grid; place-items: center; }
  .bubble { position: absolute; top: 4px; left: 4%; background: var(--black); color: #fff; font-family: 'Bagel Fat One', sans-serif; font-size: 1.9rem; padding: 8px 26px; border-radius: 50px; z-index: 4; }
  .bubble::after { content: ''; position: absolute; bottom: -13px; left: 34px; border: 14px solid transparent; border-top-color: var(--black); border-bottom: 0; }
  .device { position: relative; width: min(100%, 300px); aspect-ratio: 1 / 1.05; margin-top: 42px; background: var(--pink); border-radius: 30px; padding: 26px; transform: rotate(7deg); box-shadow: 12px 12px 0 #b3175f; }
  .bezel { background: #c9c7cd; border-radius: 18px; padding: 14px; height: 100%; border: 3px solid #2a2530; }
  .screen { height: 100%; border-radius: 10px; border: 3px solid #2a2530; display: grid; place-content: center; justify-items: center; gap: 8px; background: var(--cream) radial-gradient(rgba(255,46,147,.25) 1.5px, transparent 1.5px) 0 0 / 12px 12px; }
  #heroCat { font-size: 5rem; line-height: 1; animation: bob 2.4s ease-in-out infinite; }
  @keyframes bob { 50% { transform: translateY(-8px); } }
  .readout { display: flex; align-items: center; gap: 7px; font-size: .78rem; font-weight: 800; color: #17131a; }
  .readout i { width: 10px; height: 10px; border-radius: 50%; background: var(--cyan); }
  .readout i:nth-child(2) { background: var(--pink); } .readout i:nth-child(3) { background: var(--red); }
  .star { position: absolute; background: var(--yellow); width: 58px; height: 58px; top: -22px; right: 18px;
    clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
  .star.g { background: var(--green); width: 40px; height: 40px; top: 4px; left: -16px; }
  .stk { position: absolute; font-size: 2.2rem; line-height: 1; }
  .stk.bolt { bottom: -14px; left: -34px; transform: rotate(-10deg); }
  .stk.rainbow { bottom: 70px; right: -28px; }
  .stk.cat { bottom: -10px; right: 14px; }
  .seal { position: absolute; left: 0; bottom: 6px; width: 92px; height: 92px; border-radius: 50%; background: var(--pink); color: #fff; display: grid; place-items: center; text-align: center; font-weight: 800; font-size: .74rem; line-height: 1.15; transform: rotate(-14deg); border: 3px solid #17131a; }

  /* Abas */
  .tab-bar { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
  .tab-btn { background: transparent; color: #fff; border: 2px solid #fff; border-radius: 2px; padding: 8px 20px; font-weight: 800; font-size: .95rem; cursor: pointer; transform: rotate(-1deg); }
  .tab-btn:nth-child(2) { transform: rotate(1deg); }
  .tab-btn:hover { border-color: var(--pink); color: var(--pink); }
  .tab-btn.active { background: var(--yellow); border-color: var(--yellow); color: var(--black); }
  .tab-content { display: none; } .tab-content.active { display: block; }

  /* Botões em adesivo */
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
  .btn-cat { background: var(--pink); color: #fff; border: 2px solid var(--black); border-radius: 999px; padding: 9px 18px; font-weight: 800; font-size: .88rem; cursor: pointer; box-shadow: 3px 3px 0 #fff; transition: transform .12s, box-shadow .12s; }
  .btn-cat:nth-child(5n+2) { background: var(--yellow); color: var(--black); }
  .btn-cat:nth-child(5n+3) { background: var(--cyan); color: var(--black); }
  .btn-cat:nth-child(5n+4) { background: var(--green); color: var(--black); }
  .btn-cat:nth-child(5n+5) { background: var(--blue); }
  .btn-cat:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 #fff; }
  .btn-cat:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #fff; }
  .btn-cat.on { background: #fff; color: var(--black); }

  .fact-box { position: relative; display: flex; gap: 12px; background: var(--yellow); color: var(--black); font-weight: 600; padding: 14px 22px; margin-bottom: 26px; transform: rotate(-.6deg); }
  .fact-box::before { content: ''; position: absolute; left: -10px; top: -4px; width: 28px; height: 11px; background: rgba(255,255,255,.9); transform: rotate(-35deg); }

  /* Tradutor */
  .translator-box { background: var(--panel); border: 2px dashed var(--yellow); padding: 18px; margin-bottom: 30px; display: grid; gap: 10px; }
  .translator-box label { font-weight: 800; color: var(--yellow); }
  .translator-box input { width: 100%; padding: 12px 14px; background: var(--bg); border: 2px solid var(--line); color: #fff; font: inherit; }
  .translator-box input:focus { outline: none; border-color: var(--yellow); }
  .translated-result { font-family: 'Bagel Fat One', sans-serif; font-size: 1.3rem; color: var(--pink); min-height: 1.6em; }

  /* Títulos de seção */
  .section-title { display: flex; align-items: center; gap: 12px; font-family: 'Bagel Fat One', sans-serif; font-size: 1.8rem; color: var(--pink); margin: 40px 0 20px; padding-bottom: 10px; border-bottom: 2px dashed var(--line); scroll-margin-top: 16px; }
  .section-title .n { color: #fff; font-size: 1.2rem; background: var(--blue); padding: 0 10px; transform: rotate(-3deg); }
  .section-title::after { content: ''; margin-left: auto; margin-right: 26px; width: 14px; height: 14px; border-radius: 50%; background: var(--cyan); box-shadow: 24px 0 0 var(--red); flex: none; }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
  .gauge-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }

  /* Cards com quinas */
  .card, .gauge { position: relative; background: var(--panel); border: 2px solid var(--pink); padding: 18px 20px; }
  .card::before, .gauge::before { content: ''; position: absolute; inset: -5px; pointer-events: none;
    background: linear-gradient(var(--pink), var(--pink)) 0 0 / 9px 9px no-repeat, linear-gradient(var(--pink), var(--pink)) 100% 0 / 9px 9px no-repeat,
      linear-gradient(var(--pink), var(--pink)) 0 100% / 9px 9px no-repeat, linear-gradient(var(--pink), var(--pink)) 100% 100% / 9px 9px no-repeat; }
  .card { display: flex; flex-direction: column; gap: 4px; }
  .card .label { font-size: .85rem; color: var(--muted); font-weight: 700; }
  .card .value { font-size: 1.15rem; font-weight: 800; word-break: break-word; }
  .card .highlight { color: var(--yellow); }
  .card .sub { font-size: .8rem; color: var(--muted); word-break: break-all; }
  .card .mood-text { font-family: 'Bagel Fat One', sans-serif; font-size: 1.3rem; color: var(--yellow); }

  .gauge { display: flex; align-items: center; gap: 20px; }
  .gauge h3 { font-size: 1.3rem; }
  .gauge p { color: var(--muted); font-size: .9rem; }
  .gauge .detail { color: var(--yellow); font-weight: 800; margin-top: 6px; }
  .ring { position: relative; width: 132px; height: 132px; flex: none; }
  .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .ring circle { fill: none; stroke-width: 13; }
  .ring .track { stroke: var(--line); }
  .ring .fill { stroke: var(--cyan); stroke-linecap: round; stroke-dasharray: ${CIRC.toFixed(1)}; transition: stroke-dashoffset .8s ease, stroke .4s; }
  .ring .fill.warn { stroke: var(--yellow); } .ring .fill.hot { stroke: var(--red); }
  .ring .center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
  .ring .num { font-size: 1.9rem; line-height: 1; }
  .ring .mood { font-size: 1.1rem; margin-top: 4px; }

  /* Patas */
  .cores { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
  .core { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; background: var(--panel); border: 2px solid var(--cyan); padding: 12px 14px; }
  .core .name { font-size: .85rem; color: var(--muted); font-weight: 700; }
  .bar { height: 10px; background: var(--line); }
  .bar-fill { height: 100%; background: linear-gradient(90deg, var(--pink), var(--yellow)); transition: width .6s ease; }
  .core-pct { font-weight: 800; font-size: .85rem; min-width: 3.2ch; text-align: right; }

  /* Novelo */
  .yarn-playground { background: var(--panel); border: 3px dashed var(--pink); padding: 44px 24px; text-align: center; display: grid; justify-items: center; gap: 14px; min-height: 300px; align-content: center; }
  .yarn-playground h2 { font-size: 2rem; color: var(--pink); text-shadow: 3px 3px 0 var(--yellow); }
  .yarn-playground p { color: var(--muted); }
  .yarn-ball-big { font-size: 88px; line-height: 1; background: none; border: 0; cursor: pointer; transition: transform .25s cubic-bezier(.3, 1.6, .5, 1); }
  .yarn-ball-big:hover { transform: scale(1.12) rotate(14deg); }
  .yarn-ball-big:active { transform: scale(.92) rotate(-16deg); }
  .yarn-count { font-family: 'Bagel Fat One', sans-serif; font-size: 1.3rem; color: var(--yellow); }

  /* Efeitos */
  .paw-print { position: absolute; font-size: 24px; pointer-events: none; animation: fadePaw 1s forwards; z-index: 9999; }
  @keyframes fadePaw { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.5); } }
  .treat-rain { position: fixed; top: -30px; font-size: 26px; pointer-events: none; z-index: 9998; animation: fallDown 2s linear forwards; }
  @keyframes fallDown { from { transform: translateY(0) rotate(0); opacity: 1; } to { transform: translateY(105vh) rotate(360deg); opacity: 0; } }

  #boxText { background: #3a2a1d; border: 4px dashed #9a6a35; text-align: center; padding: 70px 20px; }
  #boxText h2 { font-size: 2rem; color: var(--yellow); }
  #boxText p { margin-top: 8px; color: #e6cfb5; }

  footer { margin-top: 44px; text-align: center; color: var(--muted); font-size: .85rem; }
  footer p { padding: 16px 20px 24px; }

  @media (max-width: 760px) {
    .hero-body { grid-template-columns: 1fr; padding: 28px 20px 40px; }
    .hero-right { min-height: 380px; } .seal { display: none; }
    .gauge { flex-direction: column; text-align: center; }
  }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
</style>
</head>
<body>
  <main class="page" id="mainContainer">
    <section class="hero">
      ${marquee}
      <div class="hero-body">
        <div class="hero-left">
          <div class="top-row">
            <div class="dots"><i></i><i></i><i></i></div>
            <span class="status"><i></i> Toca ativa</span>
          </div>
          <div class="eyes" aria-hidden="true"><b></b><b></b></div>
          <h1 class="title"><span class="t1">MeowNitor</span><span class="t2">perfeito</span></h1>
          <div class="tapes">
            <a class="tape pink" href="#s-gauges" onclick="switchTab('dashboard')">Memória</a>
            <a class="tape green" href="#s-cores" onclick="switchTab('dashboard')">CPU</a>
            <a class="tape blue" href="#s-net" onclick="switchTab('dashboard')">Rede</a>
            <a class="tape red" href="#s-card" onclick="switchTab('dashboard')">Carteirinha</a>
          </div>
        </div>
        <div class="hero-right" aria-hidden="true">
          <div class="bubble">Miau!</div>
          <div class="device">
            <span class="star"></span><span class="star g"></span>
            <div class="bezel"><div class="screen">
              <span id="heroCat">😺</span>
              <div class="readout"><i></i><i></i><i></i><span id="heroStats">RAM 0% · CPU 0%</span></div>
            </div></div>
            <span class="stk bolt">⚡</span><span class="stk rainbow">🌈</span><span class="stk cat">🐾</span>
          </div>
          <div class="seal">100%<br>gato<br>design</div>
        </div>
      </div>
      ${marquee}
    </section>

    <div class="tab-bar" role="tablist">
      <button class="tab-btn active" role="tab" onclick="switchTab('dashboard')">📊 Painel do servidor</button>
      <button class="tab-btn" role="tab" onclick="switchTab('yarn')">🧶 Brincar com novelo</button>
    </div>

    <div class="actions">
      <button class="btn-cat" onclick="playMeow()">🔊 Pedir miau</button>
      <button class="btn-cat" onclick="newFact()">💡 Fato felino</button>
      <button class="btn-cat" onclick="togglePurr()" id="purrBtn">💤 Ativar ronronar</button>
      <button class="btn-cat" onclick="feedCat()">🐟 Dar petisco</button>
      <button class="btn-cat" onclick="boxMode()" id="boxBtn">📦 Entrar na caixa</button>
    </div>

    <div class="fact-box" id="factBox">
      <span>🐾</span><span><strong>Fato felino:</strong> Gatos passam cerca de 70% da vida dormindo!</span>
    </div>

    <!-- ABA 1 -->
    <div id="dashboardTab" class="tab-content active">
      <div class="translator-box">
        <label for="humanInput">🗣️ Miau-tradutor: humano para felino</label>
        <input type="text" id="humanInput" placeholder="Digite algo para o gato entender..." oninput="translateToMeow()">
        <div class="translated-result" id="meowResult">Miau? 🐱</div>
      </div>

      <div id="monitorContent">
        <div class="section-title" id="s-gauges"><span class="n">#1</span> Apetite e ronronar</div>
        <div class="gauge-grid">
          <div class="gauge">
            <div class="ring">
              <svg viewBox="0 0 132 132" aria-hidden="true">
                <circle class="track" cx="66" cy="66" r="54"/>
                <circle class="fill" id="ramRing" cx="66" cy="66" r="54" style="stroke-dashoffset:${offset(s.memUsagePercent)}"/>
              </svg>
              <div class="center"><span class="num" id="ramPct">${s.memUsagePercent}%</span><span class="mood" id="ramMood">😺</span></div>
            </div>
            <div>
              <h3>Pote de ração</h3>
              <p>Memória RAM</p>
              <p class="detail" id="ramText">${s.usedMem} MB de ${s.totalMem} MB</p>
            </div>
          </div>

          <div class="gauge">
            <div class="ring">
              <svg viewBox="0 0 132 132" aria-hidden="true">
                <circle class="track" cx="66" cy="66" r="54"/>
                <circle class="fill" id="cpuRing" cx="66" cy="66" r="54" style="stroke-dashoffset:${offset(s.loadPercent)}"/>
              </svg>
              <div class="center"><span class="num" id="cpuPct">${s.loadPercent}%</span><span class="mood" id="cpuMood">😸</span></div>
            </div>
            <div>
              <h3>Nível de agitação</h3>
              <p>Uso da CPU agora</p>
              <p class="detail">Média de 1 min: <span id="loadAvg">${s.loadAvg}</span></p>
            </div>
          </div>

          ${s.disk ? `<div class="gauge">
            <div class="ring">
              <svg viewBox="0 0 132 132" aria-hidden="true">
                <circle class="track" cx="66" cy="66" r="54"/>
                <circle class="fill" id="diskRing" cx="66" cy="66" r="54" style="stroke-dashoffset:${offset(s.disk.percent)}"/>
              </svg>
              <div class="center"><span class="num" id="diskPct">${s.disk.percent}%</span><span class="mood" id="diskMood">😺</span></div>
            </div>
            <div>
              <h3>Caixa de areia</h3>
              <p>Espaço em disco</p>
              <p class="detail" id="diskText">${s.disk.usedGB} GB de ${s.disk.totalGB} GB</p>
            </div>
          </div>` : ''}
        </div>

        <div class="grid" style="margin-top:16px">
          <div class="card">
            <span class="label">Humor do gato agora</span>
            <span class="mood-text" id="moodText">😺 Brincando</span>
          </div>
          <div class="card">
            <span class="label">Petisco atual (RAM do Node)</span>
            <span class="value highlight" id="processMem">${s.processMem} MB</span>
          </div>
          <div class="card">
            <span class="label">Barriga cheia (RAM total do Node)</span>
            <span class="value" id="rss">${s.rss} MB</span>
          </div>
          <div class="card">
            <span class="label">Estoque de petiscos (RAM livre)</span>
            <span class="value" id="freeMem">${s.freeMem} MB</span>
          </div>
          <div class="card">
            <span class="label">Tempo acordado (servidor)</span>
            <span class="value" id="uptime">${s.uptime}</span>
          </div>
          <div class="card">
            <span class="label">Idade do gatinho (app rodando há)</span>
            <span class="value" id="procUptime">${s.processUptime}</span>
          </div>
        </div>

        <div class="section-title" id="s-cores"><span class="n">#2</span> Patas em ação</div>
        <div class="cores">
          ${s.cores.map((u, i) => `<div class="core"><span class="name">Pata ${i + 1}</span><div class="bar"><div class="bar-fill" id="core${i}" style="width:${u}%"></div></div><span class="core-pct" id="corePct${i}">${u}%</span></div>`).join('')}
        </div>

        <div class="section-title"><span class="n">#3</span> Rotina do gato</div>
        <div class="grid">
          <div class="card">
            <span class="label">Agitação agora</span>
            <span class="value highlight" id="load1">${s.load1}</span>
          </div>
          <div class="card">
            <span class="label">Agitação nos últimos 5 min</span>
            <span class="value" id="load5">${s.load5}</span>
          </div>
          <div class="card">
            <span class="label">Agitação nos últimos 15 min</span>
            <span class="value" id="load15">${s.load15}</span>
          </div>
          <div class="card">
            <span class="label">Hora na toca</span>
            <span class="value" id="clock">${s.serverTime}</span>
          </div>
          <div class="card" style="grid-column: 1 / -1">
            <span class="label">O que o gato costuma fazer agora</span>
            <span class="value highlight" id="routine"></span>
          </div>
        </div>

        <div class="section-title"><span class="n">#4</span> Cérebro e músculos</div>
        <div class="grid">
          <div class="card" style="grid-column: 1 / -1">
            <span class="label">Modelo do cérebro</span>
            <span class="value">${cpus[0] ? cpus[0].model : 'Gato misterioso'}</span>
          </div>
          <div class="card">
            <span class="label">Patas e garras</span>
            <span class="value">${cpus.length} núcleos</span>
          </div>
          <div class="card">
            <span class="label">Frequência</span>
            <span class="value">${cpus[0] ? cpus[0].speed : 'N/A'} MHz</span>
          </div>
        </div>

        <div class="section-title"><span class="n">#5</span> Território felino</div>
        <div class="grid">
          <div class="card">
            <span class="label">Nome da toca</span>
            <span class="value highlight">${os.hostname()}</span>
          </div>
          <div class="card">
            <span class="label">IP local</span>
            <span class="value">${getLocalIP()}</span>
          </div>
          <div class="card">
            <span class="label">Humano de estimação</span>
            <span class="value">${os.userInfo().username}</span>
          </div>
          <div class="card">
            <span class="label">Cama favorita (pasta pessoal)</span>
            <span class="value" style="font-size:0.95rem">${os.homedir()}</span>
          </div>
        </div>

        <div class="section-title" id="s-net"><span class="n">#6</span> Gatoeiras (rede)</div>
        <div class="grid">
          ${nets.map((n) => `<div class="card"><span class="label">${n.name}${n.internal ? ' · só dentro de casa' : ' · porta para a rua'}</span><span class="value">${n.address}</span><span class="sub">MAC ${n.mac}</span></div>`).join('')}
        </div>

        <div class="section-title" id="s-card"><span class="n">#7</span> Carteirinha do gato</div>
        <div class="grid">
          <div class="card">
            <span class="label">Raça (sistema operacional)</span>
            <span class="value">${os.type()} ${os.release()}</span>
          </div>
          <div class="card">
            <span class="label">Pelagem (arquitetura)</span>
            <span class="value">${os.arch()}</span>
          </div>
          <div class="card">
            <span class="label">Dialeto (versão do Node)</span>
            <span class="value">${process.version}</span>
          </div>
          <div class="card">
            <span class="label">Coleira (PID do app)</span>
            <span class="value">${process.pid}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ABA 2 -->
    <div id="yarnTab" class="tab-content">
      <div class="yarn-playground">
        <h2>🧶 Cantinho do novelo</h2>
        <p>Clique no novelo para dar patadas e fazê-lo rolar.</p>
        <button class="yarn-ball-big" id="yarnBig" onclick="rollYarn()" aria-label="Dar patada no novelo">🧶</button>
        <div class="yarn-count">Patadas dadas: <span id="yarnClicks">0</span> 🐾</div>
      </div>
    </div>

    <footer>
      ${marquee}
      <p>Feito com 🐾 · Clique em qualquer lugar para deixar uma pegada de gato</p>
    </footer>
  </main>

<script>
  const CIRC = ${CIRC.toFixed(1)};

  // Pegada ao clicar
  document.addEventListener('click', (e) => {
    if (e.target.closest('button, input')) return;
    const paw = document.createElement('div');
    paw.className = 'paw-print';
    paw.innerText = '🐾';
    paw.style.left = (e.pageX - 12) + 'px';
    paw.style.top = (e.pageY - 12) + 'px';
    document.body.appendChild(paw);
    setTimeout(() => paw.remove(), 1000);
  });

  // Abas
  function switchTab(tab) {
    const tabs = ['dashboard', 'yarn'];
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', tabs[i] === tab));
    document.getElementById('dashboardTab').classList.toggle('active', tab === 'dashboard');
    document.getElementById('yarnTab').classList.toggle('active', tab === 'yarn');
  }

  // Novelo
  let yarnCount = 0;
  function rollYarn() {
    yarnCount++;
    document.getElementById('yarnClicks').innerText = yarnCount;
    playMeow();
  }

  // Fatos
  const catFacts = [
    "Gatos passam cerca de 70% da vida dormindo!",
    "O miado foi desenvolvido quase exclusivamente para se comunicar com humanos.",
    "Um gato pode pular até 6 vezes a sua própria altura!",
    "O nariz de cada gato tem uma textura única, assim como a digital humana.",
    "Gatos têm 32 músculos em cada orelha para ouvir tudo em 360 graus.",
    "Gatos não conseguem sentir o gosto de coisas doces!",
    "O ronronar de um gato pode ter frequências que ajudam na regeneração óssea."
  ];
  function newFact() {
    const f = catFacts[Math.floor(Math.random() * catFacts.length)];
    document.getElementById('factBox').innerHTML = '<span>🐾</span><span><strong>Fato felino:</strong> ' + f + '</span>';
  }

  // Chuva de petiscos
  function feedCat() {
    const treats = ['🐟', '🐠', '🦐', '🥩', '🥛'];
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const t = document.createElement('div');
        t.className = 'treat-rain';
        t.innerText = treats[Math.floor(Math.random() * treats.length)];
        t.style.left = Math.random() * 95 + 'vw';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
      }, i * 80);
    }
  }

  // Miau-tradutor
  function translateToMeow() {
    const text = document.getElementById('humanInput').value.trim();
    const out = document.getElementById('meowResult');
    if (!text) { out.innerText = 'Miau? 🐱'; return; }
    const meows = ['miau', 'meow', 'mmiiiau', 'purr', 'miau!'];
    out.innerText = text.split(/\\s+/).map(() => meows[Math.floor(Math.random() * meows.length)]).join(' ') + ' 🐱🐾';
  }

  // Áudio (um único contexto, reutilizado)
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Ronronar: tom grave modulado, audível em qualquer alto-falante
  let purr = null;
  function togglePurr() {
    const btn = document.getElementById('purrBtn');
    if (!purr) {
      const c = ctx();
      const osc = c.createOscillator();
      const lfo = c.createOscillator();
      const depth = c.createGain();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 70;
      lfo.frequency.value = 24;
      depth.gain.value = 0.09;
      gain.gain.value = 0.1;
      lfo.connect(depth);
      depth.connect(gain.gain);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(); lfo.start();
      purr = { osc, lfo };
      btn.innerText = '🔊 Parar ronronar';
      btn.classList.add('on');
    } else {
      purr.osc.stop(); purr.lfo.stop();
      purr = null;
      btn.innerText = '💤 Ativar ronronar';
      btn.classList.remove('on');
    }
  }

  // Caixa
  let inBox = false;
  function boxMode() {
    const container = document.getElementById('mainContainer');
    const parts = container.querySelectorAll('.tab-bar, .fact-box, .tab-content, .actions > .btn-cat:not(#boxBtn)');
    inBox = !inBox;
    parts.forEach(el => el.style.display = inBox ? 'none' : '');
    container.classList.toggle('box-mode', inBox);
    document.getElementById('boxBtn').innerText = inBox ? '🐾 Sair da caixa' : '📦 Entrar na caixa';
    const old = document.getElementById('boxText');
    if (old) old.remove();
    if (inBox) {
      const d = document.createElement('div');
      d.id = 'boxText';
      d.innerHTML = '<h2>📦 Se cabe, eu sento!</h2><p>O gato se escondeu confortavelmente na caixa de papelão.</p>';
      container.insertBefore(d, container.querySelector('footer'));
    }
  }

  // Miado sintetizado
  function playMeow() {
    const c = ctx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    const pitch = 500 + Math.random() * 200;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, c.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.8, c.currentTime + 0.4);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.4);
  }

  // Anéis com cor e humor conforme o uso
  function setRing(id, pctId, moodId, pct, moods) {
    const ring = document.getElementById(id);
    ring.style.strokeDashoffset = (CIRC * (1 - pct / 100)).toFixed(1);
    ring.classList.toggle('warn', pct >= 60 && pct < 85);
    ring.classList.toggle('hot', pct >= 85);
    document.getElementById(pctId).innerText = pct + '%';
    document.getElementById(moodId).innerText = pct >= 85 ? moods[2] : pct >= 60 ? moods[1] : moods[0];
  }
  setRing('ramRing', 'ramPct', 'ramMood', ${s.memUsagePercent}, ['😺', '😼', '🙀']);
  setRing('cpuRing', 'cpuPct', 'cpuMood', ${s.loadPercent}, ['😸', '😾', '🙀']);

  // Dados extras: patas, rotina, disco, humor
  const INITIAL = ${JSON.stringify(s)};
  const byId = (id) => document.getElementById(id);
  function routine(h) {
    if (h >= 5 && h < 11) return '🐟 Pedir o café da manhã e miar na cara do humano';
    if (h >= 11 && h < 18) return '😴 Cochilar em um raio de sol';
    if (h >= 18 && h < 23) return '🔦 Caçar o ponto de laser pela casa';
    return '🌙 Corrida maluca pela casa às 3 da manhã';
  }
  function applyExtra(d) {
    d.cores.forEach((u, i) => {
      const bar = byId('core' + i);
      if (bar) { bar.style.width = u + '%'; byId('corePct' + i).innerText = u + '%'; }
    });
    byId('load1').innerText = d.load1;
    byId('load5').innerText = d.load5;
    byId('load15').innerText = d.load15;
    byId('procUptime').innerText = d.processUptime;
    byId('rss').innerText = d.rss + ' MB';
    byId('freeMem').innerText = d.freeMem + ' MB';
    byId('clock').innerText = d.serverTime;
    byId('routine').innerText = routine(d.hour);
    const peak = Math.max(d.memUsagePercent, d.loadPercent);
    const mood = peak >= 85 ? '🙀 Miando alto, socorro!' : peak >= 70 ? '😼 Caçando sem parar' : peak >= 40 ? '😺 Brincando animado' : '😴 Cochilando no sol';
    byId('moodText').innerText = mood;
    byId('heroCat').innerText = mood.split(' ')[0];
    byId('heroStats').innerText = 'RAM ' + d.memUsagePercent + '% · CPU ' + d.loadPercent + '%';
    if (d.disk && byId('diskRing')) {
      setRing('diskRing', 'diskPct', 'diskMood', d.disk.percent, ['😺', '😼', '🙀']);
      byId('diskText').innerText = d.disk.usedGB + ' GB de ' + d.disk.totalGB + ' GB';
    }
  }
  applyExtra(INITIAL);

  // Atualização em tempo real
  async function updateStats() {
    if (inBox) return;
    try {
      const d = await (await fetch('/api/stats')).json();
      setRing('ramRing', 'ramPct', 'ramMood', d.memUsagePercent, ['😺', '😼', '🙀']);
      setRing('cpuRing', 'cpuPct', 'cpuMood', d.loadPercent, ['😸', '😾', '🙀']);
      document.getElementById('ramText').innerText = d.usedMem + ' MB de ' + d.totalMem + ' MB';
      document.getElementById('processMem').innerText = d.processMem + ' MB';
      document.getElementById('loadAvg').innerText = d.loadAvg;
      document.getElementById('uptime').innerText = d.uptime;
      applyExtra(d);
    } catch (e) {
      console.error(e);
    }
  }
  setInterval(updateStats, 3000);
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor felino rodando na porta ${PORT} 🐱`));