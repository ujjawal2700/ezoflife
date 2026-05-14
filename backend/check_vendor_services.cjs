const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: 'd:/ezoflife/backend/.env' });

const userSchema = new mongoose.Schema({
    phone: String,
    shopDetails: {
        services: [{
            id: String,
            name: String,
            status: String
        }]
    }
});

const User = mongoose.model('User', userSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ phone: '9999999992' }).lean();
        if (!user) {
            console.log('User not found');
        } else {
            console.log('--- Services in ShopDetails ---');
            console.log(JSON.stringify(user.shopDetails?.services || [], null, 2));
            
            const serviceSchema = new mongoose.Schema({
                vendorId: mongoose.Schema.Types.ObjectId,
                name: String,
                approvalStatus: String
            });
            const Service = mongoose.model('Service', serviceSchema);
            const vendorServices = await Service.find({ vendorId: user._id }).lean();
            console.log('--- Services in Service Collection ---');
            console.log(JSON.stringify(vendorServices, null, 2));

            console.log('--- All Master Services (vendorId null) ---');
            const masterServices = await Service.find({ vendorId: null }).lean();
            console.log(JSON.stringify(masterServices, null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
