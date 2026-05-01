import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';

// Load models
import Category from '../src/models/Category.js';
import MasterService from '../src/models/MasterService.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';
const filePath = 'd:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx';

async function seed() {
    try {
        console.log('Connecting to MongoDB at:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to:', mongoose.connection.name);

        const workbook = XLSX.readFile(filePath);

        // 1. SEED CATEGORIES
        console.log('Reading Categories...');
        const catSheet = workbook.Sheets['Spinzyt_DB_Categories'];
        const catData = XLSX.utils.sheet_to_json(catSheet);
        
        console.log(`Found ${catData.length} categories in Excel.`);
        
        const categoryMap = {}; // excel_id -> mongo_id

        for (const row of catData) {
            const cat = await Category.findOneAndUpdate(
                { 
                    mainCategory: row['Main Category'], 
                    subCategory: row['SubCategory'] 
                },
                { 
                    mainCategory: row['Main Category'], 
                    subCategory: row['SubCategory'],
                    excelCategoryId: row['Category_ID']
                },
                { upsert: true, new: true }
            );
            categoryMap[row['Category_ID']] = cat._id;
        }
        console.log('✅ Categories synchronized.');

        // 2. SEED MASTER SERVICES
        console.log('Reading Master Services...');
        const serviceSheet = workbook.Sheets['Spinzyt_DB_Services_Master'];
        const serviceData = XLSX.utils.sheet_to_json(serviceSheet);
        
        console.log(`Found ${serviceData.length} services in Excel.`);
        
        let successCount = 0;
        for (const row of serviceData) {
            const mongoCatId = categoryMap[row['Category_ID']];
            if (!mongoCatId) {
                console.warn(`⚠️ Category ID ${row['Category_ID']} not found for item ${row['Item Name']}`);
                continue;
            }

            const itemName = row['Item Name'] || '';
            const isPerKg = itemName.toLowerCase().includes('per kg');

            const item = await MasterService.findOneAndUpdate(
                { skuId: row['SKU_ID'] },
                {
                    itemName: itemName,
                    categoryId: mongoCatId,
                    basePrice: row['Global_Base_Price'] || 0,
                    discountedPrice: row['Global_Discounted_Price'] || 0,
                    unit: isPerKg ? 'per_kg' : 'per_item',
                    description: `${itemName} - ${row['Seasonality']} care.`,
                    skuId: row['SKU_ID'],
                    tier: row['Global_Base_Price'] > 500 ? 'Heritage' : 'Essential',
                    isActive: true
                },
                { upsert: true, new: true }
            );
            console.log(`Saved: ${item.itemName} | Unit: ${item.unit}`);
            successCount++;
        }

        console.log(`✅ Seeded ${successCount} Master Services.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
