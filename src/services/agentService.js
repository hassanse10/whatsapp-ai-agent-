const db = require('../config/database');
const logger = require('../utils/logger');

// Get user's agent config
const getAgentConfig = async (userId) => {
  try {
    const result = await db.query(
      `SELECT id, user_id, agent_name, language, tone, response_style,
              system_prompt_override, whatsapp_phone_number, whatsapp_status,
              created_at, updated_at
       FROM user_agents
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getAgentConfig', { error: error.message });
    throw error;
  }
};

// Update agent config
const updateAgentConfig = async (userId, agentId, {
  agentName,
  language,
  tone,
  responseStyle,
  systemPromptOverride,
}) => {
  try {
    const result = await db.query(
      `UPDATE user_agents
       SET agent_name = COALESCE($2, agent_name),
           language = COALESCE($3, language),
           tone = COALESCE($4, tone),
           response_style = COALESCE($5, response_style),
           system_prompt_override = COALESCE($6, system_prompt_override),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $7
       RETURNING id, user_id, agent_name, language, tone, response_style,
                 system_prompt_override, whatsapp_phone_number, whatsapp_status`,
      [agentId, agentName, language, tone, responseStyle, systemPromptOverride, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Agent not found');
    }

    logger.info('Agent config updated', { userId, agentId });

    return result.rows[0];
  } catch (error) {
    logger.error('Error in updateAgentConfig', { error: error.message });
    throw error;
  }
};

// Update WhatsApp status
const updateWhatsAppStatus = async (userId, agentId, status, phoneNumber = null) => {
  try {
    const result = await db.query(
      `UPDATE user_agents
       SET whatsapp_status = $2,
           whatsapp_phone_number = COALESCE($3, whatsapp_phone_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $4
       RETURNING whatsapp_status, whatsapp_phone_number`,
      [agentId, status, phoneNumber, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Agent not found');
    }

    logger.info('WhatsApp status updated', { userId, agentId, status });

    return result.rows[0];
  } catch (error) {
    logger.error('Error in updateWhatsAppStatus', { error: error.message });
    throw error;
  }
};

// Build system prompt from language, tone, and style
const buildSystemPrompt = (language, tone, responseStyle) => {
  let basePrompt = `أنت وكيل خدمة عملاء ذكي وودود.`;

  const toneDescriptions = {
    professional: 'إجابات احترافية واحترام تام',
    friendly: 'أسلوب دافئ وودود وطبيعي',
    casual: 'أسلوب غير رسمي وحر وودود',
  };

  const styleDescriptions = {
    concise: 'إجابات قصيرة ومباشرة جداً',
    detailed: 'إجابات شاملة مع تفاصيل كاملة',
    humorous: 'إجابات بها فكاهة وطرافة خفيفة',
  };

  basePrompt += `\n\nالأسلوب: ${toneDescriptions[tone] || toneDescriptions.professional}`;
  basePrompt += `\nالردود: ${styleDescriptions[responseStyle] || styleDescriptions.concise}`;

  if (language === 'english') {
    basePrompt = `You are a smart and friendly customer service agent.`;
    basePrompt += `\n\nStyle: ${toneDescriptions[tone] === toneDescriptions.professional ? 'Professional' : toneDescriptions[tone]}`;
    basePrompt += `\nResponses: ${styleDescriptions[responseStyle] === styleDescriptions.concise ? 'Concise and direct' : styleDescriptions[responseStyle]}`;
  } else if (language === 'french') {
    basePrompt = `Vous êtes un agent de service clientèle intelligent et amical.`;
    basePrompt += `\n\nStyle: ${toneDescriptions[tone]}`;
    basePrompt += `\nRéponses: ${styleDescriptions[responseStyle]}`;
  }

  return basePrompt;
};

module.exports = {
  getAgentConfig,
  updateAgentConfig,
  updateWhatsAppStatus,
  buildSystemPrompt,
};
