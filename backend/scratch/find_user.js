import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const userExact = await User.findOne({ phone: '6565656565' }).lean();
        console.log('Exact Match:', userExact);
        
        const userRegex = await User.findOne({ phone: /6565656565/ }).lean();
        console.log('Regex Match:', userRegex);
        
        const allUsersCount = await User.countDocuments();
        console.log('Total Users in Database:', allUsersCount);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
