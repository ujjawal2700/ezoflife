import mongoose from 'mongoose';
import Order from '../src/models/Order.js';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const customers = await User.find({ role: 'Customer' }).select('displayName phone').lean();
    console.log(`Customers: ${customers.length}`);
    
    for (const cust of customers) {
        const orders = await Order.find({ customer: cust._id }).lean();
        console.log(`Customer: ${cust.displayName} (${cust.phone}), Total Orders: ${orders.length}`);
        
        if (orders.length > 0) {
            orders.forEach(o => {
                console.log(`  Order ID: ${o.orderId || o._id}`);
                console.log(`    Total Amount: ${o.totalAmount}`);
                console.log(`    Payment Status: ${o.paymentStatus}`);
                console.log(`    Status: ${o.status}`);
                console.log(`    Price Breakdown:`, JSON.stringify(o.priceBreakdown));
            });
        }
    }
    
    await mongoose.disconnect();
}

check().catch(console.error);
