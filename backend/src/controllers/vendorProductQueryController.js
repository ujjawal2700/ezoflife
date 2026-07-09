import VendorProductQuery from '../models/VendorProductQuery.js';
import User from '../models/User.js';
import VendorMasterSupply from '../models/VendorMasterSupply.js';
import SupplierApplication from '../models/SupplierApplication.js';
import Notification from '../models/Notification.js';
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

        // Create notification for the receiver
        try {
            const isVendorSender = sender === 'Vendor';
            const recipientId = isVendorSender ? supplierId : vendorId;
            const recipientRole = isVendorSender ? 'supplier' : 'vendor';
            
            // Get sender profile details to customize the notification message
            const senderUser = await User.findById(isVendorSender ? vendorId : supplierId);
            const senderName = senderUser?.displayName || senderUser?.facilityName || senderUser?.supplierDetails?.businessName || (isVendorSender ? 'Vendor' : 'Supplier');

            const notification = new Notification({
                recipient: recipientId,
                role: recipientRole,
                title: isVendorSender ? 'New Message from Vendor' : 'New Message from Supplier',
                message: `${senderName}: "${message.length > 50 ? message.slice(0, 50) + '...' : message}"`,
                type: 'b2b_chat',
                payload: {
                    b2bOrderId,
                    productId,
                    vendorId,
                    supplierId,
                    queryId: newQuery._id
                }
            });
            await notification.save();
        } catch (notifErr) {
            console.error('Error creating chat notification:', notifErr);
            // Don't fail the message request if notification fails
        }

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
