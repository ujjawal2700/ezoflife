import express from 'express';
import { getLegalDocument, updateLegalDocument, getAllLegalDocuments } from '../controllers/legalController.js';

const router = express.Router();

router.get('/all', getAllLegalDocuments);
router.get('/:type', getLegalDocument);
router.post('/:type', updateLegalDocument);

export default router;
