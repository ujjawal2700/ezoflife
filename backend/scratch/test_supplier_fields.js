import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import SupplierApplication from '../src/models/SupplierApplication.js';

const MONGO_URI = process.env.MONGODB_URI;

async function main() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected!');

        // Check schema by inspecting indexes/paths
        const paths = SupplierApplication.schema.paths;
        const requiredFields = ['weeklyDay', 'thriceWeekDays', 'monthlyDate'];
        
        let allPresent = true;
        for (const field of requiredFields) {
            if (paths[field]) {
                console.log(`✅ Path "${field}" is present in Schema.`);
            } else {
                console.log(`❌ Path "${field}" is MISSING!`);
                allPresent = false;
            }
        }

        if (allPresent) {
            console.log('Schema verification SUCCESS!');
        } else {
            console.log('Schema verification FAILED!');
        }

    } catch (err) {
        console.error('Error running test script:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

main();
