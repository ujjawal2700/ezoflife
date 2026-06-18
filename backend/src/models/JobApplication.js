import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicantName: { type: String, required: true },
    applicantEmail: { type: String },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    creatorRole: { type: String, enum: ['Admin', 'Vendor', 'Supplier'], default: 'Vendor' },
    status: { type: String, enum: ['Pending', 'Reviewed', 'Selected', 'Rejected'], default: 'Pending' },
    experience: { type: String },
    contactNumber: { type: String },
    resumeLink: { type: String },
    coverLetter: { type: String }
}, { timestamps: true });

export default mongoose.model('JobApplication', jobApplicationSchema);
