module.exports = {
  INTENTS: {
    GREETING: 'GREETING',
    PRODUCT_INFO: 'PRODUCT_INFO',
    ORDER_CREATE: 'ORDER_CREATE',
    ORDER_TRACK: 'ORDER_TRACK',
    FAQ: 'FAQ',
    COMPLAINT: 'COMPLAINT',
    ESCALATE: 'ESCALATE',
    OTHER: 'OTHER',
  },

  CONVERSATION_STATES: {
    NEW: 'new',
    ACTIVE: 'active',
    AWAITING_INPUT: 'awaiting_input',
    ORDER_IN_PROGRESS: 'order_in_progress',
    AWAITING_CONFIRMATION: 'awaiting_confirmation',
    ESCALATED: 'escalated',
    CLOSED: 'closed',
  },

  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },

  PAYMENT_METHODS: {
    CASH_ON_DELIVERY: 'cash_on_delivery',
    CREDIT_CARD: 'credit_card',
    PAYPAL: 'paypal',
  },

  ORDER_FLOW_STEPS: {
    COLLECT_ITEMS:    'collect_items',
    COLLECT_NAME:     'collect_name',
    COLLECT_ADDRESS:  'collect_address',
    COLLECT_PAYMENT:  'collect_payment',
    CONFIRM:          'confirm',
  },

  ESCALATION_REASONS: {
    ANGRY_CUSTOMER: 'angry_customer',
    UNRESOLVED_ISSUE: 'unresolved_issue',
    REQUESTED_BY_CUSTOMER: 'requested_by_customer',
    SYSTEM_ERROR: 'system_error',
    COMPLEX_ISSUE: 'complex_issue',
  },

  PRODUCTS: [
    { id: 1, name: 'Blue T-Shirt',      price: 29.99,  sizes: ['S', 'M', 'L', 'XL'],          colors: ['Blue', 'Black'],           image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&fit=crop' },
    { id: 2, name: 'Black Jeans',       price: 79.99,  sizes: ['28', '30', '32', '34', '36'], colors: ['Black', 'Blue'],           image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&fit=crop' },
    { id: 3, name: 'Sneakers',          price: 99.99,  sizes: ['6', '7', '8', '9', '10', '11', '12'], colors: ['White', 'Black', 'Red'], image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&fit=crop' },
    { id: 4, name: 'Winter Jacket',     price: 199.99, sizes: ['S', 'M', 'L', 'XL'],          colors: ['Black', 'Brown', 'Navy'],  image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&fit=crop' },
    { id: 5, name: 'Cotton Socks (Pack)', price: 14.99, sizes: ['One Size'],                  colors: ['White', 'Black', 'Gray'],  image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&fit=crop' },
  ],

  FAQ: {
    // Darija keywords
    'ارجاع':         'كنقبلو الارجاع حتى 30 يوم من تاريخ الشراء. المنتج خاصو يكون ما لبسوش وفي علبته الأصلية. تواصل مع الدعم باش تبدأ الإجراء.',
    'رجوع':          'كنقبلو الارجاع حتى 30 يوم من تاريخ الشراء. المنتج خاصو يكون ما لبسوش وفي علبته الأصلية. تواصل مع الدعم باش تبدأ الإجراء.',
    'توصيل':         'التوصيل العادي كياخود 5-7 أيام عمل. التوصيل السريع 2-3 أيام بزيادة في الثمن.',
    'الأداء':        'كنقبلو البطائق البنكية، PayPal، والأداء عند التسليم.',
    'تبديل':         'ايه، كنقبلو التبديل! ابدأ طلب التبديل من الموقع أو تواصل مع الدعم.',
    'ضمان':          'جميع المنتجات عندها ضمان سنة من الصانع على العيوب.',
    'تواصل':         'تقدر تتواصل معنا على واتساب (هنا)، أو بالإيميل support@example.com.',
    'تخفيض':         'سجل فالنيوزليتر باش تجيك كودات تخفيض. الكودات الحالية كاينة فالتطبيق.',
    'تتبع':          'تقدر تتبع طلبيتك في أي وقت. فقط عطيني رقم الطلبية!',
    'قياس':          'شوف دليل القياسات فالموقع. عندنا مقاسات مفصلة لكل الملابس.',
    // English fallbacks
    'return':        'كنقبلو الارجاع حتى 30 يوم من تاريخ الشراء. المنتج خاصو يكون ما لبسوش وفي علبته الأصلية.',
    'shipping':      'التوصيل العادي كياخود 5-7 أيام عمل. التوصيل السريع 2-3 أيام.',
    'payment':       'كنقبلو البطائق البنكية، PayPal، والأداء عند التسليم.',
    'exchange':      'ايه، كنقبلو التبديل! ابدأ طلب التبديل من الموقع أو تواصل مع الدعم.',
    'warranty':      'جميع المنتجات عندها ضمان سنة من الصانع على العيوب.',
    'discount':      'سجل فالنيوزليتر باش تجيك كودات تخفيض.',
    'size':          'شوف دليل القياسات فالموقع ديالنا.',
  },

  SENTIMENT_THRESHOLDS: {
    VERY_NEGATIVE: -0.8,
    NEGATIVE: -0.5,
    NEUTRAL: -0.2,
    POSITIVE: 0.2,
    VERY_POSITIVE: 0.8,
  },

  MAX_CONVERSATION_HISTORY: parseInt(process.env.MAX_CONVERSATION_HISTORY) || 10,
  SENTIMENT_THRESHOLD: parseFloat(process.env.SENTIMENT_THRESHOLD) || -0.5,
  ESCALATION_MESSAGE_THRESHOLD: parseInt(process.env.ESCALATION_MESSAGE_THRESHOLD) || 5,
  ENABLE_ESCALATION: process.env.ENABLE_ESCALATION !== 'false',

  WHATSAPP_MESSAGE_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    STICKER: 'sticker',
  },

  WHATSAPP_STATUS_SUCCESS: 'success',
  WHATSAPP_STATUS_FAILED: 'failed',
  WHATSAPP_STATUS_PENDING: 'pending',
};
