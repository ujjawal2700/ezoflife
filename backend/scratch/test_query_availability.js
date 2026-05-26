import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ServiceArea from '../src/models/ServiceArea.js';

async function testAvailability() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const lat = 22.7175865;
        const lng = 75.871948;

        console.log(`Checking point: lat=${lat}, lng=${lng}`);

        // Try to query:
        const match = await ServiceArea.findOne({
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
        console.log("Match in DB:", match ? match.areaName : "NONE");

        // Now let's create a temporary polygon that definitely covers the vendor's location:
        // Let's make it a square centered at (75.871948, 22.7175865) with size 0.02 degrees.
        const d = 0.01;
        const polyCoords = [
            [lng - d, lat - d],
            [lng + d, lat - d],
            [lng + d, lat + d],
            [lng - d, lat + d],
            [lng - d, lat - d]
        ];

        console.log("Creating temporary zone covering vendor location...");
        const tempZone = await ServiceArea.create({
            areaName: "Temp Coverage Zone",
            city: "Indore",
            boundary: {
                type: "Polygon",
                coordinates: [polyCoords]
            },
            isActive: true,
            excelFenceId: 10001
        });

        console.log("Created. Re-running availability check...");
        const matchAfter = await ServiceArea.findOne({
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
        console.log("Match in DB after inserting zone:", matchAfter ? matchAfter.areaName : "NONE");

        // Clean up
        await ServiceArea.deleteOne({ _id: tempZone._id });
        console.log("Cleaned up temp zone.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

testAvailability();
