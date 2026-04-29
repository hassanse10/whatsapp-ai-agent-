const logger = require('../utils/logger');
const { INTENTS, ESCALATION_REASONS } = require('../config/constants');
const orderService = require('../services/orderService');
const shippingService = require('../services/shippingService');
const conversationService = require('../services/conversationService');
const { FAQ } = require('../config/constants');

const handleGreeting = async (context) => {
  return `👋 مرحبا بيك! كيفاش نقدر نعاونك اليوم؟

نقدر نشوفك المنتجات، نساعدك تدير طلبية، تتبعو طلبياتك القديمة، أو نجاوب على أي سؤال عندك عن الأرجاع والتوصيل والأداء.

شنو بغيتي؟`;
};

const handleProductInfo = async (context) => {
  const { msg } = context;
  const { PRODUCTS } = require('../config/constants');
  const { MessageMedia } = require('whatsapp-web.js');
  const { formatPrice } = require('../utils/helpers');

  for (const product of PRODUCTS) {
    const caption =
      `*${product.name}*\n` +
      `💰 الثمن: ${formatPrice(product.price)}\n` +
      `📏 القياسات: ${product.sizes.join(', ')}\n` +
      `🎨 الألوان: ${product.colors.join(', ')}`;
    try {
      const media = await MessageMedia.fromUrl(product.image, { unsafeMime: true });
      await msg.reply(media, null, { caption });
    } catch (_) {
      await msg.reply(caption);
    }
  }

  return `شنو بغيتي تشري؟ 🛍️\n\nقولي سمية المنتج، القياس، واللون!`;
};

// ── Order flow helpers ────────────────────────────────────────────────────────

const PAYMENT_LABELS = {
  cash_on_delivery: '💵 الأداء عند التسليم',
  credit_card:      '💳 بطاقة بنكية',
  paypal:           '🅿️ PayPal',
};

