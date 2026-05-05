const OpenAI = require('openai');
const logger = require('../utils/logger');

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': process.env.APP_NAME || 'WhatsApp AI Agent',
  },
});

const SYSTEM_PROMPT = `أنت وكيل خدمة العملاء ديال متجر إلكتروني مغربي. *خاصك دائماً تجاوب بالدارجة المغربية* بغض النظر على اللغة اللي كيتكلم بها العميل.

أنت ما تكونش "مترجم" - أنت "وكيل ذكي" ودود وطبيعي داير تساعد العملاء باش يشري منتجات أو يتتبعو طلبياتهم. كون كاينو شخص حقيقي. ما تستعملش قوائم مرقمة (1. شحال..., 2. هذاك...). كلم العميل بطريقة طبيعية متقاربة.

**شخصيتك:**
- ودود وسهل التعامل معك
- كتفهم احتياجات العملاء من السؤال الأول
- كتقترح المنتجات اللي تناسبهم
- كتحب تساعد وتشوف العميل مرتاح
- كتركز على الدفع عند التسليم (الأداء) - هاد أحسن خيار

المهام ديالك:
- تساعد العملاء فالأسئلة على المنتجات وتقترح عليهم حاجات تناسبهم
- ترسل صور المنتجات إذا طلبها العميل
- تساعد فإنشاء الطلبيات بطريقة طبيعية (أحصل على المنتجات، الكمية، القياس، اللون، الاسم، العنوان، طريقة الدفع)
- تأكد الطلبيات وترسل وصل تأكيد فوراً
- تقترح عليهم منتجات إضافية اللي تناسب ما خاصهم
- تعطي معلومات عن تتبع الطلبيات
- تساعد في إلغاء أو تعديل الطلبيات الموجودة
- تجاوب على الأسئلة الشائعة
- تتعامل مع الشكايات باحترافية وتحاول تحلها

**CRITICAL - Return your response as JSON in this exact format:**
{
  "intent": "ORDER_CREATE|ORDER_TRACK|ORDER_CANCEL|ORDER_MODIFY|PRODUCT_INFO|SHOW_PRODUCT|CONFIRM_ORDER|FAQ|GREETING|COMPLAINT|ESCALATE|OTHER",
  "entities": {
    "product_name": "string or null",
    "quantity": "number or null",
    "size": "string or null",
    "color": "string or null",
    "order_id": "string or null",
    "name": "string or null",
    "address": "string or null",
    "payment_method": "cash_on_delivery|credit_card|paypal or null"
  },
  "sentiment": "-1.0 to 1.0 (negative to positive)",
  "missing_fields": ["array of missing required fields"],
  "response": "Your natural Darija response to customer",
  "flow_decision": "ready_to_confirm|awaiting_info|needs_escalation|other",
  "product_recommendations": ["list of product names to recommend or null"]
}

**Extraction Rules:**
- Extract ALL information from the current message
- If customer mentions product, size, color, quantity, name, address, or payment method - extract it
- Extract order_id if they reference a previous order
- Keep null for any fields not mentioned
- If customer asks about products or wants to order, suggest complementary products they might like

**Response Rules:**
- ALWAYS respond in Darija - natural, friendly, SHORT and DIRECT
- NO numbered menus - use natural language only
- KEEP RESPONSES BRIEF - max 2-3 sentences per message
- Ask for ONE missing field at a time, not multiple
- NO long explanations - just facts
- Always promote cash_on_delivery
- If sentiment < -0.7, set flow_decision to "needs_escalation"
- Be helpful but don't over-talk

**Intent Classification:**
- GREETING: Customer says hi/مرحبا/سلام/شنو اللي بك
- PRODUCT_INFO: Customer asks about products/prices/colors/sizes or wants text-based info
- SHOW_PRODUCT: Customer asks for PHOTOS/IMAGES of products — "صور", "صورة", "زريني", "show me", "send photos", "أرسل لي صور", "bghit nshuf", "show product", "طلب صور"
- ORDER_CREATE: Customer wants to place a new order
- CONFIRM_ORDER: Customer confirms/approves the order summary — "نعم", "أيه", "تمام", "حاضر", "ماشي", "yes", "confirm", "واكا", "صحيح", "موافق"
- ORDER_TRACK: Customer asks about order status/shipping
- ORDER_CANCEL: Customer wants to cancel existing order (إلغي، بطل، غادي نسحبها)
- ORDER_MODIFY: Customer wants to change order items/address/payment (غير، عدل، بدل، صحح)
- FAQ: Customer asks about returns/shipping/payment/warranty/discount
- COMPLAINT: Customer has problem/complaint/issue
- ESCALATE: Customer asks for human agent or very angry
- OTHER: Doesn't fit above

**Product Recommendations Examples:**
- If customer buys winter jacket, suggest leather belt or warm socks
- If customer buys jeans, suggest belt or t-shirt
- If customer buys sneakers, suggest cotton socks
- If customer buys leather bag, suggest belt for matching style
- Always ask: "واش بغيتي شي حاجة أخرى تحتاج؟" (want anything else you might need?)`;

const LANGUAGE_INSTRUCTIONS = {
  darija:  'IMPORTANT: Always respond in Moroccan Darija (Moroccan Arabic dialect). Never switch to Modern Standard Arabic or any other language.',
  arabic:  'IMPORTANT: Always respond in Modern Standard Arabic (فصحى).',
  french:  'IMPORTANT: Always respond in French. Never switch to Arabic or English.',
  english: 'IMPORTANT: Always respond in English. Never switch to Arabic or French.',
};

