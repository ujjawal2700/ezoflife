import mongoose from 'mongoose';
import Job from '../src/models/Job.js';

async function inspect() {
    const uri = "mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0";
    await mongoose.connect(uri);
    const jobs = await Job.find({});
    console.log('Total Jobs:', jobs.length);
    jobs.forEach((j, i) => {
        console.log(`\n--- Job ${i+1} ---`);
        console.log('Title:', j.title);
        console.log('shiftStartTime:', j.shiftStartTime);
        console.log('shiftEndTime:', j.shiftEndTime);
        console.log('jobType:', j.jobType);
        console.log('creatorRole:', j.creatorRole);
    });
    process.exit(0);
}
inspect();
