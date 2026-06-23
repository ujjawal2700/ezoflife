import mongoose from 'mongoose';
import '../src/models/Order.js';
import '../src/models/User.js';
import '../src/models/ServiceArea.js';

// Simple implementation of point-in-polygon
function isPointInPolygon(lat, lng, polygon) {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][1]; // lat
        const yi = polygon[i][0]; // lng
        const xj = polygon[j][1]; // lat
        const yj = polygon[j][0]; // lng
        
        const intersect = ((yi > lng) !== (yj > lng))
            && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}

async function testLogic() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect('mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0');
        console.log('Connected.');
        
        const Order = mongoose.model('Order');
        const User = mongoose.model('User');
        const ServiceArea = mongoose.model('ServiceArea');
        
        const orders = await Order.find()
            .populate('customer', 'displayName phone')
            .populate('vendor', 'shopDetails phone location')
            .sort({ createdAt: -1 });
            
        const serviceAreas = await ServiceArea.find({ isActive: true });
        
        const ordersWithZone = orders.map(order => {
            let zoneName = 'N/A';
            let lat = order.pickupLocation?.lat;
            let lng = order.pickupLocation?.lng;

            if (order.orderType === 'Walk-In' && order.vendor?.location) {
                lat = order.vendor.location.lat;
                lng = order.vendor.location.lng;
            }
            
            if (lat && lng) {
                for (const area of serviceAreas) {
                    if (area.boundary?.coordinates?.[0]) {
                        const polygonCoords = area.boundary.coordinates[0];
                        if (isPointInPolygon(lat, lng, polygonCoords)) {
                            zoneName = area.areaName;
                            break;
                        }
                    }
                }
            }
            
            return {
                ...order.toObject(),
                serviceZone: zoneName
            };
        });
        
        console.log('Total orders in DB:', ordersWithZone.length);
        
        // Test filtering by zone: 'mushakhedi zone'
        const zone = 'mushakhedi zone';
        const filteredByZone = ordersWithZone.filter(o => (o.serviceZone || '').trim().toLowerCase() === zone.trim().toLowerCase());
        console.log(`Filtered by zone (${zone}):`, filteredByZone.length);
        
        // Test filtering by status: 'DELIVERED'
        const status = 'DELIVERED';
        const filteredByStatus = ordersWithZone.filter(o => (o.status || '').toUpperCase() === status.toUpperCase());
        console.log(`Filtered by status (${status}):`, filteredByStatus.length);

        // Test one walk-in logistics fee fallback
        const walkInOrder = ordersWithZone.find(o => o.orderType === 'Walk-In');
        if (walkInOrder) {
            console.log('Walk-In Order sample:');
            console.log('ID:', walkInOrder._id);
            console.log('orderType:', walkInOrder.orderType);
            console.log('deliveryCharge:', walkInOrder.deliveryCharge);
            console.log('priceBreakdown.logisticsFee:', walkInOrder.priceBreakdown?.logisticsFee);
            
            const logisticsFeeFallback = walkInOrder.orderType === 'Walk-In' 
                ? (walkInOrder.deliveryCharge || 0) 
                : (walkInOrder.priceBreakdown?.logisticsFee !== undefined ? walkInOrder.priceBreakdown.logisticsFee : (walkInOrder.deliveryCharge || 0));
            console.log('Calculated logisticsFeeFallback:', logisticsFeeFallback);
        }
        
    } catch (err) {
        console.error('Error in test:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testLogic();
