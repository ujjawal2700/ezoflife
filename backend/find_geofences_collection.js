import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        console.log(`\nFound ${collections.length} collections. Searching for documents...`);
        
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            if (count > 0) {
                // Fetch first few documents to see if they contain 'SIYAGUNJ' or 'CHUNNA BHATTI'
                const samples = await db.collection(col.name).find({}).limit(5).toArray();
                const sampleStr = JSON.stringify(samples);
                if (sampleStr.includes('SIYAGUNJ') || sampleStr.includes('CHUNNA BHATTI') || sampleStr.includes('MUSHAKHEDI')) {
                    console.log(`\n🎯 MATCH FOUND in collection: "${col.name}" (${count} documents)`);
                    console.log(JSON.stringify(samples[0], null, 2));
                }
            }
        }
        
        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

main();
