import mongoose from 'mongoose';
import Job from './src/models/Job.js';
import dotenv from 'dotenv';
dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        const allJobs = await Job.find().lean();
        console.log('Total Jobs:', allJobs.length);
        allJobs.forEach(j => {
            console.log(`- Title: ${j.title}, CreatorRole: ${j.creatorRole}, Status: ${j.status}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
