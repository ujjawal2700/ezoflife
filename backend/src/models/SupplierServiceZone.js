import mongoose from 'mongoose';

const supplierServiceZoneSchema = new mongoose.Schema({
    zoneId: {
        type: String,
        unique: true,
        required: true
    },
    supplierId: {
        type: String,
        required: true,
        trim: true,
        default: 'SUP-001'
    },
    zoneName: {
        type: String,
        required: true,
        trim: true
    },
    pincodes: {
        type: [String],
        default: [],
        required: true
    },
    deliveryCharges: {
        type: Number,
        default: 0
    },
    minOrderValue: {
        type: Number,
        default: 0
    },
    supplierPlatformMultiplier: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const SupplierServiceZone = mongoose.model('SupplierServiceZone', supplierServiceZoneSchema);

export default SupplierServiceZone;
