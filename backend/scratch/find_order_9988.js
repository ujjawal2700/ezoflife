import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';

const MONGO_URI = 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function check() {
    await mongoose.connect(MONGO_URI);
    
    // Find order ending in 9988 or with ID containing 9988
    const order = await Order.findOne({ 
        $or: [
            { orderId: /9988/ }
        ]
    })
    .populate('customer')
    .populate('vendor')
    .lean();

    if (!order) {
        console.log('Order not found!');
        // Let's print some sample orders
        const sampleOrders = await Order.find({}).limit(5).populate('customer').populate('vendor').lean();
        console.log('Sample orders in DB:');
        for (const o of sampleOrders) {
            console.log(`Order: ${o.orderId}, ID: ${o._id}`);
            console.log(`  Customer: ${o.customer?.displayName} (${o.customer?.customerType}) - GST: ${o.customer?.gstNumber}`);
            console.log(`  Vendor: ${o.vendor?.shopDetails?.name} - GST: ${o.vendor?.shopDetails?.gst}`);
        }
    } else {
        console.log('--- Found Order Details ---');
        console.log('Order ID:', order.orderId);
        console.log('Customer:', order.customer?.displayName);
        console.log('  customerType:', order.customer?.customerType);
        console.log('  gstNumber:', order.customer?.gstNumber);
        console.log('Vendor:', order.vendor?.shopDetails?.name);
        console.log('  GST:', order.vendor?.shopDetails?.gst);
        console.log('  gstNumber (root):', order.vendor?.gstNumber);
    }
    
    await mongoose.disconnect();
}
check();
