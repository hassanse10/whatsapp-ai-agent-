const { v4: uuidv4 } = require('uuid');

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

const generateTrackingNumber = () => {
  const carrier = ['SHIP', 'TRACK', 'DELIV'][Math.floor(Math.random() * 3)];
  const number = Math.random().toString(36).substring(2, 15).toUpperCase();
  return `${carrier}-${number}`;
};

const generateRequestId = () => {
  return uuidv4();
};

const extractEntitiesFromText = (text) => {
  const entities = {};

  // Extract order ID
  const orderIdMatch = text.match(/order[- ]?(?:id)?[- ]?:?[- ]?(\w+)/i);
  if (orderIdMatch) {
    entities.order_id = orderIdMatch[1];
  }

  // Extract quantity
  const quantityMatch = text.match(/(\d+)\s+(?:of|item|product|pcs?|units?)/i);
  if (quantityMatch) {
    entities.quantity = parseInt(quantityMatch[1], 10);
  }

  // Extract size
  const sizeMatch = text.match(/size[- ]?:?[- ]?([SMLXL]+|[\d]+)/i);
  if (sizeMatch) {
    entities.size = sizeMatch[1];
  }

  // Extract color
  const colorMatch = text.match(/color[- ]?:?[- ]?(\w+)/i);
  if (colorMatch) {
    entities.color = colorMatch[1];
  }

  // Extract product name (heuristic)
  const productMatch = text.match(/(?:want|order|buy|get)\s+(?:a|an|the)?\s+([a-z\s]+?)(?:\s+(?:in|size|color|with|of|at)|\d)/i);
  if (productMatch) {
    entities.product_name = productMatch[1].trim();
  }

  return entities;
};

const parseWhatsAppWebhook = (body) => {
  try {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return null;

    const from = message.from;
    const timestamp = message.timestamp;
    const messageType = message.type;

    let messageBody = '';
    switch (messageType) {
      case 'text':
        messageBody = message.text?.body || '';
        break;
      case 'image':
        messageBody = '[Image received]';
        break;
      case 'video':
        messageBody = '[Video received]';
        break;
      case 'document':
        messageBody = '[Document received]';
        break;
      default:
        messageBody = '[Unsupported media type]';
    }

    return {
      from,
      body: messageBody,
      timestamp: parseInt(timestamp),
      type: messageType,
      message_id: message.id,
    };
  } catch (error) {
    return null;
  }
};

const formatWhatsAppMessage = (text) => {
  return text.substring(0, 4096);
};

const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

const getEstimatedDeliveryDate = (daysToAdd = 7) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
};

const truncateText = (text, maxLength = 1000) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

const cleanPhoneNumber = (phone) => {
  return phone.replace(/\D/g, '');
};

const formatPrice = (price) => {
  return `${parseFloat(price).toFixed(2)} MAD`;
};

const getRelativeTime = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) return `${Math.floor(interval)} years ago`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} months ago`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} days ago`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} hours ago`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} minutes ago`;

  return 'just now';
};

module.exports = {
  generateOrderNumber,
  generateTrackingNumber,
  generateRequestId,
  extractEntitiesFromText,
  parseWhatsAppWebhook,
  formatWhatsAppMessage,
  calculateOrderTotal,
  getEstimatedDeliveryDate,
  truncateText,
  cleanPhoneNumber,
  formatPrice,
  getRelativeTime,
};
