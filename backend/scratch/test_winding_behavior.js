import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ServiceArea from '../src/models/ServiceArea.js';

async function testWinding() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        // Define a small polygon around Indore: (75.87, 22.71)
        // Clockwise coordinates:
        const cwCoords = [
            [75.86, 22.72],
            [75.88, 22.72],
            [75.88, 22.70],
            [75.86, 22.70],
            [75.86, 22.72]
        ];

        // Counter-Clockwise coordinates:
        const ccwCoords = [
            [75.86, 22.72],
            [75.86, 22.70],
            [75.88, 22.70],
            [75.88, 22.72],
            [75.86, 22.72]
        ];

        const testPoint = [75.87, 22.71]; // inside the polygon

        // 1. Create CW area
        console.log("\n--- Testing Clockwise Polygon ---");
        const cwArea = await ServiceArea.create({
            areaName: "CW Test Zone",
            boundary: {
                type: "Polygon",
                coordinates: [cwCoords]
            },
            isActive: true,
            excelFenceId: 9999
        });

        // Query point using $geoIntersects
        const cwMatch = await ServiceArea.findOne({
            _id: cwArea._id,
            boundary: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: testPoint
                    }
                }
            }
        });
        console.log("CW Match result for point inside:", cwMatch ? "FOUND ✅" : "NOT FOUND ❌");

        // 2. Create CCW area
        console.log("\n--- Testing Counter-Clockwise Polygon ---");
        const ccwArea = await ServiceArea.create({
            areaName: "CCW Test Zone",
            boundary: {
                type: "Polygon",
                coordinates: [ccwCoords]
            },
            isActive: true,
            excelFenceId: 10000
        });

        // Query point using $geoIntersects
        const ccwMatch = await ServiceArea.findOne({
            _id: ccwArea._id,
            boundary: {
                $geoIntersects: {
                    $geometry: {
                        type: 'Point',
                        coordinates: testPoint
                    }
                }
            }
        });
        console.log("CCW Match result for point inside:", ccwMatch ? "FOUND ✅" : "NOT FOUND ❌");

        // Clean up
        await ServiceArea.deleteOne({ _id: cwArea._id });
        await ServiceArea.deleteOne({ _id: ccwArea._id });

    } catch (err) {
        console.error("Error in testing:", err);
    } finally {
        await mongoose.disconnect();
    }
}

testWinding();
