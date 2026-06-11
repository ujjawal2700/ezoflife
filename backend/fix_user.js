import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function fixUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const phone = '7823232323';
        
        await User.updateOne(
            { phone },
            { $set: { status: 'approved' } }
        );
        
        console.log('Fixed user status to approved');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

fixUser();
