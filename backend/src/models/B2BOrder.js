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
        enum: ['Open', 'Locked', 'Pending', 'Accepted', 'Dispatched', 'Delivered', 'Cancelled', 'Settled'],
        default: 'Open'
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
