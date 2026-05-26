import RoleTemplate from '../models/RoleTemplate.js';

export const getRoleTemplates = async (req, res) => {
    try {
        const templates = await RoleTemplate.find().sort({ createdAt: -1 });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createRoleTemplate = async (req, res) => {
    try {
        const { name, description, responsibilities } = req.body;
        
        // Validation: word count for responsibilities (max 50 words per bullet)
        if (Array.isArray(responsibilities)) {
            for (let i = 0; i < responsibilities.length; i++) {
                const words = responsibilities[i].trim().split(/\s+/).filter(w => w.length > 0);
                if (words.length > 50) {
                    return res.status(400).json({ 
                        message: `Responsibility point ${i + 1} exceeds the limit of 50 words (${words.length} words found).` 
                    });
                }
            }
        } else {
            return res.status(400).json({ message: 'Responsibilities must be an array of strings.' });
        }

        const newTemplate = new RoleTemplate({
            name,
            description,
            responsibilities
        });
        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A role template with this name already exists.' });
        }
        res.status(500).json({ message: error.message });
    }
};

export const updateRoleTemplate = async (req, res) => {
    try {
        const { name, description, responsibilities } = req.body;

        if (Array.isArray(responsibilities)) {
            for (let i = 0; i < responsibilities.length; i++) {
                const words = responsibilities[i].trim().split(/\s+/).filter(w => w.length > 0);
                if (words.length > 50) {
                    return res.status(400).json({ 
                        message: `Responsibility point ${i + 1} exceeds the limit of 50 words (${words.length} words found).` 
                    });
                }
            }
        }

        const updated = await RoleTemplate.findByIdAndUpdate(
            req.params.id,
            { name, description, responsibilities },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Role template not found' });
        }
        res.json(updated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A role template with this name already exists.' });
        }
        res.status(500).json({ message: error.message });
    }
};

export const deleteRoleTemplate = async (req, res) => {
    try {
        const deleted = await RoleTemplate.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Role template not found' });
        }
        res.json({ message: 'Role template deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
