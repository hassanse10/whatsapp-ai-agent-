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
- تساعد فإنشاء الطلبيات بطريقة طبيعية (أحصل على المنتجات، الكمية، القياس، اللون، الاسم، العنوان، طريقة الدفع)
- تقترح عليهم منتجات إضافية اللي تناسب ما خاصهم
- تعطي معلومات عن تتبع الطلبيات
- تساعد في إلغاء أو تعديل الطلبيات الموجودة
- تجاوب على الأسئلة الشائعة
- تتعامل مع الشكايات باحترافية وتحاول تحلها

**CRITICAL - Return your response as JSON in this exact format:**
{
  "intent": "ORDER_CREATE|ORDER_TRACK|ORDER_CANCEL|ORDER_MODIFY|PRODUCT_INFO|FAQ|GREETING|COMPLAINT|ESCALATE|OTHER",
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

**Product Recommendations Examples:**
- If customer buys winter jacket, suggest leather belt or warm socks
- If customer buys jeans, suggest belt or t-shirt
- If customer buys sneakers, suggest cotton socks
- If customer buys leather bag, suggest belt for matching style
- Always ask: "واش بغيتي شي حاجة أخرى تحتاج؟" (want anything else you might need?)

**Intents:**
- GREETING: Customer says hi/مرحبا/سلام/شنو اللي بك
- PRODUCT_INFO: Customer asks about products/prices/colors/sizes or wants recommendations
- ORDER_CREATE: Customer wants to place new order
- ORDER_TRACK: Customer asks about order status/shipping
- ORDER_CANCEL: Customer wants to cancel existing order (إلغي، بطل، غادي نسحبها)
- ORDER_MODIFY: Customer wants to change order items/address/payment (غير، عدل، بدل، صحح)
- FAQ: Customer asks about returns/shipping/payment/warranty/discount
- COMPLAINT: Customer has problem/complaint/issue
- ESCALATE: Customer asks for human agent or very angry
- OTHER: Doesn't fit above`;

const sendMessage = async (userMessage, conversationHistory = []) => {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      max_tokens: 1024,
      messages,
    });

    const assistantMessage = response.choices[0].message.content;

    logger.debug('OpenRouter response', {
      model: response.model,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    });

    // Parse JSON response from Claude
    let analysisResult = {
      intent: 'OTHER',
      entities: {},
      sentiment: 0,
      missing_fields: [],
      response: assistantMessage,
      flow_decision: 'awaiting_info',
      usage: response.usage,
    };

    try {
      // Try to extract JSON from Claude's response
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
          usage: response.usage,
        };
      }
    } catch (parseError) {
      logger.warn('Failed to parse Claude JSON response, using fallback', { error: parseError.message });
      // Fallback: text response will be used as-is
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
        {
          role: 'system',
          content: 'You are an intent classifier. Respond with ONLY one of these labels: GREETING, PRODUCT_INFO, ORDER_CREATE, ORDER_TRACK, FAQ, COMPLAINT, ESCALATE, OTHER',
        },
        {
          role: 'user',
          content: `Classify this customer message: "${userMessage}"`,
        },
      ],
    });

    const intent = response.choices[0].message.content.trim().toUpperCase();
    logger.debug('Intent detected', { intent, message: userMessage });
    return intent;
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
        {
          role: 'system',
          content: 'You are an entity extractor. Return ONLY valid JSON with keys: product_name, quantity, size, color, order_id. Use null for missing fields.',
        },
        {
          role: 'user',
          content: `Extract entities from: "${userMessage}"`,
        },
      ],
    });

    const text = response.choices[0].message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const entities = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    logger.debug('Entities extracted', { entities });
    return entities;
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
        {
          role: 'system',
          content: 'You are a sentiment analyzer. Return ONLY a decimal number from -1.0 (very negative) to 1.0 (very positive). No explanation.',
        },
        {
          role: 'user',
          content: `Sentiment score for: "${userMessage}"`,
        },
      ],
    });

    const score = parseFloat(response.choices[0].message.content.trim());
    logger.debug('Sentiment analyzed', { score });
    return isNaN(score) ? 0 : score;
  } catch (error) {
    logger.error('Error analyzing sentiment', { error: error.message });
    return 0;
  }
};

module.exports = {
  sendMessage,
  detectIntent,
  extractEntities,
  analyzeSentiment,
};
