const orderModel = require('../models/order');
const logger = require('../utils/logger');
const helpers = require('../utils/helpers');
const { PRODUCTS } = require('../config/constants');

const createOrder = async (customerId, items, shippingAddress = null, paymentMethod = null) => {
  try {
    const orderNumber = helpers.generateOrderNumber();
    const totalPrice = helpers.calculateOrderTotal(items);
    const estimatedDeliveryDate = helpers.getEstimatedDeliveryDate(5);

    const order = await orderModel.createOrder(
      customerId,
      orderNumber,
      items,
      totalPrice,
      shippingAddress,
      paymentMethod
    );

    await orderModel.updateEstimatedDelivery(order.id, estimatedDeliveryDate);

    logger.info(`Order created successfully`, { orderId: order.id, orderNumber });
    return order;
  } catch (error) {
    logger.error('Error creating order', { customerId, error });
    throw error;
  }
};

const getOrderDetails = async (orderId) => {
  try {
    return await orderModel.getOrderById(orderId);
  } catch (error) {
    logger.error('Error getting order details', { orderId, error });
    throw error;
  }
};

const getOrderByNumber = async (orderNumber) => {
  try {
    return await orderModel.getOrderByNumber(orderNumber);
  } catch (error) {
    logger.error('Error getting order by number', { orderNumber, error });
    throw error;
  }
};

const getCustomerOrders = async (customerId, limit = 5) => {
  try {
    return await orderModel.getCustomerOrders(customerId, limit);
  } catch (error) {
    logger.error('Error getting customer orders', { customerId, error });
    throw error;
  }
};

const updateOrderStatus = async (orderId, status, trackingNumber = null) => {
  try {
    return await orderModel.updateOrderStatus(orderId, status, trackingNumber);
  } catch (error) {
    logger.error('Error updating order status', { orderId, status, error });
    throw error;
  }
};

const formatOrderSummary = (order) => {
  const statusLabels = {
    pending:    '⏳ في الانتظار',
    confirmed:  '✅ مؤكدة',
    processing: '🔄 قيد المعالجة',
    shipped:    '🚚 في الطريق',
    delivered:  '📬 وصلت',
    cancelled:  '❌ ملغية',
  };

  let summary = `📦 *تفاصيل الطلبية*\n`;
  summary += `رقم الطلبية: ${order.order_number}\n`;
  summary += `الحالة: ${statusLabels[order.status] || order.status}\n`;
  summary += `المجموع: ${helpers.formatPrice(order.total_price)}\n\n`;

  summary += `المنتجات:\n`;
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, index) => {
      if (item.product_name) {
        summary += `${index + 1}. ${item.product_name}\n`;
        summary += `   الكمية: ${item.quantity}`;
        if (item.size)  summary += ` | القياس: ${item.size}`;
        if (item.color) summary += ` | اللون: ${item.color}`;
        summary += ` | ${helpers.formatPrice(item.price)}\n`;
      }
    });
  }

  if (order.tracking_number) {
    summary += `\nرقم التتبع: ${order.tracking_number}\n`;
  }

  if (order.estimated_delivery) {
    summary += `التوصيل المتوقع: ${order.estimated_delivery}\n`;
  }

  return summary;
};

const validateOrderItems = (items) => {
  if (!items || items.length === 0) {
    return { valid: false, error: 'No items in order' };
  }

  for (const item of items) {
    if (!item.product_name || !item.quantity || !item.price) {
      return { valid: false, error: 'Missing required item fields' };
    }

    if (item.quantity < 1 || item.quantity > 100) {
      return { valid: false, error: 'Invalid quantity' };
    }

    if (item.price < 0) {
      return { valid: false, error: 'Invalid price' };
    }
  }

  return { valid: true };
};

const findProduct = (productName) => {
  const lowerName = productName.toLowerCase();
  return PRODUCTS.find(p => p.name.toLowerCase().includes(lowerName)) || null;
};

// Dashboard functions for multi-tenant orders
const getUserOrders = async (userId, limit = 50, offset = 0) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT o.id, o.order_number, o.customer_id, o.status, o.total_price,
              o.shipping_address, o.payment_method, o.created_at,
              c.name as customer_name, c.phone_number
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error in getUserOrders', { error: error.message });
    throw error;
  }
};

const getOrderStats = async (userId) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_price), 0)::FLOAT as total_revenue,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
       FROM orders
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || {};
  } catch (error) {
    logger.error('Error in getOrderStats', { error: error.message });
    throw error;
  }
};

const getRecentOrders = async (userId, limit = 10) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT o.id, o.order_number, o.status, o.total_price, o.created_at,
              c.name as customer_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error in getRecentOrders', { error: error.message });
    throw error;
  }
};

const getTopProducts = async (userId, limit = 5) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT oi.product_name, COUNT(*) as order_count,
              SUM(oi.quantity) as total_quantity,
              AVG(oi.price)::FLOAT as avg_price
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY oi.product_name
       ORDER BY order_count DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error in getTopProducts', { error: error.message });
    throw error;
  }
};

module.exports = {
  createOrder,
  getOrderDetails,
  getOrderByNumber,
  getCustomerOrders,
  updateOrderStatus,
  formatOrderSummary,
  validateOrderItems,
  findProduct,
  getUserOrders,
  getOrderStats,
  getRecentOrders,
  getTopProducts,
};
