import VendorMasterSupply from '../models/VendorMasterSupply.js';
import VendorSupplyCategory from '../models/VendorSupplyCategory.js';
import SupplierApplication from '../models/SupplierApplication.js';
import SupplierServiceZone from '../models/SupplierServiceZone.js';
import ServiceArea from '../models/ServiceArea.js';
import fs from 'fs';

const logToFile = (msg) => {
    try {
        fs.appendFileSync('./REAL_USER_DEBUG.log', `[CONTROLLER_DEBUG] ${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {}
};

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

const populateDeliveryFrequencies = async (supplies) => {
    logToFile(`populateDeliveryFrequencies processing ${supplies.length} items`);
    const transformed = [];
    for (const supply of supplies) {
        const supplyObj = supply.toObject();
        supplyObj.zoneName = '-';
        
        logToFile(`supplyObj details: ID=${supplyObj._id}, supplierId=${supplyObj.supplierId}, supplierFacilityName=${supplyObj.supplierFacilityName}`);
        if (supplyObj.supplierId && supplyObj.supplierId !== '-') {
            const zone = await SupplierServiceZone.findOne({ supplierId: supplyObj.supplierId });
            if (zone) {
                supplyObj.zoneName = zone.zoneName;
                supplyObj.supplierPlatformMultiplier = zone.supplierPlatformMultiplier || 0;
                supplyObj.minSupplierPlatformFee = zone.minSupplierPlatformFee || 0;
                supplyObj.maxSupplierPlatformFee = zone.maxSupplierPlatformFee || null;
            } else {
                supplyObj.supplierPlatformMultiplier = 0;
                supplyObj.minSupplierPlatformFee = 0;
                supplyObj.maxSupplierPlatformFee = null;
            }

            if (supplyObj.supplierFacilityName && supplyObj.supplierFacilityName !== '-') {
                const app = await SupplierApplication.findOne({ registeredBusinessName: supplyObj.supplierFacilityName });
                logToFile(`found app: ${app ? JSON.stringify({ id: app._id, registeredBusinessName: app.registeredBusinessName, deliveryFrequency: app.deliveryFrequency }) : 'null'}`);
                if (app && app.deliveryFrequency && app.deliveryFrequency.length > 0) {
                    supplyObj.deliveryFrequency = app.deliveryFrequency.join(', ');
                }
            }
        }
        transformed.push(supplyObj);
    }
    return transformed;
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

    getUniqueFilters: async (req, res) => {
        try {
            const supplierIds = await VendorMasterSupply.distinct('supplierId');
            const dbDeliveryFrequencies = await VendorMasterSupply.distinct('deliveryFrequency');
            const appDeliveryFrequencies = await SupplierApplication.distinct('deliveryFrequency');
            
            const allFrequencies = [...new Set([...dbDeliveryFrequencies, ...appDeliveryFrequencies])];
            
            const cleanSupplierIds = supplierIds.filter(id => id && id !== '-');
            const cleanDeliveryFrequencies = allFrequencies.filter(df => df && df !== '-');

            return res.json({
                supplierIds: cleanSupplierIds.sort(),
                deliveryFrequencies: cleanDeliveryFrequencies.sort()
            });
        } catch (error) {
            console.error('Get Unique Filters Error:', error);
            res.status(500).json({ message: 'Failed to fetch unique filters', error: error.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const { page, limit, materialName, categoryId, isActive, brand, supplierId, isTemplate, deliveryFrequency, wholesaleRate } = req.query;
            
            let query = {};
            if (materialName) {
                query.materialName = { $regex: materialName, $options: 'i' };
            }
            if (brand) {
                query.brand = { $regex: brand, $options: 'i' };
            }
            if (supplierId) {
                if (supplierId === '-') {
                    query.supplierId = '-';
                } else {
                    query.supplierId = { $regex: supplierId, $options: 'i' };
                }
            }
            if (categoryId) {
                query.categoryId = categoryId;
            }
            if (isActive !== undefined && isActive !== '') {
                query.isActive = isActive;
            }
            if (deliveryFrequency) {
                const matchingApps = await SupplierApplication.find({
                    deliveryFrequency: { $regex: deliveryFrequency, $options: 'i' }
                });
                const appNames = matchingApps.map(app => app.registeredBusinessName);
                
                query.$or = [
                    { deliveryFrequency: { $regex: deliveryFrequency, $options: 'i' } },
                    { supplierFacilityName: { $in: appNames } }
                ];
            }
            if (wholesaleRate) {
                if (wholesaleRate.includes('-')) {
                    const [min, max] = wholesaleRate.split('-');
                    query.wholesaleRate = { $gte: Number(min), $lte: Number(max) };
                } else if (wholesaleRate.includes('+')) {
                    const min = wholesaleRate.replace('+', '');
                    query.wholesaleRate = { $gte: Number(min) };
                } else {
                    query.wholesaleRate = Number(wholesaleRate);
                }
            }
            if (isTemplate === 'y') {
                query.supplierId = '-';
            } else if (isTemplate === 'n') {
                if (!supplierId) {
                    query.supplierId = { $ne: '-' };
                }
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

                const populated = await populateDeliveryFrequencies(supplies);

                return res.json({
                    data: populated,
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

            const populated = await populateDeliveryFrequencies(supplies);
            res.json(populated);
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
    },

    getLiveCatalog: async (req, res) => {
        try {
            const { vendorId } = req.query;
            if (!vendorId) {
                return res.status(400).json({ message: 'vendorId is required' });
            }

            // 1. Find the Vendor User
            const User = (await import('../models/User.js')).default;
            const vendor = await User.findById(vendorId);
            if (!vendor) {
                return res.status(404).json({ message: 'Vendor not found' });
            }

            // 2. Resolve matching pincodes based on coordinates/geofence
            const matchingPincodes = [];
            const vendorPincode = vendor.shopDetails?.pincode;
            if (vendorPincode) {
                matchingPincodes.push(vendorPincode);
            }

            const vLat = Number(vendor.location?.lat || 0);
            const vLng = Number(vendor.location?.lng || 0);

            if (vLat && vLng) {
                const ServiceArea = (await import('../models/ServiceArea.js')).default;
                const serviceArea = await ServiceArea.findOne({
                    isActive: true,
                    boundary: {
                        $geoIntersects: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [vLng, vLat] // [lng, lat]
                            }
                        }
                    }
                });

                if (serviceArea && serviceArea.pincodes && serviceArea.pincodes.length > 0) {
                    serviceArea.pincodes.forEach(pin => {
                        if (!matchingPincodes.includes(pin)) {
                            matchingPincodes.push(pin);
                        }
                    });
                }
            }

            if (matchingPincodes.length === 0) {
                return res.status(400).json({ message: 'Vendor has no pincode configured and coordinates are outside any active Service Area geofence' });
            }

            // 3. Find active Supplier Service Zones that serve any of these pincodes
            const SupplierServiceZone = (await import('../models/SupplierServiceZone.js')).default;
            const zones = await SupplierServiceZone.find({
                pincodes: { $in: matchingPincodes },
                isActive: true
            });

            // Extract supplierIds and map their delivery settings
            const supplierIds = zones.map(z => z.supplierId);
            const supplierZoneMap = {};
            zones.forEach(z => {
                supplierZoneMap[z.supplierId] = {
                    minOrderValue: z.minOrderValue || 0,
                    deliveryCharges: z.deliveryCharges || 0,
                    minSupplierPlatformFee: z.minSupplierPlatformFee || 0,
                    maxSupplierPlatformFee: z.maxSupplierPlatformFee || null
                };
            });

            // 4. Find all active supplies in VendorMasterSupply belonging to these suppliers
            const query = {
                isActive: 'y',
                supplierId: { $in: supplierIds }
            };

            const supplies = await VendorMasterSupply.find(query)
                .populate('categoryId')
                .sort({ createdAt: -1 });

            const populated = await populateDeliveryFrequencies(supplies);
            
            // Build a map to resolve the actual Supplier User info (for their displayNames)
            const suppliers = await User.find({ role: 'Supplier' });
            const supplierUserMap = {};
            suppliers.forEach(s => {
                if (s.phone) {
                    const suffix = s.phone.slice(-4);
                    supplierUserMap[`SUP-${suffix}`] = s;
                }
            });

            // Format items to match frontend expectation
            const formatted = populated.map(item => {
                const supplierUserObj = supplierUserMap[item.supplierId];
                const gst = item.gst || 18;
                const basePrice = item.wholesaleRate + (item.wholesaleRate * gst / 100);
                const itemMultiplier = item.supplierPlatformMultiplier || 0;
                const platformFeeAmount = basePrice * itemMultiplier;
                const finalPrice = basePrice + platformFeeAmount;
                
                return {
                    _id: item._id,
                    name: item.materialName,
                    price: finalPrice,
                    basePrice: basePrice,
                    wholesaleRate: item.wholesaleRate,
                    gst: gst,
                    supplierPlatformMultiplier: itemMultiplier,
                    minSupplierPlatformFee: supplierZoneMap[item.supplierId]?.minSupplierPlatformFee || 0,
                    maxSupplierPlatformFee: supplierZoneMap[item.supplierId]?.maxSupplierPlatformFee || null,
                    category: item.categoryId?.mainCategory || 'Other',
                    subCategory: item.categoryId?.subCategory || 'General',
                    brand: item.brand || 'Generic',
                    quantity: item.quantity || '1 Unit',
                    supplierId: item.supplierId,
                    supplierFacilityName: supplierUserObj?.displayName || item.supplierFacilityName || item.supplierId,
                    stock: 'Available',
                    image: null,
                    images: item.images || [],
                    deliveryFrequency: item.deliveryFrequency || 'On-Demand',
                    movFreeDelivery: supplierZoneMap[item.supplierId]?.minOrderValue || 0,
                    deliveryCharges: supplierZoneMap[item.supplierId]?.deliveryCharges || 0,
                    bulkDiscount: item.bulkDiscount || 0,
                    bulkThreshold: item.bulkThreshold || 0
                };
            });

            res.json(formatted);
        } catch (error) {
            console.error('Error in getLiveCatalog:', error);
            res.status(500).json({ message: error.message });
        }
    }
};
