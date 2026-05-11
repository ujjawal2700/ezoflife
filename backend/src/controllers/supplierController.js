import SupplierApplication from '../models/SupplierApplication.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket.js';
import axios from 'axios';

export const verifyGst = async (req, res) => {
    try {
        const { gstNumber } = req.body;
        console.log(`🔍 [SIGNZY] Verifying GST: ${gstNumber}`);

        const apiKey = process.env.SIGNZY_API_KEY;
        const baseUrl = process.env.SIGNZY_BASE_URL;

        if (!apiKey || !baseUrl) {
            console.warn('⚠️ [SIGNZY] API Keys missing. Using Demo Mode.');
            return res.json({ success: true, message: 'GST Verified (Demo Mode)', data: { status: 'Active' } });
        }

        const response = await axios.post(`${baseUrl}/gst/verify`, {
            gstNumber
        }, {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('❌ [SIGNZY] Verification Error:', error.response?.data || error.message);
        // Fallback for development if keys are placeholders
        if (process.env.NODE_ENV === 'development') {
            return res.json({ success: true, message: 'GST Verified (Dev Fallback)', data: { status: 'Active' } });
        }
        res.status(500).json({ message: 'GST Verification failed', error: error.message });
    }
};

export const initiateBankVerification = async (req, res) => {
    try {
        const { userId, accountNumber, ifscCode } = req.body;
        console.log(`🏦 [RAZORPAYX] Initiating Penny Drop for User: ${userId}`);

        // 1. Generate a random amount between 1.00 and 2.00 (e.g. 1.15)
        const randomAmount = parseFloat((Math.random() * (2.0 - 1.0) + 1.0).toFixed(2));
        
        // 2. Simulate RazorpayX Payout (In production, use axios to call RazorpayX)
        // Note: We send amount in paise to RazorpayX
        const amountInPaise = Math.round(randomAmount * 100);
        console.log(`💸 [RAZORPAYX] Sending ₹${randomAmount} (${amountInPaise} paise) to ${accountNumber}`);

        // 3. Update User with the secret amount
        await User.findByIdAndUpdate(userId, {
            'bankVerification.amount': randomAmount,
            'bankVerification.isVerified': false,
            'bankVerification.lastRequested': new Date()
        });

        res.json({ 
            success: true, 
            message: 'A small random amount has been sent to your bank account. Please check your SMS and enter the exact amount.',
            demoNote: `[DEMO ONLY]: The amount sent is ₹${randomAmount}`
        });
    } catch (error) {
        console.error('❌ [RAZORPAYX] Payout Error:', error.message);
        res.status(500).json({ message: 'Failed to initiate bank verification' });
    }
};

export const completeBankVerification = async (req, res) => {
    try {
        const { userId, amountEntered } = req.body;
        const user = await User.findById(userId);

        if (!user || !user.bankVerification.amount) {
            return res.status(400).json({ message: 'No active verification request found' });
        }

        const actualAmount = user.bankVerification.amount;
        console.log(`🧐 [VERIFY] User Entered: ${amountEntered}, Actual: ${actualAmount}`);

        // Match with 0.01 tolerance just in case of float issues
        if (Math.abs(parseFloat(amountEntered) - actualAmount) < 0.01) {
            user.bankVerification.isVerified = true;
            await user.save();
            res.json({ success: true, message: 'Bank Account Verified Successfully!' });
        } else {
            res.status(400).json({ success: false, message: 'Incorrect amount. Please try again.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Verification failed' });
    }
};

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

export const initialApproveApplication = async (req, res) => {
    try {
        const application = await SupplierApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        application.onboardingStage = 'Product_Selection_Phase';
        application.reviewedAt = new Date();
        await application.save();

        // Send Push Notification & Save to DB
        try {
            const notification = await Notification.create({
                recipient: application.user,
                role: 'user',
                title: 'Application Approved! 🎉',
                message: 'Admin approved your request. Please select your products to continue.',
                type: 'supplier_onboarding',
                payload: { applicationId: application._id, stage: 'Product_Selection_Phase' }
            });

            // Emit Real-time via Socket
            const io = getIO();
            io.to(`user_${application.user.toString()}`).emit('push_notification', {
                title: 'Application Approved! 🎉',
                body: 'Admin approved your request. Please select your products to continue.',
                payload: { applicationId: application._id, stage: 'Product_Selection_Phase' }
            });
        } catch (notifErr) {
            console.error('Failed to send approval notification:', notifErr);
        }

        res.status(200).json({ 
            message: 'Documents approved. Supplier can now select products to supply.',
            stage: application.onboardingStage 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const selectProducts = async (req, res) => {
    try {
        const { applicationId, products } = req.body; // products: [{productName, category, capacity}]
        const application = await SupplierApplication.findById(applicationId);
        
        if (!application) return res.status(404).json({ message: 'Application not found' });
        if (application.onboardingStage !== 'Product_Selection_Phase') {
            return res.status(400).json({ message: 'Product selection is not allowed at this stage' });
        }

        application.selectedProducts = products;
        application.onboardingStage = 'Final_Approval_Pending';
        await application.save();

        res.status(200).json({ 
            message: 'Products selected. Awaiting final admin approval.',
            stage: application.onboardingStage
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const finalApproveApplication = async (req, res) => {
    try {
        const application = await SupplierApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        if (application.onboardingStage !== 'Final_Approval_Pending') {
            return res.status(400).json({ message: 'Supplier must select products before final approval' });
        }

        application.status = 'Approved';
        application.onboardingStage = 'Onboarded';
        application.reviewedAt = new Date();
        await application.save();

        // Officially promote user to Supplier
        await User.findByIdAndUpdate(application.user, { 
            role: 'Supplier',
            supplierDetails: {
                businessName: application.registeredBusinessName,
                address: application.warehouseAddress,
                gst: application.gstNumber
            }
        });

        res.status(200).json({ 
            message: 'Supplier onboarded officially!',
            stage: application.onboardingStage
        });
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
