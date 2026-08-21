import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String },
    jobType: { type: String },
    description: { type: String },
    experience: { type: String },
    salary: { type: String },
    minSalary: { type: Number },
    maxSalary: { type: Number },
    city: { type: String },
    area: { type: String },
    pincode: { type: String },
    location: { type: String },
    hideAddress: { type: Boolean, default: false },
    skills: [{ type: String }],
    requirements: [{ type: String }],
    shiftStartTime: { type: String },
    shiftEndTime: { type: String },
    jobCode: { type: String },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    companyName: { type: String },
    creatorRole: { type: String, enum: ['Admin', 'Vendor', 'Supplier'], default: 'Vendor' },
    status: { type: String, enum: ['Active', 'Open', 'Published', 'Draft', 'Filled', 'Closed', 'Under Review'], default: 'Active' },
    applicantsCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);
