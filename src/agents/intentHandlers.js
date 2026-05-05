const logger = require('../utils/logger');
const { INTENTS, ESCALATION_REASONS, FAQ } = require('../config/constants');
const orderService = require('../services/orderService');
const shippingService = require('../services/shippingService');
const conversationService = require('../services/conversationService');
const { broadcastToUser } = require('../services/whatsappSessionManager');

const PAYMENT_LABELS = {
  cash_on_delivery: '💵 الأداء عند التسليم',
  credit_card:      '💳 بطاقة بنكية',
  paypal:           '🅿️ PayPal',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const isValidName = (str) => {
  const s = str.trim();
  return s.length >= 4 && /^[a-zA-ZÀ-ÿ؀-ۿ\s'\-]+$/.test(s) && s.split(/\s+/).filter(Boolean).length >= 2;
};

const isValidAddress = (str) => {
  const s = str.trim();
  return s.length >= 10 && s.split(/\s+/).filter(Boolean).length >= 3;
};

const parsePayment = (text, PAYMENT_METHODS) => {
  const t = text.toLowerCase();
  if (t === '1' || t.includes('cash') || t.includes('cod') || t.includes('delivery') ||
      t.includes('نقدي') || t.includes('تسليم') || t.includes('كاش'))
    return PAYMENT_METHODS.CASH_ON_DELIVERY;
  if (t === '2' || t.includes('credit') || t.includes('card') ||
      t.includes('بطاقة') || t.includes('كريدي') || t.includes('بنكية'))
    return PAYMENT_METHODS.CREDIT_CARD;
  if (t === '3' || t.includes('paypal') || t.includes('باي بال') || t.includes('بايبال'))
    return PAYMENT_METHODS.PAYPAL;
  return null;
};

const buildSummary = (flowState, orderDraft, formatPrice, calculateOrderTotal) => {
  const total = calculateOrderTotal(orderDraft);
  let s = `📋 *ملخص الطلبية*\n\n`;
  orderDraft.forEach(item => {
    s += `• ${item.quantity}x ${item.product_name} (${item.size} / ${item.color}) — ${formatPrice(item.price * item.quantity)}\n`;
  });
  s += `\n💰 *المجموع:* ${formatPrice(total)}\n`;
  if (flowState.name)           s += `👤 *الاسم:* ${flowState.name}\n`;
  if (flowState.address)        s += `📍 *العنوان:* ${flowState.address}\n`;
  if (flowState.payment_method) s += `💳 *طريقة الأداء:* ${PAYMENT_LABELS[flowState.payment_method]}\n`;
  return s;
};

// Build the formatted receipt sent to customer after order creation
const buildReceipt = (order, items, collectedData, formatPrice, calculateOrderTotal) => {
  const total = calculateOrderTotal(items);
  const paymentLabel = PAYMENT_LABELS[collectedData.payment_method] || collectedData.payment_method;

  let msg = `✅ *تأكيد الطلبية*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `🔖 *رقم الطلبية:* #${order.order_number}\n\n`;
  msg += `🛒 *المنتجات:*\n`;
  items.forEach((item, i) => {
    msg += `${i + 1}. *${item.product_name}*\n`;
    msg += `   الكمية: ${item.quantity}`;
    if (item.size)  msg += ` | القياس: ${item.size}`;
    if (item.color) msg += ` | اللون: ${item.color}`;
    msg += `\n   السعر: ${formatPrice(item.price * item.quantity)}\n`;
  });
  msg += `\n💰 *المجموع: ${formatPrice(total)}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  if (collectedData.name)     msg += `👤 *الاسم:* ${collectedData.name}\n`;
  if (collectedData.address)  msg += `📍 *العنوان:* ${collectedData.address}\n`;
  msg += `💳 *طريقة الأداء:* ${paymentLabel}\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 الطلبية غادي توصلك خلال 3-5 أيام عمل.\n`;
  msg += `شكراً على ثقتك فينا! 🙏`;
  return msg;
};

// ── Intent handlers ───────────────────────────────────────────────────────────

const handleGreeting = async (context) => {
  const { customer } = context;
  let greeting = `مرحبا`;
  if (customer?.name) greeting += ` ${customer.name}`;
  greeting += `! 👋\n\nشنو بغيتي؟ منتجات، طلبية جديدة، ولا تتبع؟`;
  return greeting;
};

// Shared image-sending logic used by both PRODUCT_INFO and SHOW_PRODUCT
const sendProductCards = async (productsToShow, msg) => {
  const { MessageMedia } = require('whatsapp-web.js');
  const axios = require('axios');

  const joinField = (val) => {
    if (!val) return 'N/A';
    return Array.isArray(val) ? val.join(' | ') : String(val);
  };
  const fmt = (price) => {
    const n = parseFloat(price);
    return isNaN(n) ? String(price) : `${n.toFixed(2)} MAD`;
  };

  for (const product of productsToShow) {
    const caption =
      `🛍️ *${product.name}*\n\n` +
      (product.description ? `${product.description}\n\n` : '') +
      `💰 الثمن: *${fmt(product.price)}*\n` +
      `📏 القياسات: ${joinField(product.sizes)}\n` +
      `🎨 الألوان: ${joinField(product.colors)}` +
      (product.stock_quantity > 0 ? `\n✅ متوفر: ${product.stock_quantity} قطعة` : '');

    const imageUrl = product.image_url || product.image || null;
    if (imageUrl) {
      try {
        const imgRes = await axios.get(imageUrl, {
          responseType: 'arraybuffer', timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const mimeType = (imgRes.headers['content-type'] || 'image/jpeg').split(';')[0];
        const media = new MessageMedia(mimeType, Buffer.from(imgRes.data).toString('base64'));
        await msg.reply(media, null, { caption });
        continue;
      } catch (err) {
        logger.warn('Image download failed, sending text card', { product: product.name, error: err.message });
      }
    }
    await msg.reply(caption);
  }
};

const handleProductInfo = async (context) => {
  const { msg, message, entities, products: dbProducts } = context;
  const { PRODUCTS: hardcodedProducts } = require('../config/constants');
  const allProducts = (dbProducts && dbProducts.length > 0) ? dbProducts : hardcodedProducts;

  if (allProducts.length === 0) return `ماكاينش منتجات متاحة دابا. عاود لاحقاً!`;

  let productsToShow = allProducts;
  if (entities?.product_name) {
    const found = allProducts.find(p => p.name.toLowerCase().includes(entities.product_name.toLowerCase()));
    if (found) productsToShow = [found];
  } else if (message.toLowerCase().includes('رخيص') || message.toLowerCase().includes('cheap')) {
    productsToShow = [...allProducts].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)).slice(0, 3);
  } else if (message.toLowerCase().includes('غالي') || message.toLowerCase().includes('premium')) {
    productsToShow = [...allProducts].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 3);
  }

  await sendProductCards(productsToShow, msg);
  return null;
};

// SHOW_PRODUCT: explicit image request — "زريني صور", "send photos", "طلب صور"
const handleShowProduct = async (context) => {
  const { msg, entities, products: dbProducts } = context;
  const { PRODUCTS: hardcodedProducts } = require('../config/constants');
  const allProducts = (dbProducts && dbProducts.length > 0) ? dbProducts : hardcodedProducts;

  if (allProducts.length === 0) return `ماكاينش منتجات متاحة دابا.`;

  let productsToShow = allProducts;
  if (entities?.product_name) {
    const found = allProducts.find(p => p.name.toLowerCase().includes(entities.product_name.toLowerCase()));
    if (found) productsToShow = [found];
  }

  await sendProductCards(productsToShow, msg);
  return null;
};

// ORDER_CREATE: collects order details step by step
const handleOrderCreate = async (context) => {
  const { conversationId, customer, entities, claudeResponse, message, products: dbProducts, userId } = context;
  const { formatPrice, calculateOrderTotal } = require('../utils/helpers');
  const { PAYMENT_METHODS } = require('../config/constants');

  const flowState = await conversationService.getFlowState(conversationId) || {};
  const existingItems = flowState.items || [];

  try {
    if (entities?.product_name) {
      const product = orderService.findProduct(entities.product_name, dbProducts);
      if (product) {
        const quantity = entities.quantity || 1;
        const sizes = Array.isArray(product.sizes) ? product.sizes : [];
        const colors = Array.isArray(product.colors) ? product.colors : [];
        const size = entities.size || sizes[0] || '';
        const color = entities.color || colors[0] || '';
        const price = parseFloat(product.price) || 0;
        const newItem = { product_id: product.id, product_name: product.name, quantity, size, color, price };
        if (!existingItems.some(i => i.product_name === product.name && i.size === size && i.color === color)) {
          existingItems.push(newItem);
        }
      }
    }

    const collectedData = {
      items: existingItems,
      name: entities?.name || flowState.name,
      address: entities?.address || flowState.address,
      payment_method: entities?.payment_method || flowState.payment_method,
    };

    await conversationService.updateFlowState(conversationId, collectedData);

    const hasItems   = existingItems.length > 0;
    const hasName    = !!collectedData.name && isValidName(collectedData.name);
    const hasAddress = !!collectedData.address && isValidAddress(collectedData.address);
    const hasPayment = !!collectedData.payment_method;
    const isComplete = hasItems && hasName && hasAddress && hasPayment;

    if (isComplete) {
      // All info collected — show summary and wait for CONFIRM_ORDER intent
      const summary = buildSummary(collectedData, existingItems, formatPrice, calculateOrderTotal);
      return `${summary}\n\nكلاش صحيح؟ قول "نعم" أو "أيه" باش نأكدو الطلبية.`;
    }

    let response = claudeResponse;
    if (!hasPayment && hasItems) response += `\n\nعند التسليم (كاش) - أحسن خيار ✅`;
    return response;
  } catch (error) {
    logger.error('Error in handleOrderCreate', { conversationId, error: error.message });
    return `عندي مشكل تقني. عاود المحاولة.`;
  }
};

// CONFIRM_ORDER: customer confirmed — create order immediately + emit SSE
const handleConfirmOrder = async (context) => {
  const { conversationId, customer, products: dbProducts, userId } = context;
  const { formatPrice, calculateOrderTotal } = require('../utils/helpers');

  const flowState = await conversationService.getFlowState(conversationId) || {};
  const existingItems = flowState.items || [];

  if (existingItems.length === 0) {
    return `ما كاينش طلبية لتأكيدها. بغيتي تبدأ طلبية جديدة؟`;
  }

  const collectedData = {
    name: flowState.name,
    address: flowState.address,
    payment_method: flowState.payment_method,
  };

  if (!collectedData.address || !collectedData.payment_method) {
    return `خاصنا نكملو المعلومات أولاً. عطيني ${!collectedData.address ? 'العنوان' : 'طريقة الأداء'}.`;
  }

  try {
    const order = await orderService.createOrder(
      customer.id, existingItems, collectedData.address, collectedData.payment_method, userId
    );

    if (collectedData.name) {
      const customerModel = require('../models/customer');
      await customerModel.updateCustomerName(customer.id, collectedData.name);
    }

    // Clear the order draft from conversation state
    await conversationService.updateFlowState(conversationId, {});

    // Broadcast new order to dashboard in real-time
    if (userId) {
      broadcastToUser(userId, {
        type: 'new_order',
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_price: parseFloat(order.total_price),
          customer_name: collectedData.name || customer.phone_number,
          created_at: order.created_at,
        },
      });
    }

    logger.info('Order created and broadcast to dashboard', { orderId: order.id, userId });

    return buildReceipt(order, existingItems, collectedData, formatPrice, calculateOrderTotal);
  } catch (error) {
    logger.error('Error in handleConfirmOrder', { conversationId, error: error.message });
    return `عندي مشكل تقني في إنشاء الطلبية. عاود المحاولة.`;
  }
};

const handleOrderTrack = async (context) => {
  const { customer, entities, userId } = context;
  const { formatPrice } = require('../utils/helpers');

  if (entities?.order_id) {
    const order = await orderService.getOrderByNumber(entities.order_id, userId);
    if (!order) return `ما لقيتش رقم "${entities.order_id}". إتفضل رقم آخر.`;

    let response = orderService.formatOrderSummary(order);
    if (order.status === 'shipped') {
      response += `\n\n🚗 *السائق:* محمد أ.\n📱 *رقمه:* +212-612-345-678\n⏱️ *الوصول المتوقع:* ${order.estimated_delivery || '1-2 يوم'}`;
    }
    if (order.tracking_number) {
      const tracking = shippingService.trackPackage(order.tracking_number);
      response += shippingService.formatTrackingInfo(tracking);
    }
    return response;
  }

  const recentOrders = await orderService.getCustomerOrders(customer.id, 3);
  if (recentOrders.length === 0) return `ما كاين عندك طلبيات. بغيتي تدير واحدة؟`;

  let response = `آخر طلبياتك:\n`;
  recentOrders.forEach(order => {
    response += `#${order.order_number} - ${order.status} - ${formatPrice(order.total_price)}\n`;
  });
  return response;
};

