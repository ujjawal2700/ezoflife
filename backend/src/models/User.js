import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['Customer', 'Vendor', 'Rider', 'Admin', 'Supplier'],
        default: 'Customer'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: function() {
            if (!this) return 'approved';
            return this.role === 'Vendor' ? 'pending' : 'approved';
        }
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    password: {
        type: String,
        default: ''
    },
    customerType: { 
        type: String, 
        enum: ['individual', 'retail'], 
        default: 'individual' 
    },
    address: {
        type: String,
        default: ''
    },
    addresses: [{
        type: { type: String, enum: ['Home', 'Office', 'Other'], default: 'Home' },
        address: { type: String, required: true },
        city: { type: String, default: '' },
        pincode: { type: String, default: '' },
        location: {
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 }
        },
        isDefault: { type: Boolean, default: false }
    }],
    shopDetails: {
        name: { type: String, default: '' },
        address: { type: String, default: '' },
        pincode: { type: String, default: '' },
        city: { type: String, default: '' },
        gst: { type: String, default: '' },
        services: [{
            id: { type: String },
            name: { type: String },
            adminRate: { type: Number },
            vendorRate: { type: Number },
            normalTime: { type: String, default: '' },
            expressTime: { type: String, default: '' },
            icon: { type: String },
            status: { 
                type: String, 
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending'
            },
            rejectionReason: { type: String, default: '' }
        }]
    },
    location: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    riderDetails: {
        address: { type: String, default: '' },
        vehicleModel: { type: String, default: '' },
        plateNumber: { type: String, default: '' }
    },
    supplierDetails: {
        businessName: { type: String, default: '' },
        address: { type: String, default: '' },
        city: { type: String, default: '' },
        pincode: { type: String, default: '' },
        gst: { type: String, default: '' }
    },
    documents: [
        {
            type: { type: String },
            url: { type: String }
        }
    ],
    bankDetails: {
        accountHolderName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        bankName: { type: String, default: '' }
    },
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    displayName: {
        type: String,
        default: ''
    },
    otp: {
        type: String,
        default: null
    },
    otpExpiry: {
        type: Date,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    fcmToken: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;
