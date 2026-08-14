import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Job from '../src/models/Job.js';

async function migrate() {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    
    const result = await Job.updateMany(
        { shiftStartTime: { $exists: false } },
        { $set: { shiftStartTime: "09:00", shiftEndTime: "18:00" } }
    );
    
    console.log('Migration Completed!');
    console.log('Matched count:', result.matchedCount);
    console.log('Modified count:', result.modifiedCount);
    
    // Also update any jobs that have empty strings or null
    const result2 = await Job.updateMany(
        { $or: [ { shiftStartTime: "" }, { shiftStartTime: null } ] },
        { $set: { shiftStartTime: "09:00", shiftEndTime: "18:00" } }
    );
    console.log('Cleanup Completed!');
    console.log('Matched count:', result2.matchedCount);
    console.log('Modified count:', result2.modifiedCount);

    process.exit(0);
}
migrate();
