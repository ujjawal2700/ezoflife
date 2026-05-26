import mongoose from 'mongoose';

const vendorMasterSupplySchema = new mongoose.Schema({
    skuId: {
        type: String,
        unique: true,
        required: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorSupplyCategory',
        required: true
    },
    hsnCode: {
        type: String,
        trim: true,
        default: '2800'
    },
    gst: {
        type: Number,
        default: 18
    },
    brand: {
        type: String,
        trim: true,
        default: 'Generic'
    },
    materialName: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: String, // e.g. "10 Litres", "5 Kg", "100 Pcs"
        required: true,
        trim: true
    },
    wholesaleRate: {
        type: Number,
        required: true,
        default: 0
    },
    bulkDiscount: {
        type: Number, // Percentage discount, e.g. 5 for 5%
        default: 0
    },
    bulkThreshold: {
        type: Number, // Minimum quantity for bulk discount, e.g. 50 units
        default: 0
    },
    isActive: {
        type: String,
        enum: ['y', 'n'],
        default: 'y'
    },
    deliveryFrequency: {
        type: String,
        trim: true,
        default: 'Weekly'
    },
    movFreeDelivery: {
        type: Number,
        default: 0
    },
    supplierId: {
        type: String,
        trim: true,
        default: 'SUP-001'
    },
    supplierFacilityName: {
        type: String,
        trim: true,
        default: 'Main Facility'
    },
    serialNumber: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const VendorMasterSupply = mongoose.model('VendorMasterSupply', vendorMasterSupplySchema);

export default VendorMasterSupply;
