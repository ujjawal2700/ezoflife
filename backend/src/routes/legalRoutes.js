import express from 'express';
import { getLegalDocument, updateLegalDocument, getAllLegalDocuments } from '../controllers/legalController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/all', getAllLegalDocuments);
router.get('/:type', getLegalDocument);

// Admin-only route
router.post('/:type', verifyAdmin, updateLegalDocument);

export default router;
