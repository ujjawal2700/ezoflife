import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['UPI', 'Bank Transfer', 'Cash', 'Other'],
        default: 'UPI'
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Completed'
    },
    notes: String,
    paidAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Payout = mongoose.model('Payout', payoutSchema);

export default Payout;
