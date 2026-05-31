import mongoose from 'mongoose';

const supplierApplicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Step 1: Identity & Category
    registeredBusinessName: { type: String, required: true },
    contactPersonName: { type: String, required: true },
    designation: { type: String, required: true },
    entityType: { type: String, enum: ['Supplier', 'Distributor/Wholesaler'], required: true },
    supplyCategories: [{ type: String }],

    // Step 2: Legal & Tax
    panNumber: { type: String, required: true },
    panDoc: { type: String, required: true },
    gstNumber: { type: String, required: true },
    gstDoc: { type: String, required: true },
    msmeDoc: { type: String },
    manufacturerAuthDoc: { type: String },

    // Step 3: Warehouse & Logistics
    warehouseAddress: { type: String, required: true },
    warehouseLocation: {
        lat: Number,
        lng: Number
    },
    city: { type: String },
    zone: { type: String },
    pincode: { type: String },
    serviceableAreas: [{ type: String }],
    vehicles: [{ type: String }],
    deliveryFrequency: [{ type: String }],
    warehousePhotos: [{ type: String }],
    dispatchPhoto: { type: String },
    ownerAadhaar: { type: String },

    // Step 4: Financials
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    cancelledChequeDoc: { type: String, required: true },
    priceListDoc: { type: String, required: true },
    
    // Verification Status
    isGstVerified: { type: Boolean, default: false },
    isBankVerified: { type: Boolean, default: false },
    bankVerificationAmount: { type: Number }, // Secret random amount sent
    
    onboardingStage: {
        type: String,
        enum: [
            'Initial_Approval_Pending', 
            'Product_Selection_Phase', 
            'Final_Approval_Pending', 
            'Onboarded'
        ],
        default: 'Initial_Approval_Pending'
    },
    selectedProducts: [{
        productName: String,
        category: String,
        capacityPerMonth: String,
        wholesaleRate: Number,
        bulkDiscount: Number,
        bulkThreshold: Number,
        movFreeDelivery: Number,
        images: [String]
    }],

    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Revision_Required'],
        default: 'Pending'
    },
    rejectionReason: { type: String },
    rejectionFlags: [String],
    appliedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date }
}, { timestamps: true });

const SupplierApplication = mongoose.model('SupplierApplication', supplierApplicationSchema);

export default SupplierApplication;
