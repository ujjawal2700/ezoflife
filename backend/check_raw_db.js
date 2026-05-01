import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function checkRaw() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();
        const sample = await db.collection('masterservices').findOne({ name: 'Bedsheet - D' });
        console.log('RAW DB DATA:', JSON.stringify(sample, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkRaw();
