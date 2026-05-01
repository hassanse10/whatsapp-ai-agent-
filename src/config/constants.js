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
    { id: 1, name: 'قميص أزرق كلاسيكي (Blue T-Shirt)',      price: 249,  sizes: ['S', 'M', 'L', 'XL'],          colors: ['أزرق', 'أسود', 'أبيض'],           image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&fit=crop', description: 'قميص قطني 100% مريح وعملي' },
    { id: 2, name: 'جينز أسود فاخر (Black Jeans)',       price: 799,  sizes: ['28', '30', '32', '34', '36'], colors: ['أسود', 'أزرق داكن'],           image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&fit=crop', description: 'جينز ستريتش عالي الجودة يدوم طويل' },
    { id: 3, name: 'أحذية رياضية حديثة (Sneakers)',          price: 999,  sizes: ['36', '37', '38', '39', '40', '41', '42'], colors: ['أبيض', 'أسود', 'أحمر'], image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&fit=crop', description: 'أحذية مريحة مع تقنية امتصاص الصدمات' },
    { id: 4, name: 'سترة شتوية دافئة (Winter Jacket)',     price: 1999, sizes: ['S', 'M', 'L', 'XL'],          colors: ['أسود', 'بني', 'أزرق بحري'],  image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&fit=crop', description: 'سترة معزولة لفصل الشتاء البارد' },
    { id: 5, name: 'جوارب قطنية (Cotton Socks Pack)', price: 149, sizes: ['One Size'],                  colors: ['أبيض', 'أسود', 'رمادي'],  image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&fit=crop', description: 'مجموعة 6 جوارب قطن أصلي' },
    { id: 6, name: 'حقيبة يد جلدية (Leather Bag)',     price: 1299, sizes: ['One Size'],          colors: ['بني', 'أسود'],  image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&fit=crop', description: 'حقيبة جلد طبيعي فاخرة وأنيقة' },
    { id: 7, name: 'قبعة صيفية (Summer Hat)', price: 199, sizes: ['One Size'],                  colors: ['أبيض', 'بيج', 'أسود'],  image: 'https://images.unsplash.com/photo-1552328906-d77eb9f5a0cc?w=600&fit=crop', description: 'قبعة قطن خفيفة تحمي من الشمس' },
    { id: 8, name: 'حزام جلدي أنيق (Leather Belt)', price: 299, sizes: ['S', 'M', 'L', 'XL'],          colors: ['أسود', 'بني'],  image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&fit=crop', description: 'حزام جلد حقيقي بتصميم كلاسيكي' },
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
