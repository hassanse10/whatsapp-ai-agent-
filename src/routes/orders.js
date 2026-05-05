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

module.exports = router;
