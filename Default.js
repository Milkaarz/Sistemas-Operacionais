const express = require('express');
const os = require('os');

const app = express();

app.get('/', (req, res) => {
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monitor de Sistema</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        body {
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
        }

        .container {
          width: 100%;
          max-width: 800px;
          background: #1e293b;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          border: 1px solid #334155;
        }

        header {
          margin-bottom: 28px;
          text-align: center;
        }

        header h1 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #38bdf8;
          letter-spacing: -0.5px;
        }

        header p {
          color: #94a3b8;
          font-size: 0.95rem;
          margin-top: 6px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .card {
          background: #0f172a;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #334155;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .card .label {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          font-weight: 600;
        }

        .card .value {
          font-size: 1.4rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: #334155;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #38bdf8, #818cf8);
          border-radius: 999px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>Monitor de Sistema</h1>
          <p>Métricas do Servidor em Tempo Real</p>
        </header>

        <div class="grid">
          <div class="card">
            <span class="label">Hostname</span>
            <span class="value">${os.hostname()}</span>
          </div>

          <div class="card">
            <span class="label">Plataforma / Arquitetura</span>
            <span class="value">${os.platform()} (${os.arch()})</span>
          </div>

          <div class="card">
            <span class="label">Processadores (CPUs)</span>
            <span class="value">${os.cpus().length} Núcleos</span>
          </div>

          <div class="card">
            <span class="label">Uptime do Sistema</span>
            <span class="value">${Math.round(os.uptime() / 60)} min</span>
          </div>

          <div class="card" style="grid-column: span 1 / -1;">
            <span class="label">Uso de Memória RAM</span>
            <span class="value">${usedMem} MB / ${totalMem} MB (${memUsagePercent}%)</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${memUsagePercent}%;"></div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));