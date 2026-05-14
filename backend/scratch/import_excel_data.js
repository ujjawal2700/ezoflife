import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import Category from '../src/models/Category.js';
import MasterService from '../src/models/MasterService.js';
import ServiceArea from '../src/models/ServiceArea.js';
import PincodeMapping from '../src/models/PincodeMapping.js';

dotenv.config();

const EXCEL_PATH = 'd:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx';

function parseWKT(wkt) {
    if (!wkt || typeof wkt !== 'string') return null;
    const match = wkt.match(/POLYGON\(\((.*)\)\)/);
    if (!match) return null;
    const points = match[1].split(',').map(p => p.trim().split(' ').map(Number));
    return [points]; 
}

async function importData() {
    try {
        console.log('🚀 Connecting to Database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const workbook = XLSX.readFile(EXCEL_PATH);
        
        // 1. Categories
        const catData = XLSX.utils.sheet_to_json(workbook.Sheets['Spinzyt_DB_Categories']);
        const categoryMap = {}; 
        for (const row of catData) {
            const cat = await Category.findOneAndUpdate(
                { mainCategory: row['Main Category'], subCategory: row['SubCategory'] },
                { mainCategory: row['Main Category'], subCategory: row['SubCategory'], excelCategoryId: row['Category_ID'], isActive: true },
                { upsert: true, new: true }
            );
            categoryMap[row['Category_ID']] = cat._id;
        }

        // 2. SKUs
        const skuData = XLSX.utils.sheet_to_json(workbook.Sheets['Spinzyt_DB_Services_Master']);
        for (const row of skuData) {
            const catId = categoryMap[row['Category_ID']];
            if (!catId) continue;
            await MasterService.findOneAndUpdate({ skuId: row['SKU_ID'] }, {
                skuId: row['SKU_ID'], itemName: row['Item Name'], categoryId: catId,
                avgWeight: String(row['Avergae-Weight(kg)'] || '0.1'),
                seasonality: String(row['Seasonality'] || 'All-Year'),
                estimateTAT: `${row['Estimated_Min_TAT_Days'] || 3} Days`,
                expressMultiplier: parseFloat(row['Express_Multiplier'] || 1.5),
                gst: (parseFloat(row['GST%']) * 100) || 18,
                basePrice: parseFloat(row['Global_Base_Price'] || 0),
                discountedPrice: parseFloat(row['Global_Discounted_Price'] || 0),
                excelCategoryId: row['Category_ID'], isActive: true
            }, { upsert: true });
        }

        // 3. Pincode Mapping (Table 4)
        const mappingData = XLSX.utils.sheet_to_json(workbook.Sheets['Geofence_Pincode_Mapping']);
        const pincodeAggregation = {}; // fenceId -> [pincodes]
        
        console.log(`\n📬 Syncing Pincode Mappings (${mappingData.length} rows)...`);
        for (const row of mappingData) {
            const fid = row['fence_id'];
            const pin = String(row['pincode']);
            const mid = row['mapping_id'];
            
            await PincodeMapping.findOneAndUpdate({ mappingId: mid }, {
                mappingId: mid,
                fenceId: fid,
                pincode: pin,
                coverageType: row['coverage_type'] || 'Full'
            }, { upsert: true });

            if (!pincodeAggregation[fid]) pincodeAggregation[fid] = [];
            if (!pincodeAggregation[fid].includes(pin)) pincodeAggregation[fid].push(pin);
        }

        // 4. Geofences (Table 3)
        const fenceData = XLSX.utils.sheet_to_json(workbook.Sheets['Service_Geofences']);
        console.log(`\n🗺️ Syncing Geofences (${fenceData.length} rows)...`);
        for (const row of fenceData) {
            const fid = row['fence_id'];
            const coords = parseWKT(row['boundary_polygon (WKT Format)']);
            if (!coords) continue;

            const pins = pincodeAggregation[fid] || [];
            if (row['pincode_ref'] && !pins.includes(String(row['pincode_ref']))) pins.push(String(row['pincode_ref']));

            await ServiceArea.findOneAndUpdate({ areaName: row['area_name'] }, {
                areaName: row['area_name'], excelFenceId: fid, city: row['City'],
                isActive: row['is_active'] === 'Y',
                dynamicSurgeMultiplier: parseFloat(row['dynamic_surge_multiplier'] || 1.0),
                basePriceMultiplier: parseFloat(row['Global_Base_Price_Multiplier'] || 1.0),
                discountPriceMultiplier: parseFloat(row['Global_Discounted_Price_Multiplier'] || 1.0),
                boundary: { type: 'Polygon', coordinates: coords },
                pincodes: pins
            }, { upsert: true });
        }

        console.log('\n✨ Database Re-synchronized with Pincode Mapping Table!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

importData();
