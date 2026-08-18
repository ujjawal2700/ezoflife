import express from 'express';
import { sendMessage, getSuppliersList, getChatHistory } from '../controllers/vendorProductQueryController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/message', verifyUser, sendMessage);
router.get('/suppliers/:vendorId', getSuppliersList);
router.get('/chat/:vendorId/:supplierId', getChatHistory);

export default router;
