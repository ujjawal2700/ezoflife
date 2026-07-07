import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    applicantName: { type: String, required: true },
    applicantEmail: { type: String },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    creatorRole: { type: String, enum: ['Admin', 'Vendor', 'Supplier'], default: 'Vendor' },
    status: { type: String, enum: ['Submitted', 'Shortlisted', 'Interview Scheduled', 'Post-Interview Review', 'Background Check', 'Offer Generation', 'Offer Extended', 'Pre-onboarding', 'Rejected', 'Candidate Withdrew'], default: 'Submitted' },
    experience: { type: String },
    contactNumber: { type: String },
    resumeLink: { type: String },
    coverLetter: { type: String },
    notes: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('JobApplication', jobApplicationSchema);
