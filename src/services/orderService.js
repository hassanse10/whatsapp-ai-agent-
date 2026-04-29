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

module.exports = {
  createOrder,
  getOrderDetails,
  getOrderByNumber,
  getCustomerOrders,
  updateOrderStatus,
  formatOrderSummary,
  validateOrderItems,
  findProduct,
};
