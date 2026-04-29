import Category from '../models/Category.js';

export const categoryController = {
    create: async (req, res) => {
        try {
            const { name, image, parentCategory, description } = req.body;
            const category = new Category({ 
                name, 
                image, 
                parentCategory: parentCategory || null, 
                description 
            });
            await category.save();
            res.status(201).json(category);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const categories = await Category.find().populate('parentCategory');
            res.json(categories);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getMainCategories: async (req, res) => {
        try {
            const categories = await Category.find({ parentCategory: null });
            res.json(categories);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getSubCategories: async (req, res) => {
        try {
            const { parentId } = req.params;
            const categories = await Category.find({ parentCategory: parentId });
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
            // Check if it has children
            const hasChildren = await Category.exists({ parentCategory: id });
            if (hasChildren) {
                return res.status(400).json({ message: 'Cannot delete category with sub-categories. Delete sub-categories first.' });
            }
            await Category.findByIdAndDelete(id);
            res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    bulkUpload: async (req, res) => {
        try {
            const { categories } = req.body; 
            if (!Array.isArray(categories)) throw new Error('Invalid data format');

            let createdCount = 0;
            
            for (const item of categories) {
                const name = item.name?.trim();
                const parentName = item.parentName?.trim();

                if (!name) continue;

                let parentId = null;
                // If there is a parent name and it's different from the category name
                if (parentName && parentName.toLowerCase() !== name.toLowerCase()) {
                    let parent = await Category.findOne({ 
                        name: { $regex: new RegExp(`^${parentName.trim()}$`, 'i') }, 
                        parentCategory: null 
                    });
                    if (!parent) {
                        // Create parent if it doesn't exist
                        parent = await new Category({ name: parentName.trim(), parentCategory: null }).save();
                        createdCount++;
                    }
                    parentId = parent._id;
                }

                // Check if this category (as a child or top-level) already exists
                const exists = await Category.findOne({ 
                    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
                    parentCategory: parentId 
                });
                if (!exists) {
                    await new Category({
                        name: name.trim(),
                        image: item.image || '',
                        parentCategory: parentId,
                        description: item.description || ''
                    }).save();
                    createdCount++;
                }
            }

            res.json({ message: `Excel processed successfully. ${createdCount} items managed.` });
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
