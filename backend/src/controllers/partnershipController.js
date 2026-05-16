import PartnershipInquiry from '../models/PartnershipInquiry.js';
import { sendPartnershipConfirmation, sendAdminPartnershipNotification } from '../utils/emailHelper.js';

export const submitPartnershipInquiry = async (req, res) => {
    try {
        const { companyName, email, phone, location, website, partnershipType, proposal } = req.body;
        const inquiry = new PartnershipInquiry({ companyName, email, phone, location, website, partnershipType, proposal });
        await inquiry.save();

        // Send confirmation email to partner
        sendPartnershipConfirmation(inquiry).catch(err => {
            console.error('Partnership Confirmation Email Failed:', err);
        });

        // Send notification email to Admin
        sendAdminPartnershipNotification(inquiry).catch(err => {
            console.error('Admin Partnership Notification Failed:', err);
        });

        res.status(201).json(inquiry);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllPartnershipInquiries = async (req, res) => {
    try {
        const inquiries = await PartnershipInquiry.find().sort({ createdAt: -1 });
        res.status(200).json(inquiries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
