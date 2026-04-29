const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

let client = null;
let currentQR = null;
let isReady = false;

const createClient = () => {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', async (qr) => {
    currentQR = qr;
    isReady = false;
    qrcode.generate(qr, { small: true });
    logger.info('📱 New QR code generated — open http://localhost:3000/qr in your browser to scan it');
  });

  client.on('authenticated', () => {
    currentQR = null;
    logger.info('✅ WhatsApp authenticated!');
  });

  client.on('auth_failure', () => {
    logger.error('❌ WhatsApp auth failed — restart the server to get a new QR code');
  });

  client.on('ready', () => {
    isReady = true;
    currentQR = null;
    logger.info('🟢 WhatsApp agent is LIVE — send a message to test it!');
  });

  client.on('disconnected', (reason) => {
    isReady = false;
    logger.warn('WhatsApp disconnected', { reason });
  });

  return client;
};

const getClient = () => client;
const getCurrentQR = () => currentQR;
const getIsReady = () => isReady;

const sendMessage = async (phoneNumber, text) => {
  if (!client) throw new Error('WhatsApp client not initialized');
  const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
  await client.sendMessage(chatId, text);
};

module.exports = { createClient, getClient, getCurrentQR, getIsReady, sendMessage };