const handleFAQ = async (context) => {
  const message = context.message.toLowerCase();
  for (const [keyword, answer] of Object.entries(FAQ)) {
    if (message.includes(keyword)) return answer;
  }
  return context.claudeResponse;
};

const handleComplaint = async (context) => {
  const { sentiment, claudeResponse } = context;
  let response = `كنتأسف. شنو المشكلة بالضبط؟\n\n${claudeResponse}`;
  if (sentiment < -0.5) response += `\n\nولا بغيتي نتكلم مع وكيل بشري؟`;
  return response;
};

const handleEscalate = async (context) => {
  const { conversationId } = context;
  await conversationService.updateFlowState(conversationId, {
    type: 'escalation',
    reason: ESCALATION_REASONS.REQUESTED_BY_CUSTOMER,
  });
  return `حاضر، غادي نربطك مع وكيل بشري قريباً. 👋`;
};

const handleOrderCancel = async (context) => {
  const { entities, userId } = context;
  if (!entities?.order_id) return `عطيني رقم الطلبية اللي بغيتي تلغيها (مثلاً: #123).`;

  try {
    const order = await orderService.getOrderByNumber(entities.order_id, userId);
    if (!order) return `ما لقيتش طلبية برقم #${entities.order_id}.`;
    if (order.status === 'cancelled') return `هاد الطلبية #${entities.order_id} متلغاة بالفعل.`;
    if (['shipped', 'delivered'].includes(order.status))
      return `ما نقدرش نلغي طلبية ${order.status === 'shipped' ? 'اللي انشحنت' : 'اللي توصلت'}. كتواصل مع الدعم.`;
    await orderService.updateOrderStatus(order.id, 'cancelled');
    return `✅ تأكدات! الغيت الطلبية #${entities.order_id}.`;
  } catch (error) {
    logger.error('Error in handleOrderCancel', { error: error.message });
    return `عندي مشكل تقني. عاود المحاولة.`;
  }
};

