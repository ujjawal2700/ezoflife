import SupplierApplication from '../models/SupplierApplication.js';
import User from '../models/User.js';

export const submitApplication = async (req, res) => {
    try {
        const userId = req.params.userId;
        const applicationData = {
            ...req.body,
            user: userId,
            status: 'Pending'
        };

        const newApplication = new SupplierApplication(applicationData);
        await newApplication.save();

        res.status(201).json({ message: 'Application submitted successfully', application: newApplication });
    } catch (error) {
        console.error('Submit Supplier Application Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllApplications = async (req, res) => {
    try {
        const applications = await SupplierApplication.find().populate('user', 'name phone email');
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getApplicationById = async (req, res) => {
    try {
        const application = await SupplierApplication.findById(req.params.id).populate('user');
        if (!application) return res.status(404).json({ message: 'Application not found' });
        res.status(200).json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approveApplication = async (req, res) => {
    try {
        const application = await SupplierApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        application.status = 'Approved';
        application.reviewedAt = new Date();
        await application.save();

        // Update User Role
        await User.findByIdAndUpdate(application.user, { 
            role: 'Supplier',
            // You might want to store more info in the User model if needed
        });

        res.status(200).json({ message: 'Application approved and user role updated to Supplier' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const rejectApplication = async (req, res) => {
    try {
        const { reason } = req.body;
        const application = await SupplierApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        application.status = 'Rejected';
        application.rejectionReason = reason;
        application.reviewedAt = new Date();
        await application.save();

        res.status(200).json({ message: 'Application rejected' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
