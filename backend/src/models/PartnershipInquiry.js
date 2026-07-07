import mongoose from 'mongoose';

const partnershipInquirySchema = new mongoose.Schema({
    companyName: {
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
    website: {
        type: String
    },
    partnershipType: {
        type: String,
        required: true
    },
    proposal: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: [
            'Lead Received',
            'Under Verification',
            'Proposal Sent',
            'Contract Drafting',
            'Account Setup',
            'Active',
            'Suspended',
            'Rejected'
        ],
        default: 'Lead Received'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const PartnershipInquiry = mongoose.model('PartnershipInquiry', partnershipInquirySchema);
export default PartnershipInquiry;