const handleOrderModify = async (context) => {
  const { entities, claudeResponse, userId } = context;
  if (!entities?.order_id) return `عطيني رقم الطلبية اللي بغيتي تعديلها (مثلاً: #123).`;

  try {
    const order = await orderService.getOrderByNumber(entities.order_id, userId);
    if (!order) return `ما لقيتش طلبية برقم #${entities.order_id}.`;
    if (['shipped', 'delivered', 'cancelled'].includes(order.status))
      return `ما نقدرش نعدلو هاد الطلبية (${order.status}). كتواصل مع الدعم.`;
    return claudeResponse;
  } catch (error) {
    logger.error('Error in handleOrderModify', { error: error.message });
    return `عندي مشكل تقني. عاود المحاولة.`;
  }
};

const handleOther = async (context) => context.claudeResponse;

// ── Router ────────────────────────────────────────────────────────────────────

const intentHandlers = {
  [INTENTS.GREETING]:      handleGreeting,
  [INTENTS.PRODUCT_INFO]:  handleProductInfo,
  SHOW_PRODUCT:            handleShowProduct,
  [INTENTS.ORDER_CREATE]:  handleOrderCreate,
  CONFIRM_ORDER:           handleConfirmOrder,
  [INTENTS.ORDER_TRACK]:   handleOrderTrack,
  [INTENTS.ORDER_CANCEL]:  handleOrderCancel,
  [INTENTS.ORDER_MODIFY]:  handleOrderModify,
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
