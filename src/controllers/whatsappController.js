const logger = require('../utils/logger');
const { generateRequestId, formatWhatsAppMessage } = require('../utils/helpers');
const customerModel = require('../models/customer');
const conversationModel = require('../models/conversation');
const claudeService = require('../services/claudeService');
const conversationService = require('../services/conversationService');
const flowManager = require('../agents/conversationFlowManager');
const { executeHandler } = require('../agents/intentHandlers');
const { ENABLE_ESCALATION } = require('../config/constants');
const productService = require('../services/productService');
const db = require('../config/database');

// userId is now bound in closure by whatsappSessionManager — no shared global needed
const processMessage = async (msg, userId) => {
  const requestId = generateRequestId();
  const from = msg.from;
  const body = msg.body;

  if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') return;
  if (msg.type !== 'chat') return;

  logger.info('Message received', { requestId, userId, from, body: body.substring(0, 80) });

  try {
    const customer = await customerModel.getOrCreateCustomer(from, userId);
    const conversation =
      (await conversationModel.getActiveConversation(customer.id)) ||
      (await conversationModel.createConversation(customer.id, userId));

    await customerModel.updateLastContact(customer.id);

    const conversationContext = await conversationService.getConversationContext(conversation.id);

    // Load this user's products and agent config
    const [products, agentResult] = await Promise.all([
      productService.getUserProducts(userId),
      db.query(
        `SELECT agent_name, language, tone, response_style, system_prompt_override
         FROM user_agents WHERE user_id = $1 LIMIT 1`,
        [userId]
      ),
    ]);
    const agentConfig = agentResult.rows[0] || null;

    const analysis = await claudeService.sendMessage(body, conversationContext, products, agentConfig);

    const { intent, entities, sentiment, missing_fields, response: claudeResponse, flow_decision } = analysis;

    await conversationService.saveMessage(conversation.id, 'user', body, intent, sentiment, entities);

    logger.debug('Analyzed', { requestId, intent, sentiment, flow_decision });

    let botResponse;

    if ((ENABLE_ESCALATION && sentiment < -0.7) || flow_decision === 'needs_escalation') {
      const reason = sentiment < -0.7 ? 'negative_sentiment' : 'customer_request';
      await flowManager.startEscalationFlow(conversation.id, reason);
      botResponse = `واضح أنك مش مرتاح، وكنتأسف بصح. غادي نحيلك لفريق الدعم المتخصص ديالنا باش يعطيك الاهتمام اللي تستاهل.\n\nوكيل بشري غادي يكون معاك قريباً. شكراً على صبرك! 👋`;
    } else {
      const context = {
        conversationId: conversation.id,
        customer,
        msg,
        message: body,
        intent,
        entities,
        sentiment,
        missing_fields,
        flow_decision,
        claudeResponse,
        products,
        agentConfig,
        userId,
      };
      botResponse = await executeHandler(intent, context);
    }

    if (!botResponse) {
      logger.info('Reply sent (media only)', { requestId, to: from });
      return;
    }

    botResponse = formatWhatsAppMessage(botResponse);
    await conversationService.saveMessage(conversation.id, 'bot', botResponse);
    await msg.reply(botResponse);

    logger.info('Reply sent', { requestId, to: from });
  } catch (error) {
    logger.error('Error processing message', { requestId, error: error.message, stack: error.stack });
    try { await msg.reply(`عندي مشكل تقني. عاود المحاولة أو كتب "وكيل" باش تتكلم مع إنسان.`); } catch (_) {}
  }
};

module.exports = { processMessage };
