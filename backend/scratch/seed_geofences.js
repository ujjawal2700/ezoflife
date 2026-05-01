import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import ServiceArea from '../src/models/ServiceArea.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const filePath = 'd:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx';

function parseWKT(wkt) {
    if (!wkt) return null;
    // Format: POLYGON((lng lat, lng lat, ...))
    const coordsMatch = wkt.match(/\(\((.*)\)\)/);
    if (!coordsMatch) return null;
    
    const coordStrings = coordsMatch[1].split(',');
    const coords = coordStrings.map(s => {
        const [lng, lat] = s.trim().split(/\s+/).map(Number);
        return [lng, lat];
    });
    
    // Ensure it's closed (GeoJSON requirement)
    if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
        coords.push([coords[0][0], coords[0][1]]);
    }
    
    return [coords]; // Array of rings
}

async function seedGeofences() {
    try {
        console.log('Connecting to MongoDB at:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to:', mongoose.connection.name);

        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Service_Geofences'];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} geofences in Excel.`);

        let successCount = 0;
        for (const row of data) {
            const wkt = row['boundary_polygon (WKT Format)'];
            const coordinates = parseWKT(wkt);

            if (!coordinates) {
                console.warn(`⚠️ Invalid WKT for fence ${row.area_name}`);
                continue;
            }

            await ServiceArea.findOneAndUpdate(
                { excelFenceId: row.fence_id },
                {
                    areaName: row.area_name,
                    city: row.City,
                    multiplier: row.Global_Discounted_Price_Multiplier || 1.0,
                    isActive: row.is_active === 'Y',
                    boundary: {
                        type: 'Polygon',
                        coordinates: coordinates
                    },
                    excelFenceId: row.fence_id,
                    pincodes: row.pincode_ref ? [row.pincode_ref.toString()] : [],
                    color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
                },
                { upsert: true }
            );
            successCount++;
        }

        console.log(`✅ Seeded ${successCount} Service Areas.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedGeofences();
