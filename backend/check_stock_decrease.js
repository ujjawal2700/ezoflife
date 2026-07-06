import mongoose from 'mongoose';
import B2BOrder from './src/models/B2BOrder.js';
import VendorMasterSupply from './src/models/VendorMasterSupply.js';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        console.log('Connected to DB');
        
        // Find a recent confirmed/submitted B2B order
        const orders = await B2BOrder.find({ status: 'SUBMITTED' }).sort({ createdAt: -1 }).limit(5).lean();
        
        for (const order of orders) {
            console.log(`\nOrder ID: ${order.b2bOrderId} (${order._id})`);
            console.log(`Payment Status: ${order.paymentStatus}, Order Status: ${order.status}`);
            for (const item of order.items) {
                console.log(`- Item Name: ${item.name}`);
                console.log(`  Ordered Qty: ${item.quantity}`);
                console.log(`  Material ID: ${item.materialId}`);
                if (item.materialId) {
                    const supply = await VendorMasterSupply.findById(item.materialId).lean();
                    if (supply) {
                        console.log(`  Current Stock in DB: "${supply.quantity}"`);
                        console.log(`  Wholesale Rate: ${supply.wholesaleRate}`);
                    } else {
                        console.log(`  Supply not found in DB!`);
                    }
                }
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
