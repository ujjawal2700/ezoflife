import mongoose from 'mongoose';

const vendorSupplyCategorySchema = new mongoose.Schema({
    mainCategory: {
        type: String,
        required: true,
        trim: true
    },
    subCategory: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    image: {
        type: String
    },
    excelCategoryId: {
        type: Number
    }
}, { timestamps: true });

// Avoid duplicate combinations
vendorSupplyCategorySchema.index({ mainCategory: 1, subCategory: 1 }, { unique: true });

const VendorSupplyCategory = mongoose.model('VendorSupplyCategory', vendorSupplyCategorySchema);

export default VendorSupplyCategory;
