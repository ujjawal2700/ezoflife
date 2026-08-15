import express from 'express';
import { requestHandshake, verifyHandshake } from '../controllers/logisticsController.js';
import { handleLogisticsWebhook } from '../controllers/logisticsWebhookController.js';

const router = express.Router();

// Chain-of-custody OTP handshakes
router.post('/request', requestHandshake);
router.post('/verify', verifyHandshake);

// Provider status callbacks. Authenticated by LOGISTICS_WEBHOOK_SECRET rather
// than a JWT — the caller is Shiprocket, not a logged-in user.
router.post('/webhook', handleLogisticsWebhook);

export default router;
