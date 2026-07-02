import Promotion from '../models/Promotion.js';

export const createPromotion = async (req, res) => {
    try {
        const promoData = { ...req.body };
        if (promoData.owner_type === 'PLATFORM') {
            promoData.approval_status = 'APPROVED';
        } else {
            promoData.approval_status = 'PENDING';
        }
        
        // Map camelCase fields to snake_case fields if passed
        if (promoData.discountType) {
            promoData.discount_type = promoData.discountType;
        }
        if (promoData.discountValue) {
            promoData.discount_value = promoData.discountValue;
        }
        if (promoData.minOrderValue) {
            promoData.min_order_value = promoData.minOrderValue;
        }

        const promotion = new Promotion(promoData);
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
        const promotions = await Promotion.find({ vendorId })
            .populate('selected_services')
            .sort({ createdAt: -1 });
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
            status: 'Active',
            approval_status: 'APPROVED',
            expiryDate: { $gte: new Date() },
            owner_type: 'PLATFORM'
        });

        if (!promo) {
            return res.status(404).json({ message: 'Invalid or expired promo code' });
        }

        const minVal = promo.min_order_value !== undefined ? promo.min_order_value : (promo.minOrderValue || 0);
        if (orderValue < minVal) {
            return res.status(400).json({ 
                message: `Minimum order value of ₹${minVal} required for this code` 
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

        const User = (await import('../models/User.js')).default;
        const ServiceArea = (await import('../models/ServiceArea.js')).default;

        const vendor = await User.findById(vendorId);
        let geofenceId = null;
        if (vendor && vendor.location?.lat) {
            const serviceArea = await ServiceArea.findOne({
                isActive: true,
                boundary: {
                    $geoIntersects: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [Number(vendor.location.lng), Number(vendor.location.lat)]
                        }
                    }
                }
            });
            if (serviceArea) {
                geofenceId = serviceArea._id;
            }
        }

        const promos = await Promotion.find({ 
            status: 'Active',
            approval_status: 'APPROVED',
            expiryDate: { $gte: new Date() },
            owner_type: 'PLATFORM',
            $or: [{ geofence_id: geofenceId }, { geofence_id: null }]
        });
        
        console.log(`✅ [PROMO] Found ${promos.length} active promos for Vendor: ${vendorId}`);
        res.json(promos);
    } catch (error) {
        console.error('❌ [PROMO] Fetch Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find({})
            .populate('vendorId', 'name email phone shopDetails')
            .populate('selected_services')
            .populate('geofence_id')
            .sort({ createdAt: -1 });
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approvePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

        promotion.approval_status = 'APPROVED';
        await promotion.save();
        res.json(promotion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const rejectPromotion = async (req, res) => {
    try {
        const { rejection_reason } = req.body;
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

        promotion.approval_status = 'REJECTED';
        promotion.rejection_reason = rejection_reason || 'Rejected by administrator';
        await promotion.save();
        res.json(promotion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
