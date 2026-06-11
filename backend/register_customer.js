import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const UserSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    role: { type: String, default: 'Customer' },
    status: { type: String, default: 'active' },
    displayName: { type: String, default: 'Test Customer' }
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function registerCustomer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const phone = '7823232323';
        
        let user = await User.findOne({ phone, role: 'Customer' });
        if (user) {
            console.log('User already exists:', user);
        } else {
            user = new User({
                phone,
                role: 'Customer',
                status: 'active',
                displayName: 'Test Customer'
            });
            await user.save();
            console.log('Successfully registered customer:', user);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

registerCustomer();
