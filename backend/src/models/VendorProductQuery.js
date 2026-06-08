import mongoose from 'mongoose';

const vendorProductQuerySchema = new mongoose.Schema({
    vendorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    supplierId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'VendorMasterSupply', 
        required: true 
    },
    b2bOrderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'B2BOrder' 
    },
    message: { 
        type: String, 
        required: true 
    },
    sender: { 
        type: String, 
        enum: ['Vendor', 'Supplier'], 
        required: true 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

const VendorProductQuery = mongoose.model('VendorProductQuery', vendorProductQuerySchema);

export default VendorProductQuery;
