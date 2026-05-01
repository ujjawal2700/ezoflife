import Promotion from '../models/Promotion.js';

export const createPromotion = async (req, res) => {
    try {
        const promotion = new Promotion(req.body);
        await promotion.save();
        res.status(201).json(promotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getVendorPromotions = async (req, res) => {
    try {
        const { vendorId } = req.query;
        if (!vendorId || vendorId === 'undefined') {
            return res.status(400).json({ message: 'Valid Vendor ID is required' });
        }
        const promotions = await Promotion.find({ vendorId }).sort({ createdAt: -1 });
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const togglePromotionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const promotion = await Promotion.findById(id);
        if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

        promotion.status = promotion.status === 'Active' ? 'Paused' : 'Active';
        await promotion.save();
        res.json(promotion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePromotion = async (req, res) => {
    try {
        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Promotion deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Customer facing: Validate a specific promo code
export const validatePromotion = async (req, res) => {
    try {
        const { code, vendorId, orderValue } = req.body;
        const promo = await Promotion.findOne({ 
            code: code.toUpperCase(), 
            vendorId,
            status: 'Active',
            expiryDate: { $gte: new Date() }
        });

        if (!promo) {
            return res.status(404).json({ message: 'Invalid or expired promo code' });
        }

        if (orderValue < promo.minOrderValue) {
            return res.status(400).json({ 
                message: `Minimum order value of ₹${promo.minOrderValue} required for this code` 
            });
        }

        if (promo.currentUsage >= promo.usageLimit) {
            return res.status(400).json({ message: 'Promo code usage limit reached' });
        }

        res.json(promo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Customer facing: Get applicable promos for a vendor
export const getApplicablePromos = async (req, res) => {
    try {
        const { vendorId } = req.query;
        console.log(`📡 [PROMO] Fetching applicable promos for Vendor: ${vendorId}`);
        
        if (!vendorId || vendorId === 'undefined') {
            console.warn('⚠️ [PROMO] No vendorId provided in query');
            return res.json([]);
        }

        const promos = await Promotion.find({ 
            vendorId, 
            status: 'Active',
            expiryDate: { $gte: new Date() }
        });
        
        console.log(`✅ [PROMO] Found ${promos.length} active promos for Vendor: ${vendorId}`);
        res.json(promos);
    } catch (error) {
        console.error('❌ [PROMO] Fetch Error:', error);
        res.status(500).json({ message: error.message });
    }
};
