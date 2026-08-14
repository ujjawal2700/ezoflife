import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import B2BOrder from '../src/models/B2BOrder.js';

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Let's find completed orders (delivered, settled, cancelled, rejected)
    const completedOrders = await B2BOrder.find({
      status: { $in: ['Delivered', 'DELIVERED', 'Settled', 'SETTLED', 'Cancelled', 'CANCELLED', 'REJECTED'] }
    }).populate('supplier', 'displayName phone');

    console.log(`Found ${completedOrders.length} completed B2B orders:`);
    for (const order of completedOrders) {
      console.log(`- Order ID: ${order.b2bOrderId}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Supplier: ${order.supplier ? `${order.supplier.displayName} (${order.supplier.phone})` : 'None'}`);
      console.log(`  Items:`, order.items.map(i => `${i.name} x ${i.quantity}`));
    }
  } catch (error) {
    console.error('Error querying:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
