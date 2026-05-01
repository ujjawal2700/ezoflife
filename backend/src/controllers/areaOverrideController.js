import AreaServiceOverride from '../models/AreaServiceOverride.js';

export const saveOverride = async (req, res) => {
    try {
        const { serviceId, areaId, customPrice } = req.body;
        
        if (customPrice === null || customPrice === undefined || customPrice === '') {
            // If price is cleared, remove the override
            await AreaServiceOverride.findOneAndDelete({ serviceId, areaId });
            return res.json({ message: 'Override removed' });
        }

        const override = await AreaServiceOverride.findOneAndUpdate(
            { serviceId, areaId },
            { serviceId, areaId, customPrice },
            { upsert: true, new: true }
        );
        res.json(override);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getOverridesByArea = async (req, res) => {
    try {
        const { areaId } = req.params;
        const overrides = await AreaServiceOverride.find({ areaId });
        res.json(overrides);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
