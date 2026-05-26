import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ServiceArea from '../src/models/ServiceArea.js';

async function test() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const lat = 22.717586;
        const lng = 75.871948;

        console.log(`Checking point: lat=${lat}, lng=${lng} -> [lng, lat] = [${lng}, ${lat}]`);

        // Check if any area matches
        const area = await ServiceArea.findOne({
            isActive: true,
            boundary: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    }
                }
            }
        });

        if (area) {
            console.log("Found matching area:", area.areaName, area._id);
        } else {
            console.log("No matching area found via $geoIntersects.");
        }

        // Let's do a manual bounding box or ray casting check, or inspect all coordinates
        const allAreas = await ServiceArea.find();
        console.log("\nChecking all areas details:");
        for (const sa of allAreas) {
            console.log(`- ${sa.areaName} (ID: ${sa._id}, isActive: ${sa.isActive})`);
            if (sa.boundary && sa.boundary.coordinates) {
                const coords = sa.boundary.coordinates[0];
                console.log(`  Coords: ${JSON.stringify(coords)}`);
                
                // Let's check winding order:
                // Sum over edges (x2-x1)(y2+y1). If positive, clockwise. If negative, counter-clockwise.
                let sum = 0;
                for (let i = 0; i < coords.length - 1; i++) {
                    const [x1, y1] = coords[i];
                    const [x2, y2] = coords[i+1];
                    sum += (x2 - x1) * (y2 + y1);
                }
                const isClockwise = sum > 0;
                console.log(`  Winding: ${isClockwise ? 'Clockwise (CW) ⚠️' : 'Counter-Clockwise (CCW) ✅'} (Sum: ${sum})`);
                
                // Let's also check if the point is within the bounding box
                const lats = coords.map(c => c[1]);
                const lngs = coords.map(c => c[0]);
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);
                const minLng = Math.min(...lngs);
                const maxLng = Math.max(...lngs);
                
                const inBBox = (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng);
                console.log(`  Point in Bounding Box: ${inBBox ? 'YES ✅' : 'NO ❌'} (Lat range: [${minLat}, ${maxLat}], Lng range: [${minLng}, ${maxLng}])`);
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
