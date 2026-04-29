import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    answer: {
        type: String,
        required: true,
        trim: true
    },
    order: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        default: 'General'
    },
    targetRole: {
        type: String,
        enum: ['Customer', 'Vendor', 'Supplier', 'All'],
        default: 'All'
    }
}, { timestamps: true });

const FAQ = mongoose.model('FAQ', faqSchema);

export default FAQ;
