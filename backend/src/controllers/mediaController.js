import Media from '../models/Media.js';
import AdInquiry from '../models/AdInquiry.js';

export const uploadMedia = async (req, res) => {
    console.log('--- POST Upload Media Kit Requested (Cloudinary) ---');
    try {
        if (!req.file) {
            console.log('Upload failed: No file provided.');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log(`File uploaded to Cloudinary: ${req.file.originalname} at ${req.file.path}`);
        
        // Cloudinary path is the URL
        const fileUrl = req.file.path;

        const newMedia = new Media({
            fileName: req.file.originalname,
            fileUrl: fileUrl,
            fileType: req.file.mimetype.includes('pdf') ? 'PDF' : 'IMAGE'
        });

        await newMedia.save();
        console.log('Media Kit saved to DB successfully!');
        res.status(201).json(newMedia);
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ message: err.message });
    }
};

export const uploadMultipleMedia = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const fileUrls = req.files.map(file => file.path);
        res.status(201).json({ urls: fileUrls });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMediaHistory = async (req, res) => {
    try {
        const history = await Media.find().sort({ uploadedAt: -1 });
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getLatestMedia = async (req, res) => {
    console.log('--- GET Latest Media Kit Requested ---');
    try {
        // Explicitly sort by createdAt to get the absolute newest entry
        const latest = await Media.findOne().sort({ createdAt: -1 });
        if (!latest) {
            console.log('No Media Kit found in database.');
            return res.status(404).json({ message: 'No media kit found' });
        }
        res.status(200).json(latest);
    } catch (err) {
        console.error('Error in getLatestMedia:', err);
        res.status(500).json({ message: err.message });
    }
};export const submitInquiry = async (req, res) => {
    try {
        const { brandName, email, phone, location, budget, timeline } = req.body;
        const inquiry = new AdInquiry({ brandName, email, phone, location, budget, timeline });
        await inquiry.save();
        res.status(201).json(inquiry);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllInquiries = async (req, res) => {
    try {
        const inquiries = await AdInquiry.find().sort({ createdAt: -1 });
        res.status(200).json(inquiries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
