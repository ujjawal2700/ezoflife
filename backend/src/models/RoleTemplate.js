import mongoose from 'mongoose';

const roleTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    responsibilities: [{
        type: String,
        required: true,
        trim: true
    }],
    targetRole: {
        type: String,
        enum: ['Vendor', 'Supplier', 'Both'],
        default: 'Vendor'
    }
}, { timestamps: true });

const RoleTemplate = mongoose.model('RoleTemplate', roleTemplateSchema);

export default RoleTemplate;