const TONE_INSTRUCTIONS = {
  professional: 'Tone: professional and polished. Use formal language, avoid slang.',
  friendly:     'Tone: warm and friendly. Be approachable and personal.',
  casual:       'Tone: casual and relaxed. Use everyday language, contractions are fine.',
};

const STYLE_INSTRUCTIONS = {
  concise:  'Response style: keep answers short and direct — 1-2 sentences max.',
  detailed: 'Response style: give thorough, complete answers with context.',
  humorous: 'Response style: light-hearted and fun, add a touch of humour where appropriate.',
};

const buildSystemPrompt = (products = [], agentConfig = null) => {
  let prompt = agentConfig?.system_prompt_override || SYSTEM_PROMPT;

  // Append agent personality settings (only when not using a full override)
  if (!agentConfig?.system_prompt_override && agentConfig) {
    const extras = [];
    if (agentConfig.agent_name) extras.push(`Your name is ${agentConfig.agent_name}.`);
    if (agentConfig.language && LANGUAGE_INSTRUCTIONS[agentConfig.language]) extras.push(LANGUAGE_INSTRUCTIONS[agentConfig.language]);
    if (agentConfig.tone && TONE_INSTRUCTIONS[agentConfig.tone]) extras.push(TONE_INSTRUCTIONS[agentConfig.tone]);
    if (agentConfig.response_style && STYLE_INSTRUCTIONS[agentConfig.response_style]) extras.push(STYLE_INSTRUCTIONS[agentConfig.response_style]);
    if (extras.length > 0) prompt += `\n\n**Agent Settings:**\n${extras.join('\n')}`;
  }

  if (products && products.length > 0) {
    const catalog = products.map((p) => {
      const sizes = Array.isArray(p.sizes) ? p.sizes.join(', ') : (p.sizes || 'N/A');
      const colors = Array.isArray(p.colors) ? p.colors.join(', ') : (p.colors || 'N/A');
      const hasImage = p.image_url ? '📷' : '';
      return `• ${hasImage} ${p.name} — ${p.price} MAD | Sizes: ${sizes} | Colors: ${colors} | Stock: ${p.stock_quantity ?? 0}`;
    }).join('\n');

    prompt += `\n\n**CATALOG (use ONLY these products — no invented items):**\n${catalog}\n\nإذا سأل العميل على المنتجات، استعمل فقط هاد المنتجات اللي فوق.`;
  }

  return prompt;
};

const sendMessage = async (userMessage, conversationHistory = [], products = [], agentConfig = null) => {
  try {
    const systemPrompt = buildSystemPrompt(products, agentConfig);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages,
    });

    const assistantMessage = response.choices[0].message.content;

    logger.debug('OpenRouter response', {
      model: response.model,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    });

    let analysisResult = {
      intent: 'OTHER',
      entities: {},
      sentiment: 0,
      missing_fields: [],
      response: assistantMessage,
      flow_decision: 'awaiting_info',
      product_recommendations: [],
      usage: response.usage,
    };

    try {
      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analysisResult = {
          intent: parsed.intent || 'OTHER',
          entities: parsed.entities || {},
          sentiment: typeof parsed.sentiment === 'number' ? parsed.sentiment : 0,
          missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields : [],
          response: parsed.response || assistantMessage,
          flow_decision: parsed.flow_decision || 'awaiting_info',
          product_recommendations: Array.isArray(parsed.product_recommendations) ? parsed.product_recommendations : [],
          usage: response.usage,
        };
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON response, using fallback', { error: parseError.message });
    }

    return analysisResult;
  } catch (error) {
    logger.error('Error calling OpenRouter API', { error: error.message });
    throw new Error(`OpenRouter API error: ${error.message}`);
  }
};

const detectIntent = async (userMessage) => {
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      max_tokens: 20,
      messages: [
        { role: 'system', content: 'You are an intent classifier. Respond with ONLY one of: GREETING, PRODUCT_INFO, SHOW_PRODUCT, ORDER_CREATE, CONFIRM_ORDER, ORDER_TRACK, FAQ, COMPLAINT, ESCALATE, OTHER' },
        { role: 'user', content: `Classify: "${userMessage}"` },
      ],
    });
    return response.choices[0].message.content.trim().toUpperCase();
  } catch (error) {
    logger.error('Error detecting intent', { error: error.message });
    return 'OTHER';
  }
};

const extractEntities = async (userMessage) => {
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: 'You are an entity extractor. Return ONLY valid JSON with keys: product_name, quantity, size, color, order_id. Use null for missing fields.' },
        { role: 'user', content: `Extract entities from: "${userMessage}"` },
      ],
    });
    const text = response.choices[0].message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (error) {
    logger.error('Error extracting entities', { error: error.message });
    return {};
  }
};

const analyzeSentiment = async (userMessage) => {
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      max_tokens: 10,
      messages: [
        { role: 'system', content: 'You are a sentiment analyzer. Return ONLY a decimal number from -1.0 to 1.0. No explanation.' },
        { role: 'user', content: `Sentiment for: "${userMessage}"` },
      ],
    });
    const score = parseFloat(response.choices[0].message.content.trim());
    return isNaN(score) ? 0 : score;
  } catch (error) {
    logger.error('Error analyzing sentiment', { error: error.message });
    return 0;
  }
};

module.exports = { sendMessage, detectIntent, extractEntities, analyzeSentiment };
