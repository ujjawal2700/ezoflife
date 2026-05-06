import mongoose from 'mongoose';

const legalDocumentSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String,
        default: ''
    },
    pdfUrl: {
        type: String,
        default: ''
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const LegalDocument = mongoose.model('LegalDocument', legalDocumentSchema);
export default LegalDocument;
