const db = require('../config/database');
const logger = require('../utils/logger');

const createConversation = async (customerId, flowState = {}) => {
  try {
    const result = await db.query(
      'INSERT INTO conversations (customer_id, flow_state) VALUES ($1, $2) RETURNING *',
      [customerId, JSON.stringify(flowState)]
    );
    logger.info(`Conversation created for customer ${customerId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error in createConversation', { customerId, error });
    throw error;
  }
};

const getConversationById = async (conversationId) => {
  try {
    const result = await db.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getConversationById', { conversationId, error });
    throw error;
  }
};

const getActiveConversation = async (customerId) => {
  try {
    const result = await db.query(
      "SELECT * FROM conversations WHERE customer_id = $1 AND status IN ('active', 'awaiting_input', 'order_in_progress') ORDER BY started_at DESC LIMIT 1",
      [customerId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getActiveConversation', { customerId, error });
    throw error;
  }
};

const updateConversationStatus = async (conversationId, status) => {
  try {
    const result = await db.query(
      'UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, conversationId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in updateConversationStatus', { conversationId, status, error });
    throw error;
  }
};

const updateFlowState = async (conversationId, flowState) => {
  try {
    const result = await db.query(
      'UPDATE conversations SET flow_state = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(flowState), conversationId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in updateFlowState', { conversationId, error });
    throw error;
  }
};

const incrementMessageCount = async (conversationId) => {
  try {
    await db.query(
      'UPDATE conversations SET message_count = message_count + 1 WHERE id = $1',
      [conversationId]
    );
  } catch (error) {
    logger.error('Error in incrementMessageCount', { conversationId, error });
    throw error;
  }
};

const closeConversation = async (conversationId) => {
  try {
    const result = await db.query(
      'UPDATE conversations SET status = $1, ended_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['closed', conversationId]
    );
    logger.info(`Conversation ${conversationId} closed`);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in closeConversation', { conversationId, error });
    throw error;
  }
};

const getConversationHistory = async (conversationId, limit = 10) => {
  try {
    const result = await db.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
      [conversationId, limit]
    );
    return result.rows.reverse();
  } catch (error) {
    logger.error('Error in getConversationHistory', { conversationId, error });
    throw error;
  }
};

module.exports = {
  createConversation,
  getConversationById,
  getActiveConversation,
  updateConversationStatus,
  updateFlowState,
  incrementMessageCount,
  closeConversation,
  getConversationHistory,
};
