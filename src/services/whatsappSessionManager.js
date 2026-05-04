const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const logger = require('../utils/logger');
const db = require('../config/database');

// Per-user session state
// Map<userId, { client, currentQR, isReady, status }>
const sessions = new Map();

// SSE response streams per user
// Map<userId, Set<res>>
const sseClients = new Map();

// ── SSE helpers ───────────────────────────────────────────────────────────────

const broadcastToUser = (userId, event) => {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (_) {}
  }
};

const addSseClient = (userId, res) => {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
};

const removeSseClient = (userId, res) => {
  sseClients.get(userId)?.delete(res);
};

// ── DB + broadcast helpers ────────────────────────────────────────────────────

const updateStatus = async (userId, status) => {
  const session = sessions.get(userId);
  if (session) session.status = status;
  try {
    await db.query(
      `UPDATE user_agents SET whatsapp_status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [status, userId]
    );
  } catch (err) {
    logger.error('Failed to update whatsapp_status in DB', { userId, status, error: err.message });
  }
  broadcastToUser(userId, { type: 'whatsapp_status', status });
};

// ── Session creation ──────────────────────────────────────────────────────────

const createSession = (userId, onMessage) => {
  if (sessions.has(userId)) {
    logger.info('Session already exists', { userId });
    return sessions.get(userId);
  }

  logger.info('Creating WhatsApp session', { userId });

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: userId, dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-software-rasterizer',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--js-flags=--max-old-space-size=150',
      ],
    },
  });

  const sessionData = { client, currentQR: null, isReady: false, status: 'pending' };
  sessions.set(userId, sessionData);

  client.on('qr', async (qr) => {
    sessionData.currentQR = qr;
    sessionData.isReady = false;
    qrcode.generate(qr, { small: true });
    logger.info('QR generated', { userId });

    try {
      const qrImage = await QRCode.toDataURL(qr, { width: 300 });
      await db.query(
        `UPDATE user_agents
         SET qr_code = $1, whatsapp_status = 'scanning', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [qrImage, userId]
      );
      broadcastToUser(userId, { type: 'whatsapp_status', status: 'scanning', qrCode: qrImage });
    } catch (err) {
      logger.error('Failed to store QR in DB', { userId, error: err.message });
      broadcastToUser(userId, { type: 'whatsapp_status', status: 'scanning' });
    }
  });

  client.on('authenticated', () => {
    sessionData.currentQR = null;
    logger.info('WhatsApp authenticated', { userId });
    updateStatus(userId, 'authenticated');
  });

  client.on('auth_failure', () => {
    logger.error('WhatsApp auth failed', { userId });
    updateStatus(userId, 'disconnected');
    sessions.delete(userId);
  });

  client.on('ready', async () => {
    sessionData.isReady = true;
    sessionData.currentQR = null;
    logger.info('WhatsApp ready', { userId });
    try {
      await db.query(
        `UPDATE user_agents
         SET whatsapp_status = 'connected', qr_code = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );
    } catch (err) {
      logger.error('Failed to update status on ready', { userId, error: err.message });
    }
    sessionData.status = 'connected';
    broadcastToUser(userId, { type: 'whatsapp_status', status: 'connected' });
  });

  client.on('disconnected', async (reason) => {
    sessionData.isReady = false;
    logger.warn('WhatsApp disconnected', { userId, reason });
    sessions.delete(userId);
    await updateStatus(userId, 'disconnected');
  });

  // Bind userId in closure so the controller knows which user this message belongs to
  client.on('message', (msg) => onMessage(msg, userId));

  client.initialize().catch((err) => {
    logger.error('WhatsApp init failed', { userId, error: err.message });
    updateStatus(userId, 'disconnected');
    sessions.delete(userId);
  });

  return sessionData;
};

// ── Public API ────────────────────────────────────────────────────────────────

const getSession = (userId) => sessions.get(userId) || null;

const getQR = async (userId) => {
  const session = sessions.get(userId);
  if (!session?.currentQR) return null;
  return QRCode.toDataURL(session.currentQR, { width: 400 });
};

const getStatus = (userId) => sessions.get(userId)?.status || 'disconnected';

const isReady = (userId) => sessions.get(userId)?.isReady || false;

const destroySession = async (userId) => {
  const session = sessions.get(userId);
  if (session) {
    try { await session.client.destroy(); } catch (_) {}
    sessions.delete(userId);
  }
  await updateStatus(userId, 'disconnected');
};

const sendText = async (userId, phoneNumber, text) => {
  const session = sessions.get(userId);
  if (!session?.isReady) throw new Error('WhatsApp not connected for this user');
  const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
  return session.client.sendMessage(chatId, text);
};

const sendMedia = async (userId, phoneNumber, media, caption) => {
  const session = sessions.get(userId);
  if (!session?.isReady) throw new Error('WhatsApp not connected for this user');
  const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
  return session.client.sendMessage(chatId, media, { caption });
};

// Restore sessions for users who were connected/scanning before server restart
const restoreSessions = async (onMessage) => {
  try {
    const result = await db.query(
      `SELECT user_id FROM user_agents WHERE whatsapp_status IN ('connected', 'scanning')`
    );
    for (const row of result.rows) {
      logger.info('Restoring WhatsApp session', { userId: row.user_id });
      createSession(row.user_id, onMessage);
    }
    logger.info(`Restored ${result.rows.length} WhatsApp session(s)`);
  } catch (err) {
    logger.error('Failed to restore sessions', { error: err.message });
  }
};

module.exports = {
  createSession,
  getSession,
  getQR,
  getStatus,
  isReady,
  destroySession,
  sendText,
  sendMedia,
  restoreSessions,
  addSseClient,
  removeSseClient,
  broadcastToUser,
  getSessionCount: () => sessions.size,
};
