import mongoose from 'mongoose';

const b2bOrderSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    items: [
        {
            materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorMasterSupply' },
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }
        }
    ],
    status: {
        type: String,
        enum: [
            'CART', 'PENDING_PAYMENT', 'SUBMITTED', 'ACCEPTED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'REJECTED', 'CANCELLED', 'SETTLED',
            'Submitted', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Settled'
        ],
        default: 'SUBMITTED'
    },
    cycleId: {
        type: String,
        required: true
    },
    deliveryDay: {
        type: String,
        required: true
    },
    deliveryDate: {
        type: Date,
        required: true
    },
    pincode: { 
        type: String, 
        required: true 
    },
    city: {
        type: String,
        required: false
    },
    shippingAddress: {
        type: String,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    platformFee: {
        type: Number,
        required: true,
        default: 0
    },
    razorpayOrderId: {
        type: String,
        required: false
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    escrowStatus: {
        type: String,
        enum: ['Held', 'Released', 'Refunded'],
        default: 'Held'
    },
    b2bOrderId: {
        type: String,
        unique: true
    },
    deliveryOtp: {
        type: String,
        required: false
    }
}, { timestamps: true });

b2bOrderSchema.pre('save', async function(next) {
    if (!this.b2bOrderId) {
        const random = Math.floor(100000 + Math.random() * 900000);
        this.b2bOrderId = `B2B-${random}`;
    }
    next();
});

const B2BOrder = mongoose.model('B2BOrder', b2bOrderSchema);

export default B2BOrder;
