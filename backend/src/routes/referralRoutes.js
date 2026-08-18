import express from 'express';
import Referral from '../models/Referral.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to record a new referral
router.post('/', verifyUser, async (req, res) => {
    try {
        const { referrer, referredPhone } = req.body;
        if (!referrer || !referredPhone) {
            return res.status(400).json({ error: 'Referrer and Referred Phone are required' });
        }
        
        // Find existing referral log to prevent duplicates
        const existing = await Referral.findOne({ referrer, referredPhone });
        if (existing) {
            return res.json(existing);
        }
        
        const referral = new Referral({
            referrer,
            referredPhone
        });
        await referral.save();
        res.status(201).json(referral);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
