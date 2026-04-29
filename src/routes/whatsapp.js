const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.post('/webhook', whatsappController.handleWebhook);
router.get('/webhook', whatsappController.verifyWebhook);

module.exports = router;
