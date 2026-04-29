const logger = require('../utils/logger');
const { generateRequestId, formatWhatsAppMessage } = require('../utils/helpers');
const customerModel = require('../models/customer');
const conversationModel = require('../models/conversation');
const claudeService = require('../services/claudeService');
const conversationService = require('../services/conversationService');
const sentimentService = require('../services/sentimentService');
const flowManager = require('../agents/conversationFlowManager');
const { executeHandler } = require('../agents/intentHandlers');
const { sendMessage } = require('../services/whatsappClient');
const { ENABLE_ESCALATION } = require('../config/constants');

const processMessage = async (msg) => {
  const requestId = generateRequestId();
  const from = msg.from;        // e.g. 155061304991886@lid or 212xxxxxxx@c.us
  const body = msg.body;

  // Ignore group messages and status updates
  if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') return;
  // Ignore non-text messages
  if (msg.type !== 'chat') return;

  logger.info('Message received', { requestId, from, body: body.substring(0, 80) });

  try {
    const customer = await customerModel.getOrCreateCustomer(from);
    const conversation =
      (await conversationModel.getActiveConversation(customer.id)) ||
      (await conversationModel.createConversation(customer.id));

    await customerModel.updateLastContact(customer.id);

    // Fetch history BEFORE saving current message to avoid duplication
    const conversationContext = await conversationService.getConversationContext(conversation.id);

    // Single unified Claude call returns all analysis + response
    const analysis = await claudeService.sendMessage(body, conversationContext);

    const {
      intent,
      entities,
      sentiment,
      missing_fields,
      response: claudeResponse,
      flow_decision,
    } = analysis;

    // Save user message with extracted analysis
    await conversationService.saveMessage(
      conversation.id, 'user', body, intent, sentiment, entities
    );

    logger.debug('Analyzed', { requestId, intent, sentiment, missing_fields, flow_decision });

    let botResponse;

    // Check if escalation needed (sentiment-based or flow decision)
    if ((ENABLE_ESCALATION && sentiment < -0.7) || flow_decision === 'needs_escalation') {
      const reason = sentiment < -0.7 ? 'negative_sentiment' : 'customer_request';
      await flowManager.startEscalationFlow(conversation.id, reason);
      botResponse = `واضح أنك مش مرتاح، وكنتأسف بصح. غادي نحيلك لفريق الدعم المتخصص ديالنا باش يعطيك الاهتمام اللي تستاهل.\n\nوكيل بشري غادي يكون معاك قريباً. شكراً على صبرك! 👋`;
    } else {
      // Pass analysis to handler to decide what to do
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
      };
      botResponse = await executeHandler(intent, context);
    }

    // Some handlers send their own media messages and return null to skip the text reply
    if (!botResponse) {
      logger.info('Reply sent (media only)', { requestId, to: from });
      return;
    }

    botResponse = formatWhatsAppMessage(botResponse);

    await conversationService.saveMessage(conversation.id, 'bot', botResponse);
    await msg.reply(botResponse);   // reply directly — works with any ID format (@lid, @c.us)

    logger.info('Reply sent', { requestId, to: from });
  } catch (error) {
    logger.error('Error processing message', { requestId, error: error.message, stack: error.stack });
    try { await msg.reply(`عندي مشكل تقني. عاود المحاولة أو كتب "وكيل" باش تتكلم مع إنسان.`); } catch (_) {}
  }
};

module.exports = { processMessage };
