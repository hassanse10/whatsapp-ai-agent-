const express = require('express');
const { requireAuth } = require('../middleware/auth');
const agentService = require('../services/agentService');
const sessionManager = require('../services/whatsappSessionManager');
const { processMessage } = require('../controllers/whatsappController');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/agents/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const agent = await agentService.getAgentConfig(req.userId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Attach live session status (in-memory is authoritative)
    agent.whatsapp_status = sessionManager.getStatus(req.userId);

    return res.status(200).json({ agent });
  } catch (error) {
    logger.error('Error fetching agent config', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/agents/:agentId
router.put('/:agentId', requireAuth, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { agentName, language, tone, responseStyle, systemPromptOverride } = req.body;

    const validLanguages = ['darija', 'english', 'french', 'arabic'];
    if (language && !validLanguages.includes(language))
      return res.status(400).json({ error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` });

    const validTones = ['professional', 'friendly', 'casual'];
    if (tone && !validTones.includes(tone))
      return res.status(400).json({ error: `Invalid tone. Must be one of: ${validTones.join(', ')}` });

    const validStyles = ['concise', 'detailed', 'humorous'];
    if (responseStyle && !validStyles.includes(responseStyle))
      return res.status(400).json({ error: `Invalid response style. Must be one of: ${validStyles.join(', ')}` });

    if (systemPromptOverride && systemPromptOverride.length > 16000) {
      return res.status(400).json({ error: 'System prompt override must be 16,000 characters or fewer' });
    }

    const agent = await agentService.updateAgentConfig(req.userId, agentId, {
      agentName, language, tone, responseStyle, systemPromptOverride,
    });

    logger.info('Agent config updated', { userId: req.userId, agentId });
    return res.status(200).json({ agent });
  } catch (error) {
    logger.error('Error updating agent config', { error: error.message });
    if (error.message === 'Agent not found') return res.status(404).json({ error: 'Agent not found' });
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/:agentId/qr — start session if needed, return current QR or status
router.get('/:agentId/qr', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const status = sessionManager.getStatus(userId);

    if (status === 'connected') {
      return res.status(200).json({ status: 'connected', qrCode: null });
    }

    // Create session if not already running
    if (!sessionManager.getSession(userId)) {
      sessionManager.createSession(userId, processMessage);
    }

    // If QR is already available, return it immediately
    const qrImage = await sessionManager.getQR(userId);
    if (qrImage) {
      return res.status(200).json({ status: 'scanning', qrCode: qrImage });
    }

    // Session is initializing — tell client to listen on SSE for the QR
    return res.status(200).json({
      status: 'pending',
      message: 'Session is starting. Listen on /api/events for the QR code.',
      qrCode: null,
    });
  } catch (error) {
    logger.error('Error getting QR', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/agents/:agentId/connect — (re)start a session for this user
router.post('/:agentId/connect', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const existing = sessionManager.getSession(userId);
    if (existing?.isReady) {
      return res.status(200).json({ status: 'connected', message: 'Already connected' });
    }
    if (!existing) {
      sessionManager.createSession(userId, processMessage);
    }
    return res.status(200).json({ status: 'pending', message: 'Session starting — watch /api/events for status updates' });
  } catch (error) {
    logger.error('Error connecting session', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/agents/:agentId/disconnect
router.delete('/:agentId/disconnect', requireAuth, async (req, res) => {
  try {
    await sessionManager.destroySession(req.userId);
    logger.info('Session disconnected', { userId: req.userId });
    return res.status(200).json({ status: 'disconnected' });
  } catch (error) {
    logger.error('Error disconnecting session', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
