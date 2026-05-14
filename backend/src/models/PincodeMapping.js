import mongoose from 'mongoose';

const pincodeMappingSchema = new mongoose.Schema({
    mappingId: {
        type: Number,
        unique: true,
        required: true
    },
    fenceId: {
        type: Number, // Reference to excelFenceId
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    coverageType: {
        type: String,
        enum: ['Full', 'Partial'],
        default: 'Full'
    }
}, { timestamps: true });

const PincodeMapping = mongoose.model('PincodeMapping', pincodeMappingSchema);

export default PincodeMapping;
