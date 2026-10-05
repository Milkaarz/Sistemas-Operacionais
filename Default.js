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

// Rota de API JSON para atualização em tempo real
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
      <title>MeowNitor Ultra 🐾</title>
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
          margin-bottom: 24px;
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

        header .status-badge {
          background-color: rgba(255, 191, 179, 0.12);
          color: #FFBFB3;
          border: 1.5px solid #FFBFB3;
          padding: 8px 18px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
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

        footer {
          margin-top: 30px;
          text-align: center;
          color: #a3908c;
          font-size: 0.85rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🐱 MeowNitor Ultra</h1>
          <span class="status-badge"><span class="live-dot"></span> Ao Vivo (Auto 3s)</span>
        </header>

        <div class="section-title">⚡ Desempenho e Memória</div>
        <div class="grid">
          <div class="card full-width">
            <span class="label">🥣 Consumo de Memória RAM</span>
            <span class="value highlight" id="ramText">${usedMem} MB / ${totalMem} MB (${memUsagePercent}%)</span>
            <div class="progress-bar">
              <div class="progress-fill" id="ramBar" style="width: ${memUsagePercent}%;"></div>
            </div>
          </div>

          <div class="card">
            <span class="label">📊 Uso da Aplicação (Process Heap)</span>
            <span class="value highlight" id="processMem">${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</span>
          </div>

          <div class="card">
            <span class="label">⚡ Carga Média CPU (1m)</span>
            <span class="value highlight" id="loadAvg">${os.loadavg()[0].toFixed(2)}</span>
          </div>

          <div class="card">
            <span class="label">⏰ Uptime do Sistema</span>
            <span class="value" id="uptime">${formatUptime(os.uptime())}</span>
          </div>

          <div class="card">
            <span class="label">🚀 LIGADO DESDE</span>
            <span class="value" style="font-size: 0.9rem;">${bootTime}</span>
          </div>
        </div>

        <div class="section-title">🧠 Especificações do Hardware</div>
        <div class="grid">
          <div class="card full-width">
            <span class="label">🐟 Modelo da CPU</span>
            <span class="value">${cpus[0] ? cpus[0].model : 'N/A'}</span>
          </div>

          <div class="card">
            <span class="label">🐾 Núcleos / Threads</span>
            <span class="value">${cpus.length} Núcleos</span>
          </div>

          <div class="card">
            <span class="label">💨 Frequência Base</span>
            <span class="value">${cpus[0] ? cpus[0].speed : 'N/A'} MHz</span>
          </div>

          <div class="card">
            <span class="label">⚙️ Arquitetura</span>
            <span class="value">${os.arch()}</span>
          </div>

          <div class="card">
            <span class="label">Endianness</span>
            <span class="value">${os.endianness()}</span>
          </div>
        </div>

        <div class="section-title">🌐 Sistema e Rede</div>
        <div class="grid">
          <div class="card">
            <span class="label">🏠 Hostname</span>
            <span class="value highlight">${os.hostname()}</span>
          </div>

          <div class="card">
            <span class="label">🌐 IP Local (IPv4)</span>
            <span class="value">${getLocalIP()}</span>
          </div>

          <div class="card">
            <span class="label">👤 Usuário</span>
            <span class="value">${os.userInfo().username}</span>
          </div>

          <div class="card">
            <span class="label">💻 Sistema Operacional</span>
            <span class="value">${os.platform()} (${os.type()})</span>
          </div>

          <div class="card">
            <span class="label">🐧 Versão Kernel</span>
            <span class="value" style="font-size: 0.95rem;">${os.release()}</span>
          </div>

          <div class="card">
            <span class="label">🟢 Node.js</span>
            <span class="value highlight">${process.version}</span>
          </div>

          <div class="card">
            <span class="label">🆔 Process ID (PID)</span>
            <span class="value">${process.pid}</span>
          </div>
        </div>

        <footer>
          <p>Feito com 🐾 | Atualizando em tempo real a cada 3 segundos</p>
        </footer>
      </div>

      <script>
        // Script client-side para recarregar informações sem F5
        async function updateStats() {
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('ramText').innerText = \`\${data.usedMem} MB / \${data.totalMem} MB (\${data.memUsagePercent}%)\`;
            document.getElementById('ramBar').style.width = \`\${data.memUsagePercent}%\`;
            document.getElementById('processMem').innerText = \`\${data.processMem} MB\`;
            document.getElementById('loadAvg').innerText = data.loadAvg;
            document.getElementById('uptime').innerText = data.uptime;
          } catch (e) {
            console.error('Erro ao atualizar dados:', e);
          }
        }

        setInterval(updateStats, 3000);
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT} 🐱`));