import PartnershipInquiry from '../models/PartnershipInquiry.js';

export const submitPartnershipInquiry = async (req, res) => {
    try {
        const { companyName, email, phone, location, website, partnershipType, proposal } = req.body;
        const inquiry = new PartnershipInquiry({ companyName, email, phone, location, website, partnershipType, proposal });
        await inquiry.save();
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
