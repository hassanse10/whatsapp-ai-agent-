require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('ready', async () => {
  console.log('✅ Connected — sending test message...');
  const number = '212642444193@c.us';
  await client.sendMessage(number, `👋 Hello! Your WhatsApp AI Agent is working perfectly!

Here's what I can do:
🛍️ Help you order products
📦 Track your orders
❓ Answer your questions
🆘 Connect you with a human agent

Try sending me: "Hi" to get started!`);
  console.log('✅ Message sent!');
  await client.destroy();
  process.exit(0);
});

client.on('auth_failure', () => {
  console.error('❌ Auth failed — restart the main server and re-scan QR');
  process.exit(1);
});

client.initialize();
