import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const phone = '9234343434';
        const user = await User.findOne({ phone });
        console.log('User Details in DB:', JSON.stringify(user, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
