import mongoose from 'mongoose';

const areaServiceOverrideSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MasterService',
        required: true
    },
    areaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceArea',
        required: true
    },
    customPrice: {
        type: Number,
        required: true
    }
}, { timestamps: true });

// Ensure unique override per service/area pair
areaServiceOverrideSchema.index({ serviceId: 1, areaId: 1 }, { unique: true });

const AreaServiceOverride = mongoose.model('AreaServiceOverride', areaServiceOverrideSchema);

export default AreaServiceOverride;
