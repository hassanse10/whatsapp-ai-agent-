# WhatsApp AI Agent - Production-Ready E-Commerce Customer Service Bot

A complete, production-ready WhatsApp chatbot for e-commerce customer service powered by Claude AI and Node.js. Handles order management, tracking, FAQs, complaints, and escalation to human agents.

## Features

✅ **WhatsApp Integration** - Receive and send messages via Meta WhatsApp Business API  
✅ **AI-Powered Conversations** - Claude 3.5 Sonnet for intelligent responses  
✅ **Intent Recognition** - Automatic detection of customer intent (greeting, orders, tracking, etc.)  
✅ **Entity Extraction** - Extract product details, order IDs, preferences from messages  
✅ **Order Management** - Create, track, and manage customer orders  
✅ **Sentiment Analysis** - Detect unhappy customers and escalate automatically  
✅ **Multi-Step Flows** - Guide customers through order creation process  
✅ **Escalation System** - Route complex issues to human agents  
✅ **Customer History** - Persistent storage of conversations and orders  
✅ **Production Logging** - Comprehensive logging for debugging and monitoring  

## Tech Stack

- **Runtime**: Node.js 18+
- **Web Framework**: Express.js
- **Database**: PostgreSQL
- **AI**: Claude API (Anthropic)
- **WhatsApp**: Meta WhatsApp Business API
- **Language**: JavaScript (ES6+)

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 13+
- Docker and Docker Compose (optional, for database)
- Meta WhatsApp Business Account
- Anthropic API key (Claude API)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository>
cd whatsapp-ai-agent
npm install
```

### 2. Setup PostgreSQL

**Option A: Using Docker (Recommended)**

```bash
docker-compose up -d
```

**Option B: Local PostgreSQL**

Create a database:
```sql
createdb whatsapp_agent
psql whatsapp_agent < migrations/init.sql
```

### 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/whatsapp_agent
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_agent

# Claude AI
CLAUDE_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# WhatsApp (See setup guide below)
WHATSAPP_TOKEN=your-token-here
WHATSAPP_PHONE_ID=your-phone-id-here
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id-here
WEBHOOK_VERIFY_TOKEN=your-webhook-token-here

# Server
NODE_ENV=development
PORT=3000
```

### 4. Get Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new API key
5. Copy it to your `.env` file as `CLAUDE_API_KEY`

### 5. Setup WhatsApp Business API

