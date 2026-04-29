const logger = require('../utils/logger');
const conversationService = require('../services/conversationService');
const { CONVERSATION_STATES } = require('../config/constants');

const initializeConversation = async (conversationId) => {
  try {
    const flowState = {
      type: 'general',
      step: 0,
      createdAt: new Date().toISOString(),
    };
    await conversationService.updateFlowState(conversationId, flowState);
    return flowState;
  } catch (error) {
    logger.error('Error initializing conversation', { conversationId, error });
    throw error;
  }
};

const startOrderCreationFlow = async (conversationId) => {
  try {
    const flowState = {
      type: 'order_creation',
      step: 1,
      orderDraft: [],
      createdAt: new Date().toISOString(),
    };
    await conversationService.updateFlowState(conversationId, flowState);
    logger.info('Order creation flow started', { conversationId });
    return flowState;
  } catch (error) {
    logger.error('Error starting order creation flow', { conversationId, error });
    throw error;
  }
};

const completeOrderCreationFlow = async (conversationId, customerId, shippingAddress = null) => {
  try {
    const orderService = require('../services/orderService');
    const flowState = await conversationService.getFlowState(conversationId);
    const orderItems = flowState.orderDraft || [];

    const validation = orderService.validateOrderItems(orderItems);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const order = await orderService.createOrder(customerId, orderItems, shippingAddress);

    flowState.type = 'order_completed';
    flowState.orderId = order.id;
    flowState.completedAt = new Date().toISOString();
    await conversationService.updateFlowState(conversationId, flowState);

    logger.info('Order creation flow completed', { conversationId, orderId: order.id });
    return order;
  } catch (error) {
    logger.error('Error completing order creation flow', { conversationId, error });
    throw error;
  }
};

const cancelOrderCreationFlow = async (conversationId) => {
  try {
    const flowState = await conversationService.getFlowState(conversationId);
    flowState.type = 'general';
    flowState.orderDraft = [];
    flowState.cancelledAt = new Date().toISOString();
    await conversationService.updateFlowState(conversationId, flowState);
    logger.info('Order creation flow cancelled', { conversationId });
  } catch (error) {
    logger.error('Error cancelling order creation flow', { conversationId, error });
    throw error;
  }
};

const startEscalationFlow = async (conversationId, reason) => {
  try {
    const db = require('../config/database');

    const flowState = {
      type: 'escalation',
      reason,
      step: 1,
      createdAt: new Date().toISOString(),
    };

    await conversationService.updateFlowState(conversationId, flowState);

    const convResult = await db.query('SELECT customer_id FROM conversations WHERE id = $1', [
      conversationId,
    ]);

    if (convResult.rows.length > 0) {
      const customerId = convResult.rows[0].customer_id;
      await db.query(
        'INSERT INTO escalations (conversation_id, customer_id, reason) VALUES ($1, $2, $3)',
        [conversationId, customerId, reason]
      );
    }

    logger.info('Escalation flow started', { conversationId, reason });
    return flowState;
  } catch (error) {
    logger.error('Error starting escalation flow', { conversationId, error });
    throw error;
  }
};

const isInOrderFlow = async (conversationId) => {
  try {
    const flowState = await conversationService.getFlowState(conversationId);
    return flowState.type === 'order_creation';
  } catch (error) {
    logger.error('Error checking order flow', { conversationId, error });
    return false;
  }
};

const isInEscalationFlow = async (conversationId) => {
  try {
    const flowState = await conversationService.getFlowState(conversationId);
    return flowState.type === 'escalation';
  } catch (error) {
    logger.error('Error checking escalation flow', { conversationId, error });
    return false;
  }
};

const getFlowType = async (conversationId) => {
  try {
    const flowState = await conversationService.getFlowState(conversationId);
    return flowState.type || 'general';
  } catch (error) {
    logger.error('Error getting flow type', { conversationId, error });
    return 'general';
  }
};

const resetFlow = async (conversationId) => {
  try {
    const flowState = {
      type: 'general',
      step: 0,
      resetAt: new Date().toISOString(),
    };
    await conversationService.updateFlowState(conversationId, flowState);
    logger.info('Flow reset', { conversationId });
  } catch (error) {
    logger.error('Error resetting flow', { conversationId, error });
    throw error;
  }
};

module.exports = {
  initializeConversation,
  startOrderCreationFlow,
  completeOrderCreationFlow,
  cancelOrderCreationFlow,
  startEscalationFlow,
  isInOrderFlow,
  isInEscalationFlow,
  getFlowType,
  resetFlow,
};
