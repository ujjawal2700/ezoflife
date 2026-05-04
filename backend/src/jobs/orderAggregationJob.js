
import cron from 'node-cron';
import B2BOrder from '../models/B2BOrder.js';
import SystemConfig from '../models/SystemConfig.js';
import { getNextDeliveryDate, isBeforeCutoff } from '../utils/cycleHelper.js';

/**
 * This job runs every hour to check if any "Open" orders need to be "Locked".
 * An order is locked if the current time has passed the cutoff for its delivery cycle.
 */
export const startOrderAggregationJob = () => {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
        console.log('🕒 [JOB] Checking for B2B orders to lock...');
        
        try {
            // Find all "Open" orders
            const openOrders = await B2BOrder.find({ status: 'Open' });
            
            for (const order of openOrders) {
                // If current time is past cutoff (cutoff is 24 hours before deliveryDate)
                if (!isBeforeCutoff(order.deliveryDate, 24)) {
                    console.log(`🔒 [JOB] Locking order ${order.b2bOrderId} for Cycle ${order.cycleId}`);
                    order.status = 'Locked';
                    // After locking, it appears in the pool for suppliers to claim
                    await order.save();
                }
            }
        } catch (err) {
            console.error('❌ [JOB_ERROR] Failed to lock orders:', err);
        }
    });
};
