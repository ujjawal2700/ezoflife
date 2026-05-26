import VendorMasterSupply from '../models/VendorMasterSupply.js';
import VendorSupplyCategory from '../models/VendorSupplyCategory.js';

// Helper to generate SKU ID
const generateSkuId = (categoryDoc, serialNumber) => {
    const prefix1 = "spz";
    const prefix2 = "sup";
    
    let catPart = "cat";
    if (categoryDoc && categoryDoc.mainCategory) {
        catPart = categoryDoc.mainCategory.trim().replace(/[^a-zA-Z\s]/g, '').slice(0, 3).toLowerCase();
        if (!catPart) catPart = "cat";
    }
    
    let subPart = "sub";
    if (categoryDoc && categoryDoc.subCategory) {
        const words = categoryDoc.subCategory.trim().replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
        if (words.length >= 2) {
            subPart = (words[0][0] + words[1][0]).toLowerCase();
        } else if (words.length === 1) {
            subPart = words[0].slice(0, 2).toLowerCase();
        }
        if (!subPart) subPart = "sub";
    }
    
    const serialStr = String(serialNumber).padStart(3, '0');
    return `${prefix1}-${prefix2}-${catPart}-${subPart}-${serialStr}`.toUpperCase();
};

export const vendorMasterSupplyController = {
    create: async (req, res) => {
        try {
            const { 
                materialName, categoryId, hsnCode, gst, brand, quantity, 
                wholesaleRate, bulkDiscount, bulkThreshold, isActive, 
                deliveryFrequency, movFreeDelivery, supplierId, supplierFacilityName 
            } = req.body;
            
            // 1. Fetch category
            const category = await VendorSupplyCategory.findById(categoryId);
            if (!category) {
                return res.status(404).json({ message: 'Selected Category does not exist' });
            }

            // 2. Determine serial number
            const lastSupply = await VendorMasterSupply.findOne().sort({ serialNumber: -1 });
            const nextSerial = (lastSupply?.serialNumber || 0) + 1;

            // 3. Generate SKU ID
            const skuId = generateSkuId(category, nextSerial);

            const supply = new VendorMasterSupply({
                skuId,
                categoryId,
                hsnCode,
                gst,
                brand,
                materialName,
                quantity,
                wholesaleRate,
                bulkDiscount,
                bulkThreshold,
                isActive: isActive || 'y',
                deliveryFrequency,
                movFreeDelivery,
                supplierId,
                supplierFacilityName,
                serialNumber: nextSerial
            });

            await supply.save();
            res.status(201).json(supply);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const { page, limit, materialName, categoryId, isActive, brand, supplierId } = req.query;
            
            let query = {};
            if (materialName) {
                query.materialName = { $regex: materialName, $options: 'i' };
            }
            if (brand) {
                query.brand = { $regex: brand, $options: 'i' };
            }
            if (supplierId) {
                query.supplierId = { $regex: supplierId, $options: 'i' };
            }
            if (categoryId) {
                query.categoryId = categoryId;
            }
            if (isActive !== undefined && isActive !== '') {
                query.isActive = isActive;
            }

            if (page && limit) {
                const pageNumber = parseInt(page, 10);
                const limitNumber = parseInt(limit, 10);
                const skip = (pageNumber - 1) * limitNumber;

                const total = await VendorMasterSupply.countDocuments(query);
                const supplies = await VendorMasterSupply.find(query)
                    .populate('categoryId')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNumber);

                return res.json({
                    data: supplies,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: limitNumber,
                        totalPages: Math.ceil(total / limitNumber)
                    }
                });
            }

            const supplies = await VendorMasterSupply.find(query)
                .populate('categoryId')
                .sort({ createdAt: -1 });
            res.json(supplies);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                materialName, categoryId, hsnCode, gst, brand, quantity, 
                wholesaleRate, bulkDiscount, bulkThreshold, isActive, 
                deliveryFrequency, movFreeDelivery, supplierId, supplierFacilityName 
            } = req.body;

            const existing = await VendorMasterSupply.findById(id);
            if (!existing) {
                return res.status(404).json({ message: 'Supply item not found' });
            }

            const updates = { 
                materialName, hsnCode, gst, brand, quantity, 
                wholesaleRate, bulkDiscount, bulkThreshold, isActive, 
                deliveryFrequency, movFreeDelivery, supplierId, supplierFacilityName 
            };

            // If category changed, update skuId
            if (categoryId && categoryId !== String(existing.categoryId)) {
                const category = await VendorSupplyCategory.findById(categoryId);
                if (!category) {
                    return res.status(404).json({ message: 'Selected Category does not exist' });
                }
                updates.categoryId = categoryId;
                updates.skuId = generateSkuId(category, existing.serialNumber);
            }

            const updated = await VendorMasterSupply.findByIdAndUpdate(id, updates, { new: true }).populate('categoryId');
            res.json(updated);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            await VendorMasterSupply.findByIdAndDelete(id);
            res.json({ message: 'Supply item deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    clearAll: async (req, res) => {
        try {
            await VendorMasterSupply.deleteMany({});
            res.json({ message: 'All supply items cleared successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    bulkUpload: async (req, res) => {
        try {
            const items = req.body; // Array of items
            if (!Array.isArray(items)) {
                return res.status(400).json({ message: 'Payload must be an array' });
            }

            const results = {
                created: 0,
                skipped: 0,
                errors: 0
            };

            const lastSupply = await VendorMasterSupply.findOne().sort({ serialNumber: -1 });
            let currentSerial = (lastSupply?.serialNumber || 0);

            for (const itemData of items) {
                try {
                    // Find category matching categoryName + subCategoryName OR categoryId
                    let category = null;
                    if (itemData.categoryId) {
                        category = await VendorSupplyCategory.findById(itemData.categoryId);
                    } else if (itemData.mainCategory && itemData.subCategory) {
                        category = await VendorSupplyCategory.findOne({
                            mainCategory: { $regex: new RegExp(`^${itemData.mainCategory}$`, 'i') },
                            subCategory: { $regex: new RegExp(`^${itemData.subCategory}$`, 'i') }
                        });
                    }

                    if (!category) {
                        results.errors++;
                        continue;
                    }

                    // Check for duplicate materialName under same category
                    const exists = await VendorMasterSupply.findOne({
                        materialName: { $regex: new RegExp(`^${itemData.materialName}$`, 'i') },
                        categoryId: category._id
                    });

                    if (exists) {
                        results.skipped++;
                        continue;
                    }

                    currentSerial++;
                    const skuId = generateSkuId(category, currentSerial);

                    let itemIsActive = 'y';
                    if (itemData.isActive !== undefined) {
                        const actStr = String(itemData.isActive).toLowerCase();
                        if (actStr === 'n' || actStr === 'false' || actStr === 'inactive') {
                            itemIsActive = 'n';
                        }
                    }

                    const newSupply = new VendorMasterSupply({
                        skuId,
                        categoryId: category._id,
                        hsnCode: itemData.hsnCode || '2800',
                        gst: Number(itemData.gst) || 18,
                        brand: itemData.brand || 'Generic',
                        materialName: itemData.materialName,
                        quantity: itemData.quantity || '1 Unit',
                        wholesaleRate: Number(itemData.wholesaleRate) || 0,
                        bulkDiscount: Number(itemData.bulkDiscount) || 0,
                        bulkThreshold: Number(itemData.bulkThreshold) || 0,
                        isActive: itemIsActive,
                        deliveryFrequency: itemData.deliveryFrequency || 'Weekly',
                        movFreeDelivery: Number(itemData.movFreeDelivery) || 0,
                        supplierId: itemData.supplierId || 'SUP-001',
                        supplierFacilityName: itemData.supplierFacilityName || 'Main Facility',
                        serialNumber: currentSerial
                    });

                    await newSupply.save();
                    results.created++;
                } catch (err) {
                    console.error('Bulk row error:', err);
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
