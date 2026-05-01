import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function fix() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    try {
        await db.collection('masterservices').dropIndex('name_1');
        console.log('✅ Dropped name_1 index.');
    } catch (e) {
        console.log('⚠️ Could not drop name_1 index (might not exist):', e.message);
    }
    process.exit(0);
}
fix();
