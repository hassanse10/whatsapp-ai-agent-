const express = require('express');
const { requireAuth } = require('../middleware/auth');
const agentService = require('../services/agentService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/agents/me - Get current user's agent config
router.get('/me', requireAuth, async (req, res) => {
  try {
    const agent = await agentService.getAgentConfig(req.userId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.status(200).json({ agent });
  } catch (error) {
    logger.error('Error fetching agent config', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/agents/:agentId - Update agent config
router.put('/:agentId', requireAuth, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { agentName, language, tone, responseStyle, systemPromptOverride } = req.body;

    // Validate language
    const validLanguages = ['darija', 'english', 'french', 'arabic'];
    if (language && !validLanguages.includes(language)) {
      return res.status(400).json({ error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` });
    }

    // Validate tone
    const validTones = ['professional', 'friendly', 'casual'];
    if (tone && !validTones.includes(tone)) {
      return res.status(400).json({ error: `Invalid tone. Must be one of: ${validTones.join(', ')}` });
    }

    // Validate response style
    const validStyles = ['concise', 'detailed', 'humorous'];
    if (responseStyle && !validStyles.includes(responseStyle)) {
      return res.status(400).json({ error: `Invalid response style. Must be one of: ${validStyles.join(', ')}` });
    }

    const agent = await agentService.updateAgentConfig(req.userId, agentId, {
      agentName,
      language,
      tone,
      responseStyle,
      systemPromptOverride,
    });

    logger.info('Agent config updated', { userId: req.userId, agentId });

    return res.status(200).json({ agent });
  } catch (error) {
    logger.error('Error updating agent config', { error: error.message });

    if (error.message === 'Agent not found') {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/:agentId/qr - Get QR code for WhatsApp
router.get('/:agentId/qr', requireAuth, async (req, res) => {
  try {
    const { agentId } = req.params;

    // This would integrate with WhatsApp Web.js QR code
    // For now, return a placeholder response
    res.status(200).json({
      message: 'QR code endpoint',
      agentId,
      note: 'In production, this would return the current QR code from WhatsApp Web.js',
    });
  } catch (error) {
    logger.error('Error getting QR code', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
