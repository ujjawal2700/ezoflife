import mongoose from 'mongoose';

const supplierApplicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Step 1: Personal Details
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },

    // Step 2: Bank Details
    bankAccountName: { type: String, required: true },
    bankName: { type: String, required: true },
    bankAccountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },

    // Step 3: Business Details
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    gstNumber: { type: String },
    businessAddress: { type: String, required: true },

    // Step 4: Documents (URLs)
    gstDoc: { type: String },
    udyogAadharDoc: { type: String },
    aadharDoc: { type: String, required: true },
    addressProofDoc: { type: String, required: true },

    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    rejectionReason: { type: String },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: { type: Date }
}, { timestamps: true });

const SupplierApplication = mongoose.model('SupplierApplication', supplierApplicationSchema);

export default SupplierApplication;
