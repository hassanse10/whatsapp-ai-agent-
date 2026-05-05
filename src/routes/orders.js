const express = require('express');
const { requireAuth } = require('../middleware/auth');
const orderService = require('../services/orderService');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/orders - List all orders for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit) || 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    const orders = await orderService.getUserOrders(req.userId, limit, offset);

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = $1',
      [req.userId]
    );

    const total = parseInt(countResult.rows[0].count);

    return res.status(200).json({
      orders,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching orders', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:orderId - Get order details
router.get('/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order
    const orderResult = await db.query(
      `SELECT o.id, o.order_number, o.customer_id, o.status, o.total_price,
              o.shipping_address, o.payment_method, o.tracking_number,
              o.estimated_delivery, o.created_at, o.updated_at,
              c.name as customer_name, c.phone_number, c.email
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, req.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await db.query(
      `SELECT id, product_name, quantity, size, color, price
       FROM order_items
       WHERE order_id = $1`,
      [orderId]
    );

    order.items = itemsResult.rows;

    return res.status(200).json({ order });
  } catch (error) {
    logger.error('Error fetching order details', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// PUT /api/orders/:orderId - Update status, tracking number, or estimated delivery
router.put('/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, estimatedDelivery } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (status) { updates.push(`status = $${idx++}`); values.push(status); }
    if (trackingNumber !== undefined) { updates.push(`tracking_number = $${idx++}`); values.push(trackingNumber || null); }
    if (estimatedDelivery !== undefined) { updates.push(`estimated_delivery = $${idx++}`); values.push(estimatedDelivery || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(orderId, req.userId);

    const result = await db.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    logger.info('Order updated', { orderId, userId: req.userId, status, trackingNumber });
    return res.status(200).json({ order: result.rows[0] });
  } catch (error) {
    logger.error('Error updating order', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:orderId/cancel - Cancel an order
router.post('/:orderId/cancel', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await db.query(
      `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND status NOT IN ('delivered', 'cancelled')
       RETURNING *`,
      [orderId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    }

    logger.info('Order cancelled', { orderId, userId: req.userId });
    return res.status(200).json({ order: result.rows[0] });
  } catch (error) {
    logger.error('Error cancelling order', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
