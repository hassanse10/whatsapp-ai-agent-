const db = require('../config/database');
const conversationModel = require('../models/conversation');
const logger = require('../utils/logger');
const { MAX_CONVERSATION_HISTORY } = require('../config/constants');

const saveMessage = async (conversationId, role, content, intent = null, sentiment = null, entities = null) => {
  try {
    const result = await db.query(
      'INSERT INTO messages (conversation_id, role, content, intent, sentiment, entities) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [conversationId, role, content, intent, sentiment, entities ? JSON.stringify(entities) : null]
    );

    if (role === 'user') {
      await conversationModel.incrementMessageCount(conversationId);
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error saving message', { conversationId, error });
    throw error;
  }
};

const getConversationContext = async (conversationId) => {
  try {
    const messages = await conversationModel.getConversationHistory(conversationId, MAX_CONVERSATION_HISTORY);
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  } catch (error) {
    logger.error('Error getting conversation context', { conversationId, error });
    throw error;
  }
};

const getConversationSummary = async (conversationId) => {
  try {
    const conversation = await conversationModel.getConversationById(conversationId);
    const messages = await conversationModel.getConversationHistory(conversationId, 10);

    return {
      id: conversation.id,
      status: conversation.status,
      messageCount: conversation.message_count,
      flowState: conversation.flow_state,
      messages,
      startedAt: conversation.started_at,
    };
  } catch (error) {
    logger.error('Error getting conversation summary', { conversationId, error });
    throw error;
  }
};

const updateFlowState = async (conversationId, flowState) => {
  try {
    return await conversationModel.updateFlowState(conversationId, flowState);
  } catch (error) {
    logger.error('Error updating flow state', { conversationId, error });
    throw error;
  }
};

const getFlowState = async (conversationId) => {
  try {
    const conversation = await conversationModel.getConversationById(conversationId);
    return conversation?.flow_state || {};
  } catch (error) {
    logger.error('Error getting flow state', { conversationId, error });
    throw error;
  }
};

const isOrderFlowActive = async (conversationId) => {
  try {
    const flowState = await getFlowState(conversationId);
    return flowState.type === 'order_creation';
  } catch (error) {
    logger.error('Error checking order flow', { conversationId, error });
    return false;
  }
};

const addToOrderDraft = async (conversationId, item) => {
  try {
    const flowState = await getFlowState(conversationId);
    if (!flowState.orderDraft) {
      flowState.orderDraft = [];
    }
    flowState.orderDraft.push(item);
    await updateFlowState(conversationId, flowState);
    return flowState.orderDraft;
  } catch (error) {
    logger.error('Error adding to order draft', { conversationId, error });
    throw error;
  }
};

const getOrderDraft = async (conversationId) => {
  try {
    const flowState = await getFlowState(conversationId);
    return flowState.orderDraft || [];
  } catch (error) {
    logger.error('Error getting order draft', { conversationId, error });
    return [];
  }
};

const clearOrderDraft = async (conversationId) => {
  try {
    const flowState = await getFlowState(conversationId);
    flowState.orderDraft = [];
    await updateFlowState(conversationId, flowState);
  } catch (error) {
    logger.error('Error clearing order draft', { conversationId, error });
    throw error;
  }
};

module.exports = {
  saveMessage,
  getConversationContext,
  getConversationSummary,
  updateFlowState,
  getFlowState,
  isOrderFlowActive,
  addToOrderDraft,
  getOrderDraft,
  clearOrderDraft,
};
