require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const { testConnection } = require('./config/database');
const sessionManager = require('./services/whatsappSessionManager');
const { processMessage } = require('./controllers/whatsappController');
const { verifyToken } = require('./services/authService');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json());

// ── SSE endpoint for real-time dashboard updates ──────────────────────────────
// Token is passed as query param because EventSource doesn't support custom headers
app.get('/api/events', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  let userId;
  try {
    const payload = verifyToken(token);
    userId = payload.userId;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });
  res.flushHeaders();

  // Send a heartbeat every 30s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); }
  }, 30000);

  sessionManager.addSseClient(userId, res);

  req.on('close', () => {
    clearInterval(heartbeat);
    sessionManager.removeSseClient(userId, res);
  });
});

// Legacy QR page (single-tenant compat — redirects to dashboard)
app.get('/qr', (req, res) => {
  res.redirect('/agent-config');
});

app.get('/health', async (req, res) => {
  const dbOk = await testConnection().catch(() => false);
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    activeSessions: require('./services/whatsappSessionManager').sessions?.size || 0,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'WhatsApp AI Agent — Multi-Tenant' });
});

// Admin: send a message (for testing)
app.post('/admin/send', requireAuth, async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
  try {
    await sessionManager.sendText(req.userId, to, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/agents',    require('./routes/agents'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
}

app.use((req, res) => {
  if (req.path.startsWith('/api')) res.status(404).json({ error: 'Not found' });
  else res.status(404).send('Not found');
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  logger.info('🚀 Starting WhatsApp AI Agent (Multi-Tenant)...');

  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'sk-or-your-api-key-here') {
    logger.error('❌ OPENROUTER_API_KEY is not set in .env'); process.exit(1);
  }
  logger.info(`✅ OpenRouter — model: ${process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'}`);

  const dbOk = await testConnection();
  if (!dbOk) { logger.error('❌ Database connection failed'); process.exit(1); }

  app.listen(PORT, () => {
    logger.info(`✅ Server running on http://localhost:${PORT}`);
  });

  // Restore WhatsApp sessions for users who were connected before this restart
  logger.info('📱 Restoring WhatsApp sessions...');
  try {
    await sessionManager.restoreSessions(processMessage);
  } catch (err) {
    logger.warn(`⚠️  Session restore failed: ${err.message}`);
  }
}

start();
process.on('SIGTERM', () => { logger.info('Shutting down...'); process.exit(0); });
process.on('SIGINT',  () => { logger.info('Shutting down...'); process.exit(0); });
