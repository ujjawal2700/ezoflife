import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function activateFaqs() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();
        const result = await db.collection('faqs').updateMany(
            { isActive: false },
            { $set: { isActive: true } }
        );
        console.log(`Activated ${result.modifiedCount} FAQs in DB.`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

activateFaqs();
