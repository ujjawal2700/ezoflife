import mongoose from 'mongoose';
import Promotion from '../src/models/Promotion.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

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
