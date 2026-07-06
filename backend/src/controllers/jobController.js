import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';
import User from '../models/User.js';
import { sendJobApplicationConfirmation, sendAdminJobApplicationNotification } from '../utils/emailHelper.js';

// Vendor: Post a new job
export const createJob = async (req, res) => {
    try {
        const { title, category, jobType, type, description, experience, salary, location, skills, requirements, vendorId, companyName, creatorRole, shiftStartTime, shiftEndTime } = req.body;
        
        const count = await Job.countDocuments();
        const jobCode = `JOB-${String(count + 1).padStart(4, '0')}`;

        const newJob = new Job({
            title, 
            category, 
            jobType: jobType || type, 
            description, 
            experience, 
            salary, 
            location, 
            skills,
            requirements,
            shiftStartTime,
            shiftEndTime,
            jobCode,
            vendor: creatorRole === 'Admin' ? null : vendorId,
            companyName,
            creatorRole: creatorRole || 'Vendor',
            status: 'Active'
        });
        await newJob.save();
        res.status(201).json(newJob);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Vendor: Get jobs posted by specific vendor
export const getVendorJobs = async (req, res) => {
    try {
        const vendorId = req.params.vendorId || req.query.vendorId;
        const jobs = await Job.find({ vendor: vendorId }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Customer/Public: Get all active jobs
export const getAllActiveJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ status: 'Active' })
            .populate('vendor', 'displayName profileImage')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Customer: Apply for a job
export const applyToJob = async (req, res) => {
    try {
        const { jobId, applicantId, experience, contactNumber, applicantName, applicantEmail, coverLetter, coverNote } = req.body;
        
        // Find the job to get the correct vendor and creatorRole
        const job = await Job.findById(jobId).populate('vendor');
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if already applied
        const existing = await JobApplication.findOne({ job: jobId, applicant: applicantId });
        if (existing) {
            return res.status(400).json({ message: 'You have already applied for this job.' });
        }

        const application = new JobApplication({
            job: jobId, 
            applicant: applicantId, 
            applicantName,
            applicantEmail,
            vendor: job.creatorRole === 'Admin' ? null : (job.vendor?._id || job.vendor), 
            creatorRole: job.creatorRole || 'Vendor',
            experience, 
            contactNumber,
            resumeLink: req.file ? req.file.filename : null,
            coverLetter: coverLetter || coverNote
        });
        await application.save();

        // Increment applicant count in Job
        await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });

        // Trigger email notifications asynchronously (non-blocking)
        try {
            if (application.applicantEmail) {
                sendJobApplicationConfirmation(application, job.title).catch(err => {
                    console.error('Error sending application confirmation to applicant:', err);
                });
            }
            
            // Find Admin user dynamically from database
            const adminUser = await User.findOne({ role: 'Admin' });
            const adminEmail = adminUser?.email || process.env.ADMIN_EMAIL || 'admin@ezoflife.com';

            let recipientEmail = adminEmail;
            let ccEmail = undefined;

            if (job.creatorRole === 'Vendor' || job.creatorRole === 'Supplier') {
                const creatorEmail = job.vendor?.email;
                if (creatorEmail) {
                    recipientEmail = creatorEmail;
                    ccEmail = adminEmail;
                }
            }

            sendAdminJobApplicationNotification(application, job.title, recipientEmail, ccEmail).catch(err => {
                console.error('Error sending job application notification email:', err);
            });
        } catch (emailErr) {
            console.error('Error triggering job application emails:', emailErr);
        }

        console.log(`📩 [JOBS] Application submitted for job: ${job.title} by ${applicantName}. Route: ${job.creatorRole}`);
        res.status(201).json(application);
    } catch (error) {
        console.error('❌ [JOBS] Apply error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Vendor: Get applications for their jobs
export const getVendorApplications = async (req, res) => {
    try {
        const vendorId = req.params.vendorId;
        console.log('📡 [JOBS] Fetching applications for vendor:', vendorId);
        
        const applications = await JobApplication.find({ 
            vendor: vendorId
        })
            .populate('job', 'title creatorRole')
            .populate('applicant', 'displayName profileImage email')
            .sort({ createdAt: -1 });
            
        console.log(`✅ [JOBS] Found ${applications.length} applications`);
        res.json(applications);
    } catch (error) {
        console.error('❌ [JOBS] Fetch vendor apps error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getAdminApplications = async (req, res) => {
    try {
        const { creatorRole } = req.query;
        const query = creatorRole ? { creatorRole } : {};
        const applications = await JobApplication.find(query)
            .populate('job', 'title')
            .populate('applicant', 'displayName profileImage email')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAdminAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteJob = async (req, res) => {
    try {
        await Job.findByIdAndDelete(req.params.id);
        // Also delete associated applications
        await JobApplication.deleteMany({ job: req.params.id });
        res.json({ message: 'Job and associated applications deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateJob = async (req, res) => {
    try {
        const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(job);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateJobStatus = async (req, res) => {
    try {
        const job = await Job.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(job);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateApplicationStatus = async (req, res) => {
    try {
        const application = await JobApplication.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteApplication = async (req, res) => {
    try {
        await JobApplication.findByIdAndDelete(req.params.id);
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAppliedJobIds = async (req, res) => {
    try {
        const { applicantId } = req.params;
        const applications = await JobApplication.find({ applicant: applicantId }).select('job');
        const jobIds = applications.map(app => app.job.toString());
        res.json(jobIds);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getApplicantApplications = async (req, res) => {
    try {
        const { applicantId } = req.params;
        const applications = await JobApplication.find({ applicant: applicantId })
            .populate('job', 'title location companyName creatorRole salary jobType shiftStartTime shiftEndTime')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

