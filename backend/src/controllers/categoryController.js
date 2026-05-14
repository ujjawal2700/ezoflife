import Category from '../models/Category.js';

export const categoryController = {
    create: async (req, res) => {
        try {
            const { mainCategory, subCategory, image, isActive } = req.body;
            
            // Auto-generate excelCategoryId (Starts from 1, 2, 3...)
            const lastCategory = await Category.findOne({ excelCategoryId: { $ne: null } }).sort({ excelCategoryId: -1 });
            const nextId = (lastCategory?.excelCategoryId || 0) + 1;

            const category = new Category({ 
                mainCategory, 
                subCategory, 
                image, 
                isActive,
                excelCategoryId: nextId
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
            const updates = req.body;

            // Ensure every category has an excelCategoryId
            const existing = await Category.findById(id);
            if (existing && !existing.excelCategoryId) {
                const lastCategory = await Category.findOne({ excelCategoryId: { $ne: null } }).sort({ excelCategoryId: -1 });
                updates.excelCategoryId = (lastCategory?.excelCategoryId || 0) + 1;
            }

            const category = await Category.findByIdAndUpdate(id, updates, { new: true });
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
    },

    bulkUpload: async (req, res) => {
        try {
            const categories = req.body; // Expecting an array
            if (!Array.isArray(categories)) {
                return res.status(400).json({ message: 'Payload must be an array' });
            }

            let lastCategory = await Category.findOne({ excelCategoryId: { $ne: null } }).sort({ excelCategoryId: -1 });
            let currentId = (lastCategory?.excelCategoryId || 0);
            
            const results = {
                created: 0,
                skipped: 0,
                errors: 0
            };

            for (const catData of categories) {
                try {
                    // 1. Check for duplicates (Main + Sub combination)
                    const exists = await Category.findOne({
                        mainCategory: { $regex: new RegExp(`^${catData.mainCategory}$`, 'i') },
                        subCategory: { $regex: new RegExp(`^${catData.subCategory}$`, 'i') }
                    });

                    if (exists) {
                        results.skipped++;
                        continue;
                    }

                    // 2. Generate Next ID
                    currentId++;

                    const newCat = new Category({
                        ...catData,
                        excelCategoryId: currentId,
                        isActive: catData.isActive !== undefined ? catData.isActive : true
                    });

                    await newCat.save();
                    results.created++;
                } catch (err) {
                    results.errors++;
                }
            }

            res.status(200).json({
                message: `Bulk upload complete. Created: ${results.created}, Skipped (duplicates): ${results.skipped}, Errors: ${results.errors}`,
                results
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};