#### Step 1: Create Meta Business Account
1. Go to [business.facebook.com](https://business.facebook.com)
2. Create a business account if you don't have one
3. Go to Settings → Business

#### Step 2: Get WhatsApp Business API Access
1. In Meta for Developers, go to Apps → Create App
2. Choose "Business" as app type
3. Add WhatsApp product
4. Go to WhatsApp → Getting Started
5. You'll get:
   - Business Account ID
   - Phone Number ID
   - Temporary Access Token

#### Step 3: Get Permanent Access Token
1. Go to Settings → User Roles
2. Create a System User
3. Grant it "Manage WhatsApp Business Account" permission
4. Generate a permanent access token
5. Copy to `.env` as `WHATSAPP_TOKEN`

#### Step 4: Configure Webhook
1. In WhatsApp Getting Started, click "Configure webhook"
2. Enter your webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
3. Enter Verify Token (same as `WEBHOOK_VERIFY_TOKEN` in `.env`)
4. Subscribe to: `messages`, `message_status`

### 6. Deploy to Production

#### Using Ngrok for Local Testing

```bash
npm install -g ngrok
ngrok http 3000
```

Use the provided URL as your webhook domain.

#### Deploy to Cloud

```bash
# Build
npm run build

# Start production server
NODE_ENV=production npm start
```

**Recommended Platforms:**
- Heroku
- Railway
- AWS EC2 + RDS
- Digital Ocean
- Render

### 7. Start the Application

```bash
npm start
```

Server will start on http://localhost:3000

## API Endpoints

### Health Check

```
GET /health
```

Returns: `{ status: 'ok', timestamp, uptime }`

### WhatsApp Webhook

```
GET /api/whatsapp/webhook
POST /api/whatsapp/webhook
```

Receives WhatsApp messages and processes them.

## Project Structure

```
whatsapp-ai-agent/
├── src/
│   ├── index.js                          # Entry point
│   ├── routes/
│   │   └── whatsapp.js                   # WhatsApp routes
│   ├── controllers/
│   │   └── whatsappController.js         # Message handlers
│   ├── services/
│   │   ├── claudeService.js              # Claude API integration
│   │   ├── conversationService.js        # Conversation management
│   │   ├── orderService.js               # Order operations
│   │   ├── shippingService.js            # Package tracking
│   │   └── sentimentService.js           # Sentiment analysis
│   ├── agents/
│   │   ├── intentHandlers.js             # Intent handlers
│   │   └── conversationFlowManager.js    # Flow management
│   ├── models/
│   │   ├── customer.js                   # Customer data
│   │   ├── conversation.js               # Conversation data
│   │   └── order.js                      # Order data
│   ├── config/
│   │   ├── database.js                   # DB connection pool
│   │   └── constants.js                  # App constants
│   └── utils/
│       ├── logger.js                     # Winston logger
│       ├── validators.js                 # Input validation
│       └── helpers.js                    # Utility functions
├── migrations/
│   └── init.sql                          # Database schema
├── .env.example                          # Environment template
├── docker-compose.yml                    # PostgreSQL setup
├── package.json
└── README.md
```

## Usage Examples

### 1. Order Creation

**User**: "I want to order 2 blue t-shirts size M"

**Bot**: 
```
✅ Added to order:
• 2x Blue T-Shirt
  Size: M | Color: Blue
  Price: $59.98

Current order total: $59.98

Would you like to:
1. Add another item
2. Confirm and place the order
3. Cancel this order
```

### 2. Order Tracking

**User**: "Where's my order #ORD-123456-789"

**Bot**:
```
📦 Order Summary
Order Number: ORD-123456-789
Status: shipped
Total: $129.97

Items:
1. Blue T-Shirt
   Qty: 2 | Size: M | Color: Blue | $59.98
2. Sneakers
   Qty: 1 | Size: 10 | Color: White | $99.99

Tracking: SHIP-ABC123XYZ

Recent Updates:
• 2024-01-15 14:30:00
  Out for delivery with driver
  Location: Local Delivery
```

### 3. FAQ Query

**User**: "What's your return policy?"

**Bot**: "We offer 30-day returns on all items. Items must be unworn and in original packaging. Contact our support team to initiate a return."

### 4. Complaint Escalation

**User**: "This product is broken and I'm very upset!"

**Bot**: "I'm connecting you to our human support team now..."

## Database Schema

### customers
- `id` - Primary key
- `phone_number` - Unique WhatsApp number
- `name` - Customer name
- `email` - Contact email
- `first_contact_date` - When customer first contacted
- `last_contact_date` - Last interaction timestamp

### conversations
- `id` - Primary key
- `customer_id` - Foreign key to customers
- `status` - 'active', 'awaiting_input', 'escalated', 'closed'
- `flow_state` - JSON with multi-step flow data
- `message_count` - Number of messages in conversation
- `started_at`, `ended_at` - Timestamps

### messages
- `id` - Primary key
- `conversation_id` - Foreign key
- `role` - 'user' or 'bot'
- `content` - Message text
- `intent` - Detected intent
- `sentiment` - Sentiment score (-1.0 to 1.0)
- `entities` - Extracted data (JSON)

### orders
- `id` - Primary key
- `customer_id` - Foreign key
- `order_number` - Unique order ID
- `status` - 'pending', 'confirmed', 'shipped', 'delivered'
- `total_price` - Order total
- `tracking_number` - Shipping tracking
- `estimated_delivery` - Expected delivery date

### order_items
- Links to orders
- `product_name`, `quantity`, `size`, `color`, `price`

### escalations
- `id` - Primary key
- `conversation_id` - Which conversation
- `customer_id` - Which customer
- `reason` - Why escalated
- `assigned_to` - Human agent
- `status` - 'open', 'resolved'

## Key Features Explained

### Intent Recognition

Automatically detects:
- `GREETING` - Customer says hello
- `PRODUCT_INFO` - Asking about products
- `ORDER_CREATE` - Wants to buy something
- `ORDER_TRACK` - Wants to track order
- `FAQ` - Has a question
- `COMPLAINT` - Unhappy or upset
- `ESCALATE` - Wants human agent

### Multi-Step Order Flow

1. User says they want to order
2. Bot suggests available products
3. User provides details (product, quantity, size, color)
4. Bot adds to draft order
5. User can add more items or confirm
6. Bot confirms and creates order
7. Order stored in database with tracking

### Sentiment Analysis

- Messages analyzed for emotional tone
- Scores from -1.0 (very angry) to 1.0 (very happy)
- Negative sentiment triggers automatic escalation
- Human agents prioritized for upset customers

### Conversation Context

- Last 10 messages stored and retrieved
- Claude AI uses full context for better responses
- Supports multi-message conversations
- Maintains state across messages

## Monitoring & Logging

Logs are saved to `./logs/`:

```
logs/
├── all.log       # All logs
├── error.log     # Errors only
```

Log levels: `debug`, `info`, `warn`, `error`

View logs:
```bash
tail -f logs/all.log
```

## Performance Optimization

- Connection pooling for database
- Rate limiting (100 requests per 15 minutes)
- Helmet for security headers
- CORS configuration
- Efficient conversation history queries

## Security

- API keys in `.env` (never committed)
- Helmet protection against common attacks
- CORS enabled for allowed origins
- Input validation on all endpoints
- SQL injection prevention with parameterized queries
- Rate limiting to prevent abuse

## Troubleshooting

### WhatsApp Messages Not Received

1. Check webhook URL is publicly accessible
2. Verify `WEBHOOK_VERIFY_TOKEN` matches Meta settings
3. Check firewall isn't blocking port 3000
4. View logs: `tail -f logs/error.log`

### Database Connection Error

```
psql: could not connect to server
```

Solution:
```bash
# Check PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart postgres

# Verify connection string in .env
```

### Claude API Error

```
Error calling Claude API
```

Solution:
1. Check `CLAUDE_API_KEY` is correct
2. Verify API key has proper permissions
3. Check rate limiting (free tier: 1M tokens/month)
4. View logs for detailed error

### Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Use different port
PORT=3001 npm start
```

## Testing

### Manual Testing

1. Send test message to bot on WhatsApp
2. Check logs for processing
3. Verify response received

### Automated Testing (Future)

```bash
npm test
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment |
| `PORT` | No | 3000 | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection |
| `CLAUDE_API_KEY` | Yes | - | Claude API key |
| `WHATSAPP_TOKEN` | Yes | - | WhatsApp API token |
| `WHATSAPP_PHONE_ID` | Yes | - | WhatsApp phone ID |
| `WEBHOOK_VERIFY_TOKEN` | Yes | - | Webhook verification |
| `LOG_LEVEL` | No | info | Logging level |

## Known Limitations & Future Enhancements

### Current Limitations
- Single language (English) support
- Mock shipping provider (easily swappable)
- Hardcoded FAQ knowledge base
- No multi-media support (images, documents)

### Planned Features
- Multi-language support
- Integration with real shipping APIs
- Dynamic knowledge base management
- Image/file handling
- Analytics dashboard
- Admin panel for escalations
- Customer profile management
- Promotions and loyalty tracking
- Payment integration
- Webhook retry logic

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique `WEBHOOK_VERIFY_TOKEN`
- [ ] Enable HTTPS for webhook URL
- [ ] Configure proper CORS origin
- [ ] Set up error monitoring (Sentry, Rollbar)
- [ ] Configure log rotation
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Test failover/recovery
- [ ] Document escalation process
- [ ] Train human agents
- [ ] Monitor API costs (Claude, WhatsApp)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues, feature requests, or questions:
1. Check troubleshooting section
2. Review logs for errors
3. Create an issue on GitHub

## Author

Created with ❤️ for e-commerce customer service teams

## Resources

- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [Claude API Documentation](https://docs.anthropic.com)
- [Express.js Guide](https://expressjs.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)

---

**Ready to deploy?** Follow the Quick Start section to get up and running in minutes!
