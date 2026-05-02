const express = require('express');
const { requireAuth } = require('../middleware/auth');
const orderService = require('../services/orderService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/dashboard/overview - Get dashboard overview stats
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const stats = await orderService.getOrderStats(req.userId);

    return res.status(200).json({
      overview: {
        totalOrders: parseInt(stats.total_orders) || 0,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        uniqueCustomers: parseInt(stats.unique_customers) || 0,
        deliveredOrders: parseInt(stats.delivered_orders) || 0,
        pendingOrders: parseInt(stats.pending_orders) || 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard overview', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/recent-orders - Get recent orders
router.get('/recent-orders', requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const recentOrders = await orderService.getRecentOrders(req.userId, limit);

    return res.status(200).json({ recentOrders });
  } catch (error) {
    logger.error('Error fetching recent orders', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/top-products - Get top-selling products
router.get('/top-products', requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;

    const topProducts = await orderService.getTopProducts(req.userId, limit);

    return res.status(200).json({ topProducts });
  } catch (error) {
    logger.error('Error fetching top products', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
