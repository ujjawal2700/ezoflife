import express from 'express';
import {
    createPromotion,
    getVendorPromotions,
    togglePromotionStatus,
    deletePromotion,
    getApplicablePromos,
    validatePromotion,
    getAllPromotions,
    approvePromotion,
    rejectPromotion,
    updatePromotion,
    autogenerateCode
} from '../controllers/promotionController.js';
import { verifyAdmin, verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Discount codes are a direct revenue path: creating, editing or approving one
// changes what customers pay, so nothing here may be called anonymously.

// ─── Vendor-owned promotions (ownership enforced in the controller) ───────────
router.post('/', verifyUser, createPromotion);
router.put('/:id', verifyUser, updatePromotion);
router.patch('/:id/toggle', verifyUser, togglePromotionStatus);
router.delete('/:id', verifyUser, deletePromotion);
router.get('/vendor', verifyUser, getVendorPromotions);
router.get('/autogenerate-code', verifyUser, autogenerateCode);

// ─── Customer-facing ──────────────────────────────────────────────────────────
// Applying a code must be tied to a real session, otherwise codes can be
// brute-forced anonymously.
router.post('/validate', verifyUser, validatePromotion);
router.get('/applicable', verifyUser, getApplicablePromos);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/list', verifyAdmin, getAllPromotions);
router.patch('/admin/:id/approve', verifyAdmin, approvePromotion);
router.patch('/admin/:id/reject', verifyAdmin, rejectPromotion);

export default router;
