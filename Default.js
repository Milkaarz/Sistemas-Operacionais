const express = require('express');
const os = require('os');

const app = express();

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m ${secs}s`;
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

app.get('/api/stats', (req, res) => {
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);
  const processMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

  res.json({
    uptime: formatUptime(os.uptime()),
    loadAvg: os.loadavg()[0].toFixed(2),
    usedMem,
    freeMem,
    totalMem,
    memUsagePercent,
    processMem
  });
});

app.get('/', (req, res) => {
  const cpus = os.cpus();
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);
  const bootTime = new Date(Date.now() - os.uptime() * 1000).toLocaleString('pt-BR');

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MeowNitor Divertido 🐾</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
          background-color: #181414;
          background-image: radial-gradient(#261d1b 1px, transparent 1px);
          background-size: 20px 20px;
          color: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 24px;
          position: relative;
          overflow-x: hidden;
        }

        .container {
          width: 100%;
          max-width: 950px;
          background: #211c1b;
          border-radius: 28px;
          padding: 36px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.7);
          border: 2px solid #332826;
          position: relative;
          z-index: 10;
        }

        .container::before, .container::after {
          content: '';
          position: absolute;
          top: -24px;
          width: 0;
          height: 0;
          border-left: 25px solid transparent;
          border-right: 25px solid transparent;
          border-bottom: 25px solid #211c1b;
        }
        .container::before { left: 40px; }
        .container::after { right: 40px; }

        header {
          margin-bottom: 20px;
          border-bottom: 2px dashed #3a2e2b;
          padding-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        header h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #FFBFB3;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          background-color: #FFBFB3;
          border-radius: 50%;
          box-shadow: 0 0 10px #FFBFB3;
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Zona Interativa de Botões */
        .interactive-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .btn-cat {
          background-color: #2a2321;
          color: #FFBFB3;
          border: 1.5px solid #FFBFB3;
          padding: 10px 18px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-cat:hover {
          background-color: #FFBFB3;
          color: #181414;
          transform: scale(1.05);
        }

        /* Caixa de Curiosidade Felina */
        .fact-box {
          background: #2a2321;
          border-left: 4px solid #FFBFB3;
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 0.95rem;
          color: #ffdcd5;
        }

        .section-title {
          color: #FFBFB3;
          font-size: 1.1rem;
          margin: 20px 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          border-left: 4px solid #FFBFB3;
          padding-left: 10px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .card {
          background: #2a2321;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid #3d312e;
          display: flex;
          flex-direction: column;
          gap: 6px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .card:hover {
          transform: translateY(-3px);
          border-color: #FFBFB3;
        }

        .card .label {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #d1beba;
          font-weight: 700;
        }

        .card .value {
          font-size: 1.2rem;
          font-weight: 700;
          color: #ffffff;
          word-break: break-word;
        }

        .card .highlight {
          color: #FFBFB3;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background-color: #3d312e;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFBFB3, #ffdcd5);
          border-radius: 999px;
          transition: width 0.5s ease-in-out;
        }

        /* Efeito de Patinha ao clicar */
        .paw-print {
          position: absolute;
          font-size: 24px;
          pointer-events: none;
          animation: fadePaw 1s forwards;
          z-index: 999;
        }

        @keyframes fadePaw {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }

        footer {
          margin-top: 30px;
          text-align: center;
          color: #a3908c;
          font-size: 0.85rem;
        }
      </style>
    </head>
    <body>
      <div class="container" id="mainContainer">
        <header>
          <h1>🐱 MeowNitor Divertido</h1>
          <span style="color: #FFBFB3; font-weight: 700; font-size: 0.9rem;">
            <span class="live-dot"></span> Monitorando Toca
          </span>
        </header>

        <!-- Barra de Botões Divertidos -->
        <div class="interactive-bar">
          <button class="btn-cat" onclick="playMeow()">🔊 Pedir Miau!</button>
          <button class="btn-cat" onclick="newFact()">💡 Fato Felino Surpresa</button>
          <button class="btn-cat" onclick="toggleNap()">💤 Tirar Sesta</button>
        </div>

        <!-- Curiosidade Felina -->
        <div class="fact-box" id="factBox">
          🐾 <strong>Fato Felino:</strong> Gatos passam cerca de 70% da vida dormindo!
        </div>

        <div id="monitorContent">
          <div class="section-title">🥣 Apetite e Ronronar do Sistema</div>
          <div class="grid">
            <div class="card full-width">
              <span class="label">🐟 Pote de Ração (Memória RAM Geral)</span>
              <span class="value highlight" id="ramText">${usedMem} MB / ${totalMem} MB (${memUsagePercent}%)</span>
              <div class="progress-bar">
                <div class="progress-fill" id="ramBar" style="width: ${memUsagePercent}%;"></div>
              </div>
            </div>

            <div class="card">
              <span class="label">Petisco Atual (RAM Node)</span>
              <span class="value highlight" id="processMem">${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</span>
            </div>

            <div class="card">
              <span class="label">Nível de Agitação (Estresse CPU)</span>
              <span class="value highlight" id="loadAvg">${os.loadavg()[0].toFixed(2)}</span>
            </div>

            <div class="card">
              <span class="label">Tempo Sem Tirar Sesta</span>
              <span class="value" id="uptime">${formatUptime(os.uptime())}</span>
            </div>

            <div class="card">
              <span class="label">Acordou da Última Sesta</span>
              <span class="value" style="font-size: 0.9rem;">${bootTime}</span>
            </div>
          </div>

          <div class="section-title">🧠 Cérebro e Músculos Felinos</div>
          <div class="grid">
            <div class="card full-width">
              <span class="label">Modelo do Cérebro (CPU)</span>
              <span class="value">${cpus[0] ? cpus[0].model : 'Gato Misterioso'}</span>
            </div>

            <div class="card">
              <span class="label">Garras e Patas (Núcleos)</span>
              <span class="value">${cpus.length} Patinhas Ativas</span>
            </div>

            <div class="card">
              <span class="label">Velocidade dos Corredores</span>
              <span class="value">${cpus[0] ? cpus[0].speed : 'N/A'} MHz</span>
            </div>

            <div class="card">
              <span class="label">Anatomia (Arquitetura)</span>
              <span class="value">${os.arch()}</span>
            </div>
          </div>

          <div class="section-title">🏠 Território e Registro do Felino</div>
          <div class="grid">
            <div class="card">
              <span class="label">Nome da Toca (Hostname)</span>
              <span class="value highlight">${os.hostname()}</span>
            </div>

            <div class="card">
              <span class="label">Endereço Secreto (IP Local)</span>
              <span class="value">${getLocalIP()}</span>
            </div>

            <div class="card">
              <span class="label">Humano de Estimação</span>
              <span class="value">${os.userInfo().username}</span>
            </div>

            <div class="card">
              <span class="label">Raça do Sistema (OS)</span>
              <span class="value">${os.platform()} (${os.type()})</span>
            </div>
          </div>
        </div>

        <footer>
          <p>Feito com 🐾 | Clique na tela para deixar pegadas!</p>
        </footer>
      </div>

      <script>
        // 1. Áudio de Miau via Web Audio API (sem arquivos de áudio)
        function playMeow() {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          const pitch = 500 + Math.random() * 200;
          osc.frequency.setValueAtTime(pitch, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, ctx.currentTime + 0.15);
          osc.frequency.exponentialRampToValueAtTime(pitch * 0.8, ctx.currentTime + 0.4);

          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }

        // 2. Curiosidades Felinas
        const catFacts = [
          "Gatos passam cerca de 70% da vida dormindo!",
          "O miado foi desenvolvido quase exclusivamente para se comunicar com humanos.",
          "Um gato pode pular até 6 vezes a sua própria altura!",
          "O nariz de cada gato tem uma pegada única, assim como a digital humana.",
          "Gatos têm 32 músculos em cada orelha para ouvir tudo em 360 graus."
        ];

        function newFact() {
          const randomFact = catFacts[Math.floor(Math.random() * catFacts.length)];
          document.getElementById('factBox').innerHTML = '🐾 <strong>Fato Felino:</strong> ' + randomFact;
        }

        // 3. Efeito de Sesta (Oculta o Monitor)
        let napping = false;
        function toggleNap() {
          const content = document.getElementById('monitorContent');
          napping = !napping;
          if (napping) {
            content.style.display = 'none';
            document.getElementById('factBox').innerHTML = '💤 <strong>O gato está dormindo...</strong> Clique em "Tirar Sesta" novamente para acordá-lo!';
          } else {
            content.style.display = 'block';
            newFact();
          }
        }

        // 4. Efeito Visual de Pegada ao Clicar
        document.addEventListener('click', (e) => {
          const paw = document.createElement('div');
          paw.className = 'paw-print';
          paw.innerText = '🐾';
          paw.style.left = (e.pageX - 12) + 'px';
          paw.style.top = (e.pageY - 12) + 'px';
          document.body.appendChild(paw);
          setTimeout(() => paw.remove(), 1000);
        });

        // Atualização em Tempo Real
        async function updateStats() {
          if (napping) return;
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('ramText').innerText = \`\${data.usedMem} MB / \${data.totalMem} MB (\${data.memUsagePercent}%)\`;
            document.getElementById('ramBar').style.width = \`\${data.memUsagePercent}%\`;
            document.getElementById('processMem').innerText = \`\${data.processMem} MB\`;
            document.getElementById('loadAvg').innerText = data.loadAvg;
            document.getElementById('uptime').innerText = data.uptime;
          } catch (e) {
            console.error(e);
          }
        }

        setInterval(updateStats, 3000);
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor felino divertido rodando na porta ${PORT} 🐱`));