import Category from '../models/Category.js';

export const categoryController = {
    create: async (req, res) => {
        try {
            const { mainCategory, subCategory, image, isActive } = req.body;
            const category = new Category({ 
                mainCategory, 
                subCategory, 
                image, 
                isActive 
            });
            await category.save();
            res.status(201).json(category);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const categories = await Category.find();
            res.json(categories);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const category = await Category.findByIdAndUpdate(id, req.body, { new: true });
            res.json(category);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            await Category.findByIdAndDelete(id);
            res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    clearAll: async (req, res) => {
        try {
            await Category.deleteMany({});
            res.json({ message: 'All categories cleared successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};
