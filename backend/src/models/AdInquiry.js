import mongoose from 'mongoose';

const adInquirySchema = new mongoose.Schema({
    brandName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    budget: {
        type: Number,
        required: true
    },
    timeline: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const AdInquiry = mongoose.model('AdInquiry', adInquirySchema);
export default AdInquiry;
