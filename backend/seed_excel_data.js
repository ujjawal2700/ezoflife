import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import Category from './src/models/Category.js';
import MasterService from './src/models/MasterService.js';
import ServiceArea from './src/models/ServiceArea.js';

function parseWKT(wkt) {
    if (!wkt || typeof wkt !== 'string') return null;
    const match = wkt.match(/\(\((.*)\)\)/);
    if (!match) return null;
    const pointsStr = match[1].split(',');
    const coordinates = pointsStr.map(p => {
        const [lng, lat] = p.trim().split(/\s+/).map(Number);
        return [lng, lat];
    });
    return [coordinates];
}

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function seedExcel() {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Clear existing data
        console.log('🧹 Clearing existing Categories, MasterServices, and ServiceAreas...');
        await Category.deleteMany({});
        await ServiceArea.deleteMany({});
        try {
            await mongoose.connection.db.dropCollection('masterservices');
            console.log('🗑️ Dropped masterservices collection.');
        } catch (e) {
            console.log('ℹ️ masterservices collection not found to drop.');
        }
        console.log('✅ Collections cleared.');

        // 2. Read Excel
        console.log('📖 Reading Excel file...');
        const workbook = XLSX.readFile('../Spinzyt_Pricing_Tables (1).xlsx');
        
        // 3. Import Categories
        console.log('📂 Importing Categories...');
        const catSheet = workbook.Sheets['Spinzyt_DB_Categories'];
        const catData = XLSX.utils.sheet_to_json(catSheet);
        
        const mainCategories = {}; // Cache to avoid duplicate main categories

        for (const item of catData) {
            const mainName = item['Main Category'].trim();
            const subName = item['SubCategory'].trim();
            const excelId = item['Category_ID'];

            // Get or create main category
            if (!mainCategories[mainName]) {
                let mainCat = await Category.findOne({ name: mainName, parentCategory: null });
                if (!mainCat) {
                    mainCat = await Category.create({ name: mainName, parentCategory: null });
                }
                mainCategories[mainName] = mainCat._id;
            }

            // Create subcategory
            await Category.create({
                name: subName,
                parentCategory: mainCategories[mainName],
                excelCategoryId: excelId
            });
            console.log(`✅ Created Category: ${mainName} > ${subName} (ID: ${excelId})`);
        }

        // 4. Import Master Services
        console.log('🛠️ Importing Master Services...');
        const serviceSheet = workbook.Sheets['Spinzyt_DB_Services_Master'];
        const serviceData = XLSX.utils.sheet_to_json(serviceSheet);
        
        if (serviceData.length > 0) {
            console.log('DEBUG: First row keys:', Object.keys(serviceData[0]));
            console.log('DEBUG: First row data:', serviceData[0]);
        }

        const allCategories = await Category.find({ excelCategoryId: { $exists: true } });
        const catMap = {};
        allCategories.forEach(c => {
            catMap[c.excelCategoryId] = {
                subId: c._id,
                mainId: c.parentCategory
            };
        });

        for (const s of serviceData) {
            if (!s['Item Name'] || !s['SKU_ID']) {
                continue; // Skip empty rows
            }
            const excelCatId = s['Category_ID'];
            const mapping = catMap[excelCatId];

            if (!mapping) {
                console.warn(`⚠️ Warning: Category ID ${excelCatId} not found for service ${s['Item Name']}`);
                continue;
            }

            // Determine tier based on Main Category or SubCategory
            const mainNameUpper = s['Main Category']?.toUpperCase() || '';
            const subNameUpper = s['SubCategory']?.toUpperCase() || '';
            const tier = (mainNameUpper.includes('ORGANIC') || subNameUpper.includes('PREMIUM')) ? 'Heritage' : 'Essential';

            if (s['Item Name'] === 'Bedsheet - D') {
                console.log(`DEBUG: Saving ${s['Item Name']} with discountedPrice: ${s['Global_Discounted_Price']}`);
            }

            await MasterService.create({
                name: s['Item Name'],
                skuId: s['SKU_ID'],
                excelCategoryId: excelCatId,
                basePrice: s['Global_Base_Price'] || 0,
                discountedPrice: s['Global_Discounted_Price'] || 0,
                avgWeight: s['Avergae-Weight(kg)'] || 0,
                seasonality: s['Seasonality'] || 'All-Year',
                tat: s['Estimated_Min_TAT_Days'] || 3,
                expressMultiplier: s['Express_Multiplier'] || 1.5,
                gst: s['GST%'] || 0.18,
                category: mapping.mainId,
                subCategory: mapping.subId,
                tier: tier,
                isActive: true
            });
        }

        // 5. Import Geofences
        console.log('📍 Importing Geofences...');
        const fenceSheet = workbook.Sheets['Service_Geofences'];
        if (fenceSheet) {
            const fenceData = XLSX.utils.sheet_to_json(fenceSheet);
            for (const f of fenceData) {
                const wkt = f['boundary_polygon (WKT Format)'];
                const coordinates = parseWKT(wkt);
                
                if (!coordinates) {
                    console.warn(`⚠️ Warning: Invalid WKT for fence ${f['area_name']}`);
                    continue;
                }

                await ServiceArea.create({
                    name: f['area_name'],
                    description: `${f['City'] || ''}, ${f['State'] || ''}`,
                    excelFenceId: f['fence_id'],
                    pricingFactor: f['dynamic_surge_multiplier'] || 1.0,
                    boundary: {
                        type: 'Polygon',
                        coordinates: coordinates
                    },
                    isActive: true // Force active for testing
                });
                console.log(`✅ Created Geofence: ${f['area_name']} (ID: ${f['fence_id']})`);
            }
        }

        // 6. Import Pincode Mapping
        console.log('📮 Mapping Pincodes to Geofences...');
        const pinSheet = workbook.Sheets['Geofence_Pincode_Mapping'];
        if (pinSheet) {
            const pinData = XLSX.utils.sheet_to_json(pinSheet);
            for (const p of pinData) {
                const fenceId = p['fence_id'];
                const pincode = String(p['pincode']);
                
                await ServiceArea.updateOne(
                    { excelFenceId: fenceId },
                    { $addToSet: { pincodes: pincode } }
                );
            }
            console.log(`✅ Successfully mapped pincodes to geofences.`);
        }

        console.log(`🎉 Successfully seeded everything from Excel!`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seedExcel();
