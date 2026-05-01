import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function check() {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const indexes = await db.collection('masterservices').indexes();
    console.log(JSON.stringify(indexes, null, 2));
    process.exit(0);
}
check();
