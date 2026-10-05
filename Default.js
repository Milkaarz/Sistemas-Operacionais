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
      <title>MeowNitor Interativo Deluxe 🐾</title>
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

        /* Bolinha de Lã que segue o mouse */
        #yarnBall {
          position: fixed;
          font-size: 26px;
          pointer-events: none;
          z-index: 9999;
          transition: transform 0.15s ease-out;
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

        .interactive-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .btn-cat {
          background-color: #2a2321;
          color: #FFBFB3;
          border: 1.5px solid #FFBFB3;
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-cat:hover {
          background-color: #FFBFB3;
          color: #181414;
          transform: scale(1.05);
        }

        /* Caixa de Miau-Tradução */
        .translator-box {
          background: #2a2321;
          border: 1px solid #3d312e;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .translator-box input {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #3d312e;
          background: #181414;
          color: #ffffff;
          font-size: 0.9rem;
          outline: none;
        }

        .translator-box input:focus {
          border-color: #FFBFB3;
        }

        .translated-result {
          color: #FFBFB3;
          font-weight: bold;
          font-size: 1rem;
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

        /* Animações de Petiscos caindo */
        .treat-rain {
          position: fixed;
          top: -30px;
          font-size: 24px;
          pointer-events: none;
          z-index: 9998;
          animation: fallDown 2s linear forwards;
        }

        @keyframes fallDown {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
        }

        /* Visual da Caixa de Papelão */
        .box-mode {
          background: #3b2c21 !important;
          border: 4px dashed #8b5a2b !important;
          text-align: center;
          padding: 50px 20px !important;
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
      <div id="yarnBall">🧶</div>

      <div class="container" id="mainContainer">
        <header>
          <h1>🐱 MeowNitor Deluxe</h1>
          <span style="color: #FFBFB3; font-weight: 700; font-size: 0.9rem;">
            <span class="live-dot"></span> Toca Ativa
          </span>
        </header>

        <!-- Barra de Brinquedos Felinos -->
        <div class="interactive-bar">
          <button class="btn-cat" onclick="playMeow()">🔊 Pedir Miau</button>
          <button class="btn-cat" onclick="togglePurr()" id="purrBtn">💤 Activar Purr (Ronronar)</button>
          <button class="btn-cat" onclick="feedCat()">🐟 Dar Petisco</button>
          <button class="btn-cat" onclick="boxMode()">📦 Entrar na Caixa</button>
        </div>

        <!-- Miau-Tradutor -->
        <div class="translator-box">
          <label style="font-size: 0.85rem; color: #FFBFB3; font-weight: 700;">🗣️ Miau-Tradutor Humano ➔ Felino:</label>
          <input type="text" id="humanInput" placeholder="Digite algo para o gato entender..." oninput="translateToMeow()">
          <div class="translated-result" id="meowResult">Miau? 🐱</div>
        </div>

        <div id="monitorContent">
          <div class="section-title">🥣 Apetite e Ronronar do Sistema</div>
          <div class="grid">
            <div class="card full-width">
              <span class="label">🐟 Pote de Ração (Memória RAM)</span>
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
              <span class="label">Nível de Agitação (CPU)</span>
              <span class="value highlight" id="loadAvg">${os.loadavg()[0].toFixed(2)}</span>
            </div>

            <div class="card">
              <span class="label">Tempo Acordado</span>
              <span class="value" id="uptime">${formatUptime(os.uptime())}</span>
            </div>
          </div>

          <div class="section-title">🧠 Cérebro e Músculos Felinos</div>
          <div class="grid">
            <div class="card full-width">
              <span class="label">Modelo do Cérebro</span>
              <span class="value">${cpus[0] ? cpus[0].model : 'Gato Misterioso'}</span>
            </div>

            <div class="card">
              <span class="label">Patas e Garras</span>
              <span class="value">${cpus.length} Núcleos</span>
            </div>

            <div class="card">
              <span class="label">Frequência</span>
              <span class="value">${cpus[0] ? cpus[0].speed : 'N/A'} MHz</span>
            </div>
          </div>

          <div class="section-title">🏠 Território Felino</div>
          <div class="grid">
            <div class="card">
              <span class="label">Nome da Toca</span>
              <span class="value highlight">${os.hostname()}</span>
            </div>

            <div class="card">
              <span class="label">IP Local</span>
              <span class="value">${getLocalIP()}</span>
            </div>

            <div class="card">
              <span class="label">Humano de Estimação</span>
              <span class="value">${os.userInfo().username}</span>
            </div>
          </div>
        </div>

        <footer>
          <p>Feito com 🐾 | Brinque com a bolinha de lã! 🧶</p>
        </footer>
      </div>

      <script>
        // 1. Bolinha de Lã Perguidora
        const yarn = document.getElementById('yarnBall');
        document.addEventListener('mousemove', (e) => {
          yarn.style.transform = \`translate(\${e.clientX + 10}px, \${e.clientY + 10}px)\`;
        });

        // 2. Chuva de Petiscos (Alimentar Gato)
        function feedCat() {
          const treats = ['🐟', '🐠', '🦐', '🥩', '🥛'];
          for(let i = 0; i < 20; i++) {
            setTimeout(() => {
              const treat = document.createElement('div');
              treat.className = 'treat-rain';
              treat.innerText = treats[Math.floor(Math.random() * treats.length)];
              treat.style.left = Math.random() * 95 + 'vw';
              document.body.appendChild(treat);
              setTimeout(() => treat.remove(), 2000);
            }, i * 80);
          }
        }

        // 3. Miau-Tradutor
        function translateToMeow() {
          const text = document.getElementById('humanInput').value.trim();
          if(!text) {
            document.getElementById('meowResult').innerText = "Miau? 🐱";
            return;
          }
          const words = text.split(' ');
          const meows = ['miau', 'meow', 'mmiiiau', 'purr', 'miau!'];
          const translated = words.map(() => meows[Math.floor(Math.random() * meows.length)]).join(' ');
          document.getElementById('meowResult').innerText = translated + ' 🐱🐾';
        }

        // 4. Som Continuo de Ronronar (Audio Context Purr)
        let purrCtx = null;
        let isPurring = false;
        function togglePurr() {
          const btn = document.getElementById('purrBtn');
          if(!isPurring) {
            purrCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = purrCtx.createOscillator();
            const gain = purrCtx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(28, purrCtx.currentTime); // Frequência baixa de ronronar
            
            gain.gain.setValueAtTime(0.08, purrCtx.currentTime);
            
            osc.connect(gain);
            gain.connect(purrCtx.destination);
            osc.start();
            
            btn.innerText = "🔊 Parar Ronronar";
            btn.style.backgroundColor = "#FFBFB3";
            btn.style.color = "#181414";
            isPurring = true;
          } else {
            if(purrCtx) purrCtx.close();
            btn.innerText = "💤 Activar Purr (Ronronar)";
            btn.style.backgroundColor = "#2a2321";
            btn.style.color = "#FFBFB3";
            isPurring = false;
          }
        }

        // 5. Entrar na Caixa
        let inBox = false;
        function boxMode() {
          const container = document.getElementById('mainContainer');
          const content = document.getElementById('monitorContent');
          inBox = !inBox;
          if(inBox) {
            content.style.display = 'none';
            container.classList.add('box-mode');
            const boxDiv = document.createElement('div');
            boxDiv.id = 'boxText';
            boxDiv.innerHTML = '<h2 style="color: #FFBFB3;">📦 Se eu quibo, eu sento!</h2><p style="margin-top:10px;">O gato se escondeu confortavelmente na caixa de papelão.</p>';
            container.appendChild(boxDiv);
          } else {
            document.getElementById('boxText').remove();
            container.classList.remove('box-mode');
            content.style.display = 'block';
          }
        }

        // Sintetizador de Miau
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

        // Atualização dos dados em tempo real
        async function updateStats() {
          if(inBox) return;
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
app.listen(PORT, () => console.log(`Servidor felino deluxe rodando na porta ${PORT} 🐱`));