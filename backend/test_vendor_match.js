import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get the most recent order
    const lastOrder = await Order.findOne().sort({ createdAt: -1 });
    console.log('--- LATEST ORDER ---');
    console.log('Order ID:', lastOrder.orderId);
    console.log('Customer Lat/Lng:', lastOrder.pickupLocation);
    const serviceIds = lastOrder.items.map(item => item.serviceId?.toString());
    console.log('Requested Service IDs:', serviceIds);

    console.log('\n--- VENDORS ANALYSIS ---');
    const vendors = await User.find({ role: 'Vendor', status: 'approved' });
    console.log(`Found ${vendors.length} approved vendors.`);
    
    for (const vendor of vendors) {
        console.log(`\nEvaluating Vendor: ${vendor.shopDetails?.name || vendor.phone}`);
        console.log(`Lat/Lng:`, vendor.location);
        
        let hasAllServices = true;
        if (serviceIds && serviceIds.length > 0) {
            const vendorServices = vendor.shopDetails?.services || [];
            hasAllServices = serviceIds.every(sId => {
                const vendorService = vendorServices.find(vs => vs.id === sId || vs._id?.toString() === sId);
                const isActive = vendorService && vendorService.active !== false;
                const isApproved = vendorService && vendorService.status === 'approved';
                console.log(`  Checking Service ${sId}: found=${!!vendorService}, active=${isActive}, approved=${isApproved}`);
                return isActive && isApproved;
            });
        }
        console.log(`Has required services? ${hasAllServices}`);
    }

    mongoose.disconnect();
}

run().catch(console.error);
