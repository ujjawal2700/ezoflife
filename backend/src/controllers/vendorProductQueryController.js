import VendorProductQuery from '../models/VendorProductQuery.js';
import User from '../models/User.js';
import VendorMasterSupply from '../models/VendorMasterSupply.js';
import SupplierApplication from '../models/SupplierApplication.js';
import mongoose from 'mongoose';

export const sendMessage = async (req, res) => {
    try {
        const { vendorId, supplierId, productId, b2bOrderId, message, sender } = req.body;

        if (!vendorId || !supplierId || !productId || !message || !sender) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newQuery = new VendorProductQuery({
            vendorId,
            supplierId,
            productId,
            b2bOrderId,
            message,
            sender
        });

        await newQuery.save();
        res.status(201).json(newQuery);
    } catch (error) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

export const getSuppliersList = async (req, res) => {
    try {
        const { vendorId } = req.params;

        const uniqueSupplierIds = await VendorProductQuery.distinct('supplierId', { vendorId: new mongoose.Types.ObjectId(vendorId) });

        const suppliers = await User.find(
            { _id: { $in: uniqueSupplierIds } },
            'name displayName profilePicture phone email'
        ).lean();

        // Also fetch SupplierApplication data to get business names if available
        const supplierApps = await SupplierApplication.find({ user: { $in: uniqueSupplierIds } }).lean();
        
        const enhancedSuppliers = suppliers.map(supplier => {
            const app = supplierApps.find(a => a.user.toString() === supplier._id.toString());
            return {
                ...supplier,
                businessName: app?.companyName || supplier.displayName || supplier.name
            };
        });

        res.status(200).json(enhancedSuppliers);
    } catch (error) {
        console.error('Error in getSuppliersList:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
};

export const getChatHistory = async (req, res) => {
    try {
        const { vendorId, supplierId } = req.params;
        const { productId } = req.query;

        const filter = {
            vendorId: new mongoose.Types.ObjectId(vendorId),
            supplierId: new mongoose.Types.ObjectId(supplierId)
        };

        if (productId && productId !== 'undefined' && productId !== 'null') {
            filter.productId = new mongoose.Types.ObjectId(productId);
        }

        const queries = await VendorProductQuery.find(filter)
            .sort({ createdAt: 1 })
            .populate('productId', 'materialName name images image')
            .populate('b2bOrderId', 'b2bOrderId')
            .lean();

        res.status(200).json(queries);
    } catch (error) {
        console.error('Error in getChatHistory:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
};
