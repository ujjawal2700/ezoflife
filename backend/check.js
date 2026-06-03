import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const u = await User.findOne({phone: '2222222222'});
    console.log(JSON.stringify(u, null, 2));
    process.exit(0);
});
