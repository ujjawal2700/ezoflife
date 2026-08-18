import Promotion from '../models/Promotion.js';
import { isOwnerOrAdmin } from '../middleware/authMiddleware.js';
import { httpStatusForError } from '../utils/errorResponse.js';

export const createPromotion = async (req, res) => {
    try {
        const promoData = { ...req.body };

        // A PLATFORM promotion is auto-approved and costs the platform money, so
        // only an Admin may declare one. A vendor's promotion is always theirs
        // and always starts PENDING, whatever the body claims.
        if (promoData.owner_type === 'PLATFORM') {
            if (req.user?.role !== 'Admin') {
                return res.status(403).json({ message: 'Only an admin may create a platform promotion' });
            }
            promoData.approval_status = 'APPROVED';
        } else {
            promoData.approval_status = 'PENDING';
            if (req.user?.role !== 'Admin') {
                promoData.vendorId = req.user?.id;   // ignore any body-supplied owner
            }
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

        // Date overlap check for VENDOR promotions
        if (promoData.owner_type !== 'PLATFORM') {
            const { vendorId, start_date, expiryDate } = promoData;
            
            if (!vendorId) {
                return res.status(400).json({ message: 'Vendor ID is required for promotions' });
            }

            const newStart = new Date(start_date || Date.now());
            const newExpiry = new Date(expiryDate);

            if (isNaN(newStart.getTime()) || isNaN(newExpiry.getTime())) {
                return res.status(400).json({ message: 'Valid start date and expiry date are required' });
            }

            if (newStart > newExpiry) {
                return res.status(400).json({ message: 'Expiry date must be after the start date' });
            }

            // Find overlapping promotions for this vendor
            const overlappingPromo = await Promotion.findOne({
                vendorId: vendorId,
                owner_type: 'VENDOR',
                start_date: { $lte: newExpiry },
                expiryDate: { $gte: newStart }
            });

            if (overlappingPromo) {
                const existingStartStr = new Date(overlappingPromo.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                const existingExpiryStr = new Date(overlappingPromo.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                
                return res.status(400).json({ 
                    message: `You already have an overlapping promotion (${overlappingPromo.title}: ${existingStartStr} to ${existingExpiryStr}) scheduled in this date range. You can only create one promotion per date range.`
                });
            }
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
        // A vendor only ever sees their own promotions; Admins may query any.
        const vendorId = (req.user?.role === 'Admin' && req.query.vendorId)
            ? req.query.vendorId
            : req.user?.id;
        if (!vendorId || vendorId === 'undefined') {
            return res.status(400).json({ message: 'Valid Vendor ID is required' });
        }
        const promotions = await Promotion.find({ vendorId })
            .sort({ createdAt: -1 });
        res.json(promotions);
    } catch (error) {
        res.status(httpStatusForError(error)).json({ message: error.message });
    }
};

export const togglePromotionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const promotion = await Promotion.findById(id);
        if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

        if (!isOwnerOrAdmin(req, promotion.vendorId)) {
            return res.status(403).json({ message: 'You cannot modify this promotion' });
        }

        promotion.status = promotion.status === 'Active' ? 'Paused' : 'Active';
        await promotion.save();
        res.json(promotion);
    } catch (error) {
        res.status(httpStatusForError(error)).json({ message: error.message });
    }
};

export const deletePromotion = async (req, res) => {
    try {
        const promo = await Promotion.findById(req.params.id);
        if (!promo) return res.status(404).json({ message: 'Promotion not found' });

        if (!isOwnerOrAdmin(req, promo.vendorId)) {
            return res.status(403).json({ message: 'You cannot delete this promotion' });
        }

        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Promotion deleted' });
    } catch (error) {
        res.status(httpStatusForError(error)).json({ message: error.message });
    }
};

// Customer facing: Validate a specific promo code
export const validatePromotion = async (req, res) => {
    try {
        const { code, vendorId, orderValue } = req.body;

        // Without this, a missing code throws on .toUpperCase() and surfaces as a 500.
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ message: 'Promo code is required' });
        }

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
        res.status(httpStatusForError(error)).json({ message: error.message });
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
        res.status(httpStatusForError(error)).json({ message: error.message });
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
        res.status(httpStatusForError(error)).json({ message: error.message });
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
        res.status(httpStatusForError(error)).json({ message: error.message });
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
        res.status(httpStatusForError(error)).json({ message: error.message });
    }
};

export const updatePromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const promo = await Promotion.findById(id);
        if (!promo) return res.status(404).json({ message: 'Promotion not found' });

        if (!isOwnerOrAdmin(req, promo.vendorId)) {
            return res.status(403).json({ message: 'You cannot modify this promotion' });
        }

        const updates = req.body;

        if (promo.owner_type === 'VENDOR') {
            if (updates.discountValue !== undefined) {
                promo.discountValue = Number(updates.discountValue);
                promo.discount_value = Number(updates.discountValue);
            }
            if (updates.minOrderValue !== undefined) {
                promo.minOrderValue = Number(updates.minOrderValue);
                promo.min_order_value = Number(updates.minOrderValue);
            }
            if (updates.is_exclusive_window_eligible !== undefined) {
                promo.is_exclusive_window_eligible = !!updates.is_exclusive_window_eligible;
            }
        } else {
            Object.assign(promo, updates);
        }

        await promo.save();
        res.json(promo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const autogenerateCode = async (req, res) => {
    try {
        const { vendorId } = req.query;
        if (!vendorId) {
            return res.status(400).json({ message: 'Vendor ID is required' });
        }

        const User = (await import('../models/User.js')).default;
        const vendor = await User.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        let vendorName = vendor.shopDetails?.name || vendor.displayName || vendor.name || 'VEN';
        vendorName = vendorName.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (vendorName.length < 3) {
            vendorName = (vendorName + 'VEN').substring(0, 3);
        } else {
            vendorName = vendorName.substring(0, 3);
        }

        const prefix = `VEN${vendorName}`;

        const lastPromo = await Promotion.findOne({
            vendorId: vendorId,
            owner_type: 'VENDOR',
            code: new RegExp(`^${prefix}\\d{3}$`)
        }).sort({ createdAt: -1 });

        let nextNum = 1;
        if (lastPromo) {
            const match = lastPromo.code.match(/\d{3}$/);
            if (match) {
                const lastNum = parseInt(match[0], 10);
                nextNum = lastNum + 1;
                if (nextNum > 999) {
                    nextNum = 1;
                }
            }
        }

        const suffix = String(nextNum).padStart(3, '0');
        const code = `${prefix}${suffix}`;

        res.json({ code });
    } catch (error) {
        res.status(httpStatusForError(error)).json({ message: error.message });
    }
};