const isValidName = (str) => {
  const s = str.trim();
  // At least 2 words, letters (Latin + Arabic) only, min 4 chars
  return (
    s.length >= 4 &&
    /^[a-zA-ZÀ-ÿ؀-ۿ\s'\-]+$/.test(s) &&
    s.split(/\s+/).filter(Boolean).length >= 2
  );
};

const isValidAddress = (str) => {
  const s = str.trim();
  return s.length >= 10 && s.split(/\s+/).filter(Boolean).length >= 3;
};

const parsePayment = (text, PAYMENT_METHODS) => {
  const t = text.toLowerCase();
  if (t === '1' || t.includes('cash') || t.includes('cod') || t.includes('delivery') ||
      t.includes('نقدي') || t.includes('تسليم') || t.includes('كاش')) {
    return PAYMENT_METHODS.CASH_ON_DELIVERY;
  }
  if (t === '2' || t.includes('credit') || t.includes('card') ||
      t.includes('بطاقة') || t.includes('كريدي') || t.includes('بنكية')) {
    return PAYMENT_METHODS.CREDIT_CARD;
  }
  if (t === '3' || t.includes('paypal') || t.includes('باي بال') || t.includes('بايبال')) {
    return PAYMENT_METHODS.PAYPAL;
  }
  return null;
};

const detectChangeRequest = (message) => {
  const lower = message.toLowerCase();
  const triggers = [
    'change', 'edit', 'update', 'fix', 'wrong', 'correct', 'modify', 'mistake',
    'بدل', 'صحح', 'غير', 'عدل', 'خطأ', 'غلط', 'بدّل',
  ];
  if (!triggers.some(t => lower.includes(t))) return null;

  let field = null;
  if (lower.includes('name') || lower.includes('الاسم') || lower.includes('سميتي') || lower.includes('سمية') || lower.includes('اسمي')) {
    field = 'name';
  } else if (lower.includes('address') || lower.includes('location') || lower.includes('street') ||
             lower.includes('العنوان') || lower.includes('عنواني') || lower.includes('التوصيل')) {
    field = 'address';
  } else if (lower.includes('payment') || lower.includes('pay') || lower.includes('method') ||
             lower.includes('الأداء') || lower.includes('الدفع') || lower.includes('طريقة')) {
    field = 'payment';
  } else if (lower.includes('item') || lower.includes('product') || lower.includes('cart') ||
             lower.includes('المنتج') || lower.includes('الكارطة') || lower.includes('الطلبية')) {
    field = 'items';
  }
  if (!field) return null;

  const toMatch = message.match(/\bto\s+(.+)$/i) || message.match(/(?:إلى|ل|بـ)\s+(.+)$/);
  const newValue = toMatch ? toMatch[1].trim() : null;
  return { field, newValue };
};

const buildSummary = (flowState, orderDraft, formatPrice, calculateOrderTotal) => {
  const total = calculateOrderTotal(orderDraft);
  let s = `📋 *ملخص الطلبية*\n\n`;
  orderDraft.forEach(item => {
    s += `• ${item.quantity}x ${item.product_name} (${item.size} / ${item.color}) — ${formatPrice(item.price * item.quantity)}\n`;
  });
  s += `\n💰 *المجموع:* ${formatPrice(total)}\n`;
  if (flowState.customerName)    s += `👤 *الاسم:* ${flowState.customerName}\n`;
  if (flowState.shippingAddress) s += `📍 *العنوان:* ${flowState.shippingAddress}\n`;
  if (flowState.paymentMethod)   s += `💳 *طريقة الأداء:* ${PAYMENT_LABELS[flowState.paymentMethod]}\n`;
  return s;
};

// ── Main handler ──────────────────────────────────────────────────────────────

const handleOrderCreate = async (context) => {
  const { conversationId, customer, entities, missing_fields, claudeResponse, message } = context;
  const { formatPrice, calculateOrderTotal } = require('../utils/helpers');
  const { PAYMENT_METHODS } = require('../config/constants');

  // Get current order data from conversation history
  const flowState = await conversationService.getFlowState(conversationId) || {};
  const existingItems = flowState.items || [];

  try {
    // If we have a product_name entity, add it to the order
    if (entities?.product_name) {
      const product = orderService.findProduct(entities.product_name);
      if (product) {
        const quantity = entities.quantity || 1;
        const size = entities.size || product.sizes[0];
        const color = entities.color || product.colors[0];
        const newItem = { product_name: product.name, quantity, size, color, price: product.price };

        // Add item if it doesn't already exist
        if (!existingItems.some(i => i.product_name === product.name && i.size === size && i.color === color)) {
          existingItems.push(newItem);
        }
      }
    }

    // Update flow state with collected data
    const collectedData = {
      items: existingItems,
      name: entities?.name || flowState.name,
      address: entities?.address || flowState.address,
      payment_method: entities?.payment_method || flowState.payment_method,
    };

    await conversationService.updateFlowState(conversationId, collectedData);

    // Check if all required fields are collected
    const hasItems = existingItems.length > 0;
    const hasName = !!collectedData.name && isValidName(collectedData.name);
    const hasAddress = !!collectedData.address && isValidAddress(collectedData.address);
    const hasPayment = !!collectedData.payment_method;
    const isComplete = hasItems && hasName && hasAddress && hasPayment;

    // If all data is collected, create the order
    if (isComplete) {
      const order = await orderService.createOrder(customer.id, existingItems, collectedData.address, collectedData.payment_method);
      if (collectedData.name) {
        const customerModel = require('../models/customer');
        await customerModel.updateCustomerName(customer.id, collectedData.name);
      }
      await conversationService.updateFlowState(conversationId, {});
      return `✅ *تأكدات الطلبية!*\n\nرقم الطلبية ديالك: *#${order.order_number}*\n\nغادي نعالجوها ونتواصلو معاك قريباً. شكراً على ثقتك فينا! 🎉`;
    }

    // If not complete, use Claude's response (which asks for missing fields naturally)
    return claudeResponse;

  } catch (error) {
    logger.error('Error in handleOrderCreate', { conversationId, error: error.message });
    return `عندي مشكل تقني. عاود المحاولة أو تواصل مع الدعم.`;
  }
};

const handleOrderTrack = async (context) => {
  const { customer, entities } = context;
  const { formatPrice } = require('../utils/helpers');

  if (entities?.order_id) {
    const order = await orderService.getOrderByNumber(entities.order_id);
    if (!order) {
      return `ما لقيتش طلبية برقم "${entities.order_id}".\n\nتحقق من الرقم مزيان أو عطيني رقم آخر. نقدر نوريك آخر طلبياتك إلا بغيتي.`;
    }
    let response = orderService.formatOrderSummary(order);
    if (order.tracking_number) {
      const tracking = shippingService.trackPackage(order.tracking_number);
      response += shippingService.formatTrackingInfo(tracking);
    } else if (order.status !== 'pending') {
      response += '\n📦 رقم التتبع غادي يكون متاح من اللحظة اللي تتشحن فيها الطلبية.\n';
    }
    return response;
  }

  const recentOrders = await orderService.getCustomerOrders(customer.id, 3);
  if (recentOrders.length === 0) {
    return `ما كاين عندك حتى طلبية حتى دابا. واش بغيتي تدير واحدة؟`;
  }

  let response = `📦 آخر طلبياتك:\n\n`;
  recentOrders.forEach(order => {
    response += `• طلبية #${order.order_number} - ${order.status} - ${formatPrice(order.total_price)}\n`;
  });
  response += `\nأعطيني رقم الطلبية اللي بغيتي تتبعها.`;
  return response;
};

const handleFAQ = async (context) => {
  const { claudeResponse } = context;
  const message = context.message.toLowerCase();

  for (const [keyword, answer] of Object.entries(FAQ)) {
    if (message.includes(keyword)) {
      return `❓ ${answer}\n\nواش كاين شي حاجة أخرى نقدر نعاونك بها؟`;
    }
  }
  return claudeResponse;
};

const handleComplaint = async (context) => {
  const { conversationId, sentiment, claudeResponse } = context;

  // Use Claude's response which already handles the complaint naturally
  // The escalation is handled at the controller level based on sentiment
  let response = `كنتأسف على هاد المشكلة، وبغيت نعاونك نحلوها.\n\n`;
  response += claudeResponse;

  return response;
};

const handleEscalate = async (context) => {
  const { conversationId } = context;
  await conversationService.updateFlowState(conversationId, {
    type: 'escalation',
    reason: ESCALATION_REASONS.REQUESTED_BY_CUSTOMER,
  });
  return `كنربطك دابا مع فريق الدعم البشري ديالنا.\n\nغادي تتكلم مع متخصص يقدر يحل مشكلتك. عندهم access لتاريخ طلبياتك والمحادثة.\n\nشكراً على صبرك! 👋`;
};

const handleOther = async (context) => {
  return context.claudeResponse;
};

const intentHandlers = {
  [INTENTS.GREETING]:      handleGreeting,
  [INTENTS.PRODUCT_INFO]:  handleProductInfo,
  [INTENTS.ORDER_CREATE]:  handleOrderCreate,
  [INTENTS.ORDER_TRACK]:   handleOrderTrack,
  [INTENTS.FAQ]:           handleFAQ,
  [INTENTS.COMPLAINT]:     handleComplaint,
  [INTENTS.ESCALATE]:      handleEscalate,
  [INTENTS.OTHER]:         handleOther,
};

const executeHandler = async (intent, context) => {
  try {
    const handler = intentHandlers[intent] || intentHandlers[INTENTS.OTHER];
    return await handler(context);
  } catch (error) {
    logger.error('Error executing intent handler', { intent, error });
    return `عندي مشكل تقني. عاود المحاولة أو كتب "وكيل" باش تتكلم مع إنسان.`;
  }
};

module.exports = { intentHandlers, executeHandler };
