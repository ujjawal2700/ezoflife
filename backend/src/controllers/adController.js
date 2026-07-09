import Advertisement from '../models/Advertisement.js';

export const createAd = async (req, res) => {
    try {
        const { title, type, notes, category } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No media file uploaded' });
        }

        const newAd = new Advertisement({
            title,
            type, // 'image' or 'video'
            url: `/uploads/ads/${file.filename}`,
            category: category || 'splash',
            notes: notes || ''
        });

        await newAd.save();
        res.status(201).json(newAd);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getActiveAd = async (req, res) => {
    try {
        const { category } = req.query;
        const query = { isActive: true };
        if (category) {
            query.category = category;
        } else {
            query.category = 'splash';
        }

        const ad = await Advertisement.findOne(query).sort({ createdAt: -1 });
        if (!ad) {
            return res.status(404).json({ message: `No active advertisement found for category: ${query.category}` });
        }
        res.json(ad);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllAds = async (req, res) => {
    try {
        const ads = await Advertisement.find().sort({ createdAt: -1 });
        res.json(ads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const toggleAdStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const ad = await Advertisement.findById(id);
        if (!ad) return res.status(404).json({ error: 'Ad not found' });

        ad.isActive = !ad.isActive;
        await ad.save();
        res.json(ad);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteAd = async (req, res) => {
    try {
        const { id } = req.params;
        const ad = await Advertisement.findByIdAndDelete(id);
        if (!ad) return res.status(404).json({ error: 'Ad not found' });
        res.json({ message: 'Ad deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateAdNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const ad = await Advertisement.findByIdAndUpdate(id, { notes }, { new: true });
        if (!ad) return res.status(404).json({ error: 'Ad not found' });
        res.json(ad);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
