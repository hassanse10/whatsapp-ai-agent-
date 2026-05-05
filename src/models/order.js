const db = require('../config/database');
const logger = require('../utils/logger');

const createOrder = async (customerId, orderNumber, items, totalPrice, shippingAddress = null, paymentMethod = null, userId = null) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'INSERT INTO orders (customer_id, order_number, total_price, shipping_address, payment_method, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customerId, orderNumber, totalPrice, shippingAddress, paymentMethod, userId]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_name, quantity, size, color, price) VALUES ($1, $2, $3, $4, $5, $6)',
        [orderId, item.product_name, item.quantity, item.size, item.color, item.price]
      );
      if (item.product_id) {
        await client.query(
          'UPDATE user_products SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    await client.query('COMMIT');
    logger.info(`Order created: ${orderNumber}`);
    return orderResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error in createOrder', { customerId, orderNumber, error });
    throw error;
  } finally {
    client.release();
  }
};

const getOrderById = async (orderId) => {
  try {
    const result = await db.query(
      'SELECT o.*, json_agg(json_build_object(\'id\', oi.id, \'product_name\', oi.product_name, \'quantity\', oi.quantity, \'size\', oi.size, \'color\', oi.color, \'price\', oi.price)) AS items FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE o.id = $1 GROUP BY o.id',
      [orderId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getOrderById', { orderId, error });
    throw error;
  }
};

const getOrderByNumber = async (orderNumber, userId) => {
  try {
    const result = await db.query(
      `SELECT o.*, json_agg(json_build_object('id', oi.id, 'product_name', oi.product_name,
        'quantity', oi.quantity, 'size', oi.size, 'color', oi.color, 'price', oi.price)) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.order_number = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [orderNumber, userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getOrderByNumber', { orderNumber, userId, error });
    throw error;
  }
};

const getCustomerOrders = async (customerId, limit = 10) => {
  try {
    const result = await db.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2',
      [customerId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error in getCustomerOrders', { customerId, error });
    throw error;
  }
};

const updateOrderStatus = async (orderId, status, trackingNumber = null) => {
  try {
    const result = await db.query(
      'UPDATE orders SET status = $1, tracking_number = COALESCE($2, tracking_number), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, trackingNumber, orderId]
    );
    logger.info(`Order ${orderId} status updated to ${status}`);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in updateOrderStatus', { orderId, status, error });
    throw error;
  }
};

const updateEstimatedDelivery = async (orderId, estimatedDeliveryDate) => {
  try {
    const result = await db.query(
      'UPDATE orders SET estimated_delivery = $1 WHERE id = $2 RETURNING *',
      [estimatedDeliveryDate, orderId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in updateEstimatedDelivery', { orderId, error });
    throw error;
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getCustomerOrders,
  updateOrderStatus,
  updateEstimatedDelivery,
};
