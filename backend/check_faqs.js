import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function checkFaqs() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();
        const faqs = await db.collection('faqs').find().toArray();
        console.log('ALL FAQS IN DB:');
        faqs.forEach(f => {
            console.log(`- ID: ${f._id}, Q: "${f.question}", Category: "${f.category}", Target: "${f.targetRole}", Active: ${f.isActive}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkFaqs();
