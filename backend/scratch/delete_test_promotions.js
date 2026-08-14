import mongoose from 'mongoose';
import Promotion from '../src/models/Promotion.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const deleteResult = await Promotion.deleteMany({});
        console.log(`Successfully deleted ${deleteResult.deletedCount} promotions from the database.`);
        
    } catch (err) {
        console.error('Error deleting promotions:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
