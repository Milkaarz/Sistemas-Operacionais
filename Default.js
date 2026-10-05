const express = require('express');
const os = require('os');

const app = express();

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

app.get('/', (req, res) => {
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);
  
  const cpuModel = os.cpus()[0] ? os.cpus()[0].model : 'N/A';
  const userInfo = os.userInfo().username;
  const homeDir = os.homedir();
  const networkInterfaces = Object.keys(os.networkInterfaces()).length;

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MeowNitor de Sistema 🐾</title>
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
          max-width: 900px;
          background: #211c1b;
          border-radius: 28px;
          padding: 36px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.7);
          border: 2px solid #332826;
          position: relative;
        }

        /* Orelhas de Gato no topo do container */
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
          margin-bottom: 32px;
          border-bottom: 2px dashed #3a2e2b;
          padding-bottom: 20px;
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
          gap: 6px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .card {
          background: #2a2321;
          padding: 22px;
          border-radius: 20px;
          border: 1px solid #3d312e;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .card:hover {
          transform: translateY(-3px);
          border-color: #FFBFB3;
        }

        .card .label {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #d1beba;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .card .value {
          font-size: 1.3rem;
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

        .progress-container {
          position: relative;
          margin-top: 12px;
        }

        .progress-bar {
          width: 100%;
          height: 14px;
          background-color: #3d312e;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFBFB3, #ffdcd5);
          border-radius: 999px;
          transition: width 0.4s ease;
        }

        footer {
          margin-top: 28px;
          text-align: center;
          color: #a3908c;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🐱 MeowNitor de Sistema</h1>
          <span class="status-badge"><span>🐾</span> Ronronando Perfeitamente</span>
        </header>

        <div class="grid">
          <!-- Servidor e Usuário -->
          <div class="card">
            <span class="label">🏠 Hostname</span>
            <span class="value highlight">${os.hostname()}</span>
          </div>

          <div class="card">
            <span class="label">👤 Humano Responsável</span>
            <span class="value">${userInfo}</span>
          </div>

          <!-- Sistema e Arquitetura -->
          <div class="card">
            <span class="label">💻 Sistema Operacional</span>
            <span class="value">${os.platform()} (${os.type()})</span>
          </div>

          <div class="card">
            <span class="label">⚙️ Arquitetura</span>
            <span class="value">${os.arch()}</span>
          </div>

          <!-- Processador -->
          <div class="card full-width">
            <span class="label">🐟 Cérebro do Gato (CPU)</span>
            <span class="value">${cpuModel} (${os.cpus().length} Núcleos)</span>
          </div>

          <!-- Tempo Ativo e Rede -->
          <div class="card">
            <span class="label">⏰ Tempo Sem Sesta (Uptime)</span>
            <span class="value">${formatUptime(os.uptime())}</span>
          </div>

          <div class="card">
            <span class="label">🌐 Antenas de Rede</span>
            <span class="value">${networkInterfaces} Conexões</span>
          </div>

          <!-- Diretório Root -->
          <div class="card full-width">
            <span class="label">📦 Toca Principal (Home)</span>
            <span class="value" style="font-size: 1rem; font-family: monospace; color: #ffdcd5;">${homeDir}</span>
          </div>

          <!-- Uso de Memória -->
          <div class="card full-width">
            <span class="label">🥣 Pote de Ração (Memória RAM)</span>
            <span class="value highlight">${usedMem} MB <span style="color: #ffffff; font-size: 1rem;">/ ${totalMem} MB (${memUsagePercent}% consumido)</span></span>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${memUsagePercent}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <footer>
          <p>Feito com 🐾 para amantes de felinos e servidores!</p>
        </footer>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor felino rodando na porta ${PORT} 🐱`));