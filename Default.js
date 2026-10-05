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
  const offset = (p) => (CIRC * (1 - p / 100)).toFixed(1);

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MeowNitor Perfeito 🐾</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #14110f;
    --surface: #1d1816;
    --surface-2: #261f1c;
    --line: #3a2e29;
    --text: #f6ebe3;
    --muted: #b5a199;
    --peach: #ffbfb3;
    --peach-soft: rgba(255, 191, 179, 0.12);
    --mint: #9fe3c4;
    --butter: #ffd98e;
    --danger: #ff8a7a;
    --radius: 22px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { color-scheme: dark; }
  body {
    font-family: 'Nunito', 'Segoe UI', sans-serif;
    background: var(--bg);
    background-image:
      radial-gradient(700px 400px at 12% -5%, rgba(255, 191, 179, 0.10), transparent 70%),
      radial-gradient(600px 400px at 100% 100%, rgba(159, 227, 196, 0.06), transparent 70%);
    background-attachment: fixed;
    color: var(--text);
    min-height: 100vh;
    padding: 56px 20px 40px;
    line-height: 1.5;
    overflow-x: hidden;
  }
  h1, h2, h3, .num { font-family: 'Fredoka', 'Nunito', sans-serif; }
  button { font-family: inherit; }
  :focus-visible { outline: 3px solid var(--peach); outline-offset: 3px; }

  .container {
    position: relative;
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 32px;
    padding: 36px;
    box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.7);
  }
  /* Orelhas de gato */
  .container::before, .container::after {
    content: '';
    position: absolute;
    top: -26px;
    width: 64px;
    height: 64px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 6px 22px 0 22px;
    z-index: -1;
  }
  .container::before { left: 52px; transform: rotate(-12deg) skew(-8deg); }
  .container::after { right: 52px; transform: rotate(12deg) skew(8deg) scaleX(-1); }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 26px;
  }
  .brand { display: flex; align-items: center; gap: 14px; }
  .logo {
    width: 52px; height: 52px;
    display: grid; place-items: center;
    font-size: 28px;
    background: var(--peach-soft);
    border: 1px solid rgba(255, 191, 179, 0.3);
    border-radius: 18px;
  }
  .brand h1 { font-size: 1.7rem; font-weight: 600; line-height: 1.1; letter-spacing: -0.01em; }
  .brand p { color: var(--muted); font-size: 0.9rem; }

  .status {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(159, 227, 196, 0.1);
    border: 1px solid rgba(159, 227, 196, 0.3);
    color: var(--mint);
    font-weight: 700; font-size: 0.88rem;
    padding: 7px 14px;
    border-radius: 999px;
  }
  .status i {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--mint);
    box-shadow: 0 0 0 0 rgba(159, 227, 196, 0.6);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    70% { box-shadow: 0 0 0 9px rgba(159, 227, 196, 0); }
    100% { box-shadow: 0 0 0 0 rgba(159, 227, 196, 0); }
  }

  /* Abas */
  .tab-bar {
    display: inline-flex;
    gap: 4px;
    padding: 5px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 16px;
    margin-bottom: 20px;
  }
  .tab-btn {
    background: transparent; color: var(--muted);
    border: 0; border-radius: 12px;
    padding: 9px 18px;
    font-size: 0.95rem; font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { background: var(--peach); color: #2a1a16; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Ações */
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .btn-cat {
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--line);
    padding: 9px 16px;
    border-radius: 999px;
    font-size: 0.88rem; font-weight: 700;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
  }
  .btn-cat:hover { border-color: var(--peach); background: var(--peach-soft); }
  .btn-cat:active { transform: scale(0.96); }
  .btn-cat.on { background: var(--peach); color: #2a1a16; border-color: var(--peach); }

  .fact-box {
    display: flex; gap: 12px; align-items: flex-start;
    background: var(--peach-soft);
    border: 1px solid rgba(255, 191, 179, 0.22);
    border-radius: 16px;
    padding: 14px 18px;
    margin-bottom: 22px;
    color: #ffe6e0;
    font-size: 0.95rem;
  }

  /* Tradutor */
  .translator-box {
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 18px;
    margin-bottom: 26px;
    display: grid; gap: 10px;
  }
  .translator-box label { font-weight: 700; font-size: 0.92rem; color: var(--peach); }
  .translator-box input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }
  .translator-box input:focus { outline: none; border-color: var(--peach); box-shadow: 0 0 0 3px var(--peach-soft); }
  .translated-result { font-family: 'Fredoka', sans-serif; font-size: 1.15rem; color: var(--butter); min-height: 1.6em; }

  .section-title {
    font-size: 1.15rem; font-weight: 600;
    margin: 30px 0 14px;
    display: flex; align-items: center; gap: 10px;
  }
  .section-title::after { content: ''; flex: 1; height: 1px; background: var(--line); }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
  .card {
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 18px 20px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .card .label { font-size: 0.88rem; color: var(--muted); font-weight: 600; }
  .card .value { font-size: 1.15rem; font-weight: 700; word-break: break-word; }
  .card .highlight { color: var(--peach); }

  /* Anéis (gauges) */
  .gauge-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
  .gauge {
    display: flex; align-items: center; gap: 20px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 26px;
    padding: 22px;
  }
  .ring { position: relative; width: 132px; height: 132px; flex: none; }
  .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .ring circle { fill: none; stroke-width: 11; stroke-linecap: round; }
  .ring .track { stroke: var(--bg); }
  .ring .fill { stroke: var(--peach); stroke-dasharray: ${CIRC.toFixed(1)}; transition: stroke-dashoffset 0.8s ease, stroke 0.4s; }
  .ring .fill.warn { stroke: var(--butter); }
  .ring .fill.hot { stroke: var(--danger); }
  .ring .center {
    position: absolute; inset: 0;
    display: grid; place-content: center; text-align: center;
  }
  .ring .num { font-size: 1.9rem; font-weight: 600; line-height: 1; }
  .ring .mood { font-size: 1.1rem; margin-top: 4px; }
  .gauge h3 { font-size: 1.05rem; font-weight: 600; }
  .gauge p { color: var(--muted); font-size: 0.9rem; }
  .gauge .detail { color: var(--text); font-weight: 700; margin-top: 6px; }

  /* Patas, rotina e rede */
  .cores { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
  .core {
    display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
    background: var(--surface-2); border: 1px solid var(--line);
    border-radius: 16px; padding: 12px 14px;
  }
  .core .name { font-size: 0.85rem; color: var(--muted); font-weight: 600; }
  .bar { height: 8px; background: var(--bg); border-radius: 999px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, var(--peach), var(--butter)); border-radius: 999px; transition: width 0.6s ease; }
  .core-pct { font-weight: 700; font-size: 0.85rem; min-width: 3.2ch; text-align: right; }
  .card .sub { font-size: 0.8rem; color: var(--muted); word-break: break-all; }
  .card .mood-text { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; color: var(--butter); }

  /* Novelo */
  .yarn-playground {
    background: var(--surface-2);
    border: 2px dashed rgba(255, 191, 179, 0.4);
    border-radius: 26px;
    padding: 44px 24px;
    text-align: center;
    display: grid; justify-items: center; gap: 14px;
    min-height: 300px; align-content: center;
  }
  .yarn-playground h2 { font-weight: 600; font-size: 1.5rem; }
  .yarn-playground p { color: var(--muted); }
  .yarn-ball-big {
    font-size: 88px; line-height: 1;
    background: none; border: 0; cursor: pointer;
    transition: transform 0.25s cubic-bezier(.3, 1.6, .5, 1);
  }
  .yarn-ball-big:hover { transform: scale(1.12) rotate(14deg); }
  .yarn-ball-big:active { transform: scale(0.92) rotate(-16deg); }
  .yarn-count { font-family: 'Fredoka', sans-serif; font-size: 1.2rem; color: var(--peach); }

  /* Efeitos */
  .paw-print { position: absolute; font-size: 24px; pointer-events: none; animation: fadePaw 1s forwards; z-index: 9999; }
  @keyframes fadePaw { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.5); } }
  .treat-rain { position: fixed; top: -30px; font-size: 26px; pointer-events: none; z-index: 9998; animation: fallDown 2s linear forwards; }
  @keyframes fallDown { from { transform: translateY(0) rotate(0); opacity: 1; } to { transform: translateY(105vh) rotate(360deg); opacity: 0; } }

  .box-mode { background: #3a2a1d !important; border: 3px dashed #9a6a35 !important; text-align: center; padding: 70px 20px !important; }
  .box-mode::before, .box-mode::after { display: none; }
  #boxText h2 { font-weight: 600; color: var(--butter); }
  #boxText p { margin-top: 8px; color: #e6cfb5; }

  footer { margin-top: 34px; text-align: center; color: var(--muted); font-size: 0.85rem; }

  @media (max-width: 560px) {
    body { padding-top: 44px; }
    .container { padding: 24px 18px; border-radius: 26px; }
    .gauge { flex-direction: column; text-align: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
  <main class="container" id="mainContainer">
    <header>
      <div class="brand">
        <div class="logo" aria-hidden="true">🐱</div>
        <div>
          <h1>MeowNitor Perfeito</h1>
          <p>O painel do seu servidor, versão felina</p>
        </div>
      </div>
      <span class="status"><i></i> Toca ativa</span>
    </header>

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
        <div class="section-title">🥣 Apetite e ronronar do sistema</div>
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

        <div class="section-title">🐾 Patas em ação</div>
        <div class="cores">
          ${s.cores.map((u, i) => `<div class="core"><span class="name">Pata ${i + 1}</span><div class="bar"><div class="bar-fill" id="core${i}" style="width:${u}%"></div></div><span class="core-pct" id="corePct${i}">${u}%</span></div>`).join('')}
        </div>

        <div class="section-title">🕰️ Rotina do gato</div>
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

        <div class="section-title">🧠 Cérebro e músculos felinos</div>
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

        <div class="section-title">🏠 Território felino</div>
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

        <div class="section-title">🚪 Gatoeiras (placas de rede)</div>
        <div class="grid">
          ${nets.map((n) => `<div class="card"><span class="label">${n.name}${n.internal ? ' · só dentro de casa' : ' · porta para a rua'}</span><span class="value">${n.address}</span><span class="sub">MAC ${n.mac}</span></div>`).join('')}
        </div>

        <div class="section-title">🏷️ Carteirinha do gato</div>
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

    <footer>Feito com 🐾 · Clique em qualquer lugar para deixar uma pegada de gato</footer>
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
    byId('moodText').innerText = peak >= 85 ? '🙀 Miando alto, socorro!' : peak >= 70 ? '😼 Caçando sem parar' : peak >= 40 ? '😺 Brincando animado' : '😴 Cochilando no sol';
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