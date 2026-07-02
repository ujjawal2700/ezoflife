import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    rider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    items: [
        {
            serviceId: { type: String, required: true },
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            unit: { type: String, default: 'pc' },
            clothCount: { type: Number, default: 0 },
            photos: [{ type: String }]
        }
    ],
    status: {
        type: String,
        enum: [
            'ORDER_PLACED', 
            'PICKUP_ASSIGNED', 
            'RIDER_ARRIVING', 
            'IN_TRANSIT', 
            'RECEIVED_BY_VENDOR', 
            'PROCESSING', 
            'READY_FOR_DISPATCH', 
            'OUT_FOR_DELIVERY', 
            'DELIVERED', 
            'CANCELLED'
        ],
        default: 'ORDER_PLACED'
    },
    pickupSlot: {
        date: { type: String },
        time: { type: String }
    },
    deliverySlot: {
        date: { type: String },
        time: { type: String }
    },
    pickupAddress: {
        type: String,
        required: true
    },
    pickupLocation: {
        lat: { type: Number },
        lng: { type: Number }
    },
    dropAddress: {
        type: String,
        required: true
    },
    dropLocation: {
        lat: { type: Number },
        lng: { type: Number }
    },
    totalAmount: {
        type: Number,
        required: true
    },
    advanceAmount: {
        type: Number,
        default: 0
    },
    dueAmount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    orderId: {
        type: String,
        unique: true
    },
    specialInstructions: {
        type: String,
        default: ''
    },
    nearbyRiders: [
        {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            distance: String,
            name: String
        }
    ],
    pickupOtp: {
        type: String,
        default: null
    },
    deliveryOtp: {
        type: String,
        default: null
    },
    promoApplied: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Promotion',
        default: null
    },
     discountAmount: {
        type: Number,
        default: 0
    },
    walletAmountDeducted: {
        type: Number,
        default: 0
    },
    deliveryMode: {
        type: String,
        enum: ['Normal', 'Express'],
        default: 'Normal'
    },
    tier: {
        type: String,
        enum: ['Essential', 'Heritage'],
        default: 'Essential'
    },
    deliveryCharge: {
        type: Number,
        default: 0
    },
    shipmentDetails: {
        shipmentId: String,
        orderId: String, // Shiprocket's internal order ID
        awbCode: String,
        courierName: String,
        labelUrl: String,
        isQC: { type: Boolean, default: false },
        lastStatus: String,
        pickupTokenNumber: String
    },
    deliveryShipmentDetails: {
        shipmentId: String,
        orderId: String,
        awbCode: String,
        courierName: String,
        labelUrl: String,
        lastStatus: String,
        pickupTokenNumber: String
    },
    logisticsHandshakes: [
        {
            phase: { 
                type: String, 
                enum: ['Collection', 'Inbound', 'Fulfillment', 'Reverse', 'Completion'],
                required: true
            },
            otp: String,
            isVerified: { type: Boolean, default: false },
            verifiedAt: Date,
            initiator: { type: String }, // Who has the OTP (e.g., 'Rider')
            verifier: { type: String }   // Who enters the OTP (e.g., 'Customer', 'Vendor')
        }
    ],
    riderDetails: {
        name: String,
        phone: String,
        photo: String
    },
    priceBreakdown: {
        baseWithArea: { type: Number, default: 0 },
        expressSurcharge: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        logisticsFee: { type: Number, default: 0 },
        gstAmount: { type: Number, default: 0 }
    },
    customerPhotos: [{ type: String }],
    pickupStatus: {
        type: String,
        enum: ['none', 'scheduled', 'requested', 'picked', 'failed', 'rescheduled'],
        default: 'none'
    },
    pickupExpectedDate: Date,
    pickupTriggerTime: Date,
    deliveryTriggerTime: Date,
    deliveryStatus: {
        type: String,
        enum: ['none', 'scheduled', 'requested', 'delivered', 'failed'],
        default: 'none'
    },
    serviceTime: { type: Number, default: 0 },
    fallbackEnabled: { type: Boolean, default: false },
    orderType: {
        type: String,
        enum: ['Normal', 'Walk-In'],
        default: 'Normal'
    },
    riderDropOff: {
        type: Boolean,
        default: false
    },
    allocation_status: {
        type: String,
        enum: ['NONE', 'PROMO_EXCLUSIVE', 'GENERAL_POOL'],
        default: 'NONE'
    },
    allocation_expires_at: {
        type: Date,
        default: null
    },
    ledger: {
        vendorNetPayout: { type: Number, default: 0 },
        customerWalletCredit: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        spinzytCombinedRevenue: { type: Number, default: 0 },
        appliedPromoValue: { type: Number, default: 0 },
        promoOwnerType: { type: String, enum: ['PLATFORM', 'VENDOR', 'NONE'], default: 'NONE' }
    },
    statusHistory: [
        {
            status: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

// Pre-save hook to generate unique readable order ID and track status history
orderSchema.pre('save', async function(next) {
    if (!this.orderId) {
        const random = Math.floor(1000 + Math.random() * 9000);
        if (this.orderType === 'Walk-In') {
            this.orderId = `#WL-${random}`;
        } else {
            this.orderId = `#ON-${random}`;
        }
    }

    if (this.isNew || this.isModified('status')) {
        if (!this.statusHistory) {
            this.statusHistory = [];
        }
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });
    }
    next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
