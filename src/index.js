require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const logger = require('./utils/logger');
const { testConnection } = require('./config/database');
const { createClient, getCurrentQR, getIsReady } = require('./services/whatsappClient');
const { processMessage } = require('./controllers/whatsappController');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // Required for Render/Heroku reverse proxy
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json());

// Live QR code page — open this in your browser to scan
app.get('/qr', async (req, res) => {
  const qr = getCurrentQR();
  const ready = getIsReady();

  if (ready) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#f0fff0">
        <h1 style="color:green">✅ WhatsApp Connected!</h1>
        <p>Your agent is live and ready to receive messages.</p>
      </body></html>
    `);
  }

  if (!qr) {
    return res.send(`
      <html><head><meta http-equiv="refresh" content="3"></head>
      <body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2>⏳ Waiting for QR code...</h2>
        <p>This page will refresh automatically.</p>
      </body></html>
    `);
  }

  const qrImage = await QRCode.toDataURL(qr, { width: 400 });
  res.send(`
    <html>
    <head><meta http-equiv="refresh" content="20"></head>
    <body style="font-family:sans-serif;text-align:center;padding:30px;background:#fff">
      <h2>📱 Scan with WhatsApp</h2>
      <img src="${qrImage}" style="border:4px solid #25D366;border-radius:12px"/>
      <p style="color:#666">Auto-refreshes every 20s &nbsp;|&nbsp;
        On your phone: <strong>WhatsApp → ⋮ → Linked Devices → Link a Device</strong>
      </p>
      <p style="color:#999;font-size:13px">If scanning fails, wait for the page to refresh and try again</p>
    </body></html>
  `);
});

app.get('/health', async (req, res) => {
  const dbOk = await testConnection().catch(() => false);
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    whatsapp: getIsReady() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'WhatsApp AI Agent', qr_page: `http://localhost:${PORT}/qr` });
});

// Admin: send a message (for testing)
app.post('/admin/send', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
  try {
    const { sendMessage } = require('./services/whatsappClient');
    await sendMessage(to, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  logger.info('🚀 Starting WhatsApp AI Agent...');

  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'sk-or-your-api-key-here') {
    logger.error('❌ OPENROUTER_API_KEY is not set in .env'); process.exit(1);
  }
  logger.info(`✅ OpenRouter — model: ${process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'}`);

  const dbOk = await testConnection();
  if (!dbOk) { logger.error('❌ Database connection failed'); process.exit(1); }

  app.listen(PORT, () => {
    logger.info(`✅ Server running — open http://localhost:${PORT}/qr to scan WhatsApp QR code`);
  });

  logger.info('📱 Initializing WhatsApp...');
  const whatsapp = createClient();
  whatsapp.on('message', processMessage);
  await whatsapp.initialize();
}

start();
process.on('SIGTERM', () => { logger.info('Shutting down...'); process.exit(0); });
process.on('SIGINT',  () => { logger.info('Shutting down...'); process.exit(0); });
