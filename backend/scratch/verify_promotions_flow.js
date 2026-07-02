import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ezoflife';

import User from '../src/models/User.js';
import Promotion from '../src/models/Promotion.js';
import Order from '../src/models/Order.js';
import Service from '../src/models/Service.js';
import ServiceArea from '../src/models/ServiceArea.js';
import { getPoolOrders, vendorAcceptOrder } from '../src/controllers/orderController.js';
import http from 'http';
import { initSocket } from '../src/socket.js';

// Mock Socket.io initialization
const server = http.createServer();
initSocket(server);

async function runVerification() {
    console.log('🔄 Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);

    try {
        console.log('🧹 Cleaning existing test data...');
        await Promise.all([
            User.deleteMany({ phone: { $in: ['9999911111', '9999922222', '9999933333'] } }),
            ServiceArea.deleteMany({ areaName: 'Indore Geofence Test' }),
            Service.deleteMany({ name: 'Dry Cleaning Test' }),
            Promotion.deleteMany({ code: { $in: ['TESTVEND10', 'TESTPLAT50'] } }),
            Order.deleteMany({ specialInstructions: 'B2B TEST BOOKING' })
        ]);

        console.log('✨ Creating test customer and vendors...');
        const customer = await User.create({
            phone: '9999911111',
            role: 'Customer',
            displayName: 'Test Customer',
            status: 'approved'
        });

        // Create service
        const service = await Service.create({
            name: 'Dry Cleaning Test',
            category: 'Laundry',
            basePrice: 500,
            unit: 'Per Piece',
            status: 'Active',
            approvalStatus: 'Approved',
            isMaster: true
        });

        const vendorA = await User.create({
            phone: '9999922222',
            role: 'Vendor',
            displayName: 'Vendor A (Promotional)',
            status: 'approved',
            location: { lat: 22.7196, lng: 75.8577 }, // Inside Indore
            shopDetails: {
                name: 'Vendor A Shop',
                services: [{
                    id: service._id.toString(),
                    name: service.name,
                    adminRate: 500,
                    vendorRate: 500,
                    active: true,
                    status: 'approved'
                }]
            }
        });

        const vendorB = await User.create({
            phone: '9999933333',
            role: 'Vendor',
            displayName: 'Vendor B (Standard)',
            status: 'approved',
            location: { lat: 22.7197, lng: 75.8578 }, // Inside Indore
            shopDetails: {
                name: 'Vendor B Shop',
                services: [{
                    id: service._id.toString(),
                    name: service.name,
                    adminRate: 500,
                    vendorRate: 500,
                    active: true,
                    status: 'approved'
                }]
            }
        });

        // Create ServiceArea (Indore Geofence)
        const geofence = await ServiceArea.create({
            areaName: 'Indore Geofence Test',
            city: 'Indore',
            isActive: true,
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [75.8, 22.7],
                    [75.9, 22.7],
                    [75.9, 22.8],
                    [75.8, 22.8],
                    [75.8, 22.7]
                ]]
            }
        });

        console.log('✅ Created Geofence:', geofence.areaName);

        // Create Vendor-funded Promotion for Vendor A
        const vendorPromo = await Promotion.create({
            title: 'Vendor A 10% Off',
            code: 'TESTVEND10',
            owner_type: 'VENDOR',
            vendorId: vendorA._id,
            geofence_id: geofence._id,
            scope_type: 'SELECTED_SERVICES',
            selected_services: [service._id],
            is_exclusive_window_eligible: true,
            discountType: 'Percentage',
            discountValue: 10,
            minOrderValue: 100,
            approval_status: 'APPROVED',
            start_date: new Date(Date.now() - 3600000), // 1 hour ago
            expiryDate: new Date(Date.now() + 86400000), // 1 day later
            status: 'Active'
        });

        console.log('✅ Created Vendor Promotion:', vendorPromo.code);

        // Simulating booking from Customer
        console.log('📦 Simulating order placement...');
        
        // Mock request context for Order creation
        const reqCreate = {
            body: {
                customerId: customer._id.toString(),
                items: [{
                    serviceId: service._id.toString(),
                    name: service.name,
                    quantity: 1,
                    price: 500,
                    unit: 'pc'
                }],
                pickupSlot: { date: '2026-07-02', time: '10:00 AM - 12:00 PM' },
                deliverySlot: { date: '2026-07-03', time: '02:00 PM - 04:00 PM' },
                pickupAddress: 'Indore, MP',
                pickupLocation: { lat: 22.7196, lng: 75.8577 },
                dropAddress: 'Indore, MP',
                dropLocation: { lat: 22.7196, lng: 75.8577 },
                deliveryMode: 'Normal',
                deliveryCharge: 50,
                selectedTier: 'Essential',
                specialInstructions: 'B2B TEST BOOKING',
                areaMultiplier: 1.0,
                platformMultiplier: 0.1,
                minPlatformFee: 0,
                maxPlatformFee: 0
            }
        };

        // We can call createOrder directly or instantiate order using mongoose to test the dispatch logic
        const OrderController = await import('../src/controllers/orderController.js');
        
        let createdOrderRes;
        const resMock = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                createdOrderRes = data;
                return this;
            }
        };

        await OrderController.createOrder(reqCreate, resMock);

        if (!createdOrderRes || !createdOrderRes._id) {
            throw new Error('Order creation failed in verification script!');
        }

        console.log('🚀 Order created successfully. ID:', createdOrderRes.orderId);
        console.log('Allocation Status:', createdOrderRes.allocation_status);
        console.log('Allocation Expires At:', createdOrderRes.allocation_expires_at);

        if (createdOrderRes.allocation_status !== 'PROMO_EXCLUSIVE') {
            throw new Error('FAIL: Order should have been in PROMO_EXCLUSIVE allocation!');
        }

        // Test Visibility for Vendor A vs Vendor B
        console.log('🔍 Testing exclusive pool visibility...');
        let poolForA, poolForB;
        
        const resPoolA = {
            status: () => resPoolA,
            json: (data) => { poolForA = data; }
        };
        const resPoolB = {
            status: () => resPoolB,
            json: (data) => { poolForB = data; }
        };

        await getPoolOrders({ query: { vendorId: vendorA._id.toString() } }, resPoolA);
        await getPoolOrders({ query: { vendorId: vendorB._id.toString() } }, resPoolB);

        const orderInPoolA = poolForA.find(o => o._id.toString() === createdOrderRes._id.toString());
        const orderInPoolB = poolForB.find(o => o._id.toString() === createdOrderRes._id.toString());

        console.log('Is visible to Vendor A (Promotional):', !!orderInPoolA);
        console.log('Is visible to Vendor B (Non-Promotional):', !!orderInPoolB);

        if (!orderInPoolA || orderInPoolB) {
            throw new Error('FAIL: Exclusive priority visibility filtering failed!');
        }

        // Test Acceptance by Vendor B (Should Fail during exclusive window)
        console.log('🔒 Testing accept lock for standard vendor B...');
        let acceptResB;
        const resAcceptB = {
            status: function(code) { this.statusCode = code; return this; },
            json: (data) => { acceptResB = data; }
        };

        await vendorAcceptOrder({ params: { id: createdOrderRes._id.toString() }, body: { vendorId: vendorB._id.toString() } }, resAcceptB);
        console.log('Vendor B Accept status code:', resAcceptB.statusCode, 'Message:', acceptResB.message);
        if (resAcceptB.statusCode !== 400) {
            throw new Error('FAIL: Vendor B should not have been allowed to accept this exclusive order!');
        }

        // Test Acceptance by Vendor A (Should succeed and trigger split)
        console.log('🔓 Testing accept for promotional vendor A...');
        let acceptResA;
        const resAcceptA = {
            status: function(code) { this.statusCode = code; return this; },
            json: (data) => { acceptResA = data; }
        };

        await vendorAcceptOrder({ params: { id: createdOrderRes._id.toString() }, body: { vendorId: vendorA._id.toString() } }, resAcceptA);
        console.log('Vendor A Accept status code:', resAcceptA.statusCode);

        if (resAcceptA.statusCode !== 200) {
            throw new Error('FAIL: Vendor A failed to accept the matching exclusive order!');
        }

        // Fetch accepted order and verify ledger split
        const acceptedOrder = await Order.findById(createdOrderRes._id);
        console.log('\n📊 --- Verification B2B Ledger Calculations ---');
        console.log('Customer Paid Total:', acceptedOrder.totalAmount);
        console.log('Platform Fee (10%):', acceptedOrder.ledger.platformFee);
        console.log('Promo Discount Value (10% of total):', acceptedOrder.ledger.appliedPromoValue);
        console.log('Final Vendor Net Payout (Paid - Fee - Promo):', acceptedOrder.ledger.vendorNetPayout);
        console.log('Customer Wallet Credit (50% of Promo):', acceptedOrder.ledger.customerWalletCredit);
        console.log('Spinzyt Combined Revenue (Platform Fee + 50% Promo):', acceptedOrder.ledger.spinzytCombinedRevenue);
        console.log('--------------------------------------------------\n');

        // Customer wallet balance check
        const updatedCustomer = await User.findById(customer._id);
        console.log('Customer Wallet Balance:', updatedCustomer.walletBalance);

        if (updatedCustomer.walletBalance !== acceptedOrder.ledger.customerWalletCredit) {
            throw new Error('FAIL: Customer wallet balance was not credited correctly!');
        }

        // Verify math values:
        // totalAmount = 550 + 27.5 (GST) = ~578 (Wait, base is 500, logistics is 50, GST is 27.5, total is 578)
        // Standard platform fee = 578 * 10% = 57.8
        // Promo value = 10% of 578 = 57.8
        // Vendor Net Payout = 578 - 57.8 - 57.8 = 462.4
        // Customer credit = 28.9
        // Spinzyt combined = 57.8 + 28.9 = 86.7
        if (Math.round(acceptedOrder.ledger.vendorNetPayout + acceptedOrder.ledger.platformFee + acceptedOrder.ledger.appliedPromoValue) !== acceptedOrder.totalAmount) {
            throw new Error('FAIL: Ledger values do not sum to totalAmount!');
        }

        console.log('✨ Test Case 2: Expiry & General Pool Release');
        // Let's create another order and set its expiry to the past to test pool release
        const reqCreate2 = { ...reqCreate, body: { ...reqCreate.body, specialInstructions: 'B2B TEST BOOKING EXPIRY' } };
        let createdOrderRes2;
        await OrderController.createOrder(reqCreate2, resMock);
        createdOrderRes2 = createdOrderRes;
        
        // Update its expiration in the past
        await Order.findByIdAndUpdate(createdOrderRes2._id, {
            allocation_expires_at: new Date(Date.now() - 1000)
        });

        // Let's check pool for Vendor B now (who had no matched promos)
        poolForB = null;
        await getPoolOrders({ query: { vendorId: vendorB._id.toString() } }, resPoolB);
        const expiredOrderInPoolB = poolForB.find(o => o._id.toString() === createdOrderRes2._id.toString());
        console.log('Is expired priority order visible to Vendor B:', !!expiredOrderInPoolB);
        if (!expiredOrderInPoolB) {
            throw new Error('FAIL: Expired exclusive priority orders are not being auto-released to the general pool!');
        }

        console.log('\n🎉 SUCCESS! ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
    } catch (e) {
        console.error('❌ VERIFICATION FAILED:', e);
    } finally {
        console.log('🧹 Cleaning test data...');
        await Promise.all([
            User.deleteMany({ phone: { $in: ['9999911111', '9999922222', '9999933333'] } }),
            ServiceArea.deleteMany({ areaName: 'Indore Geofence Test' }),
            Service.deleteMany({ name: 'Dry Cleaning Test' }),
            Promotion.deleteMany({ code: { $in: ['TESTVEND10', 'TESTPLAT50'] } }),
            Order.deleteMany({ specialInstructions: { $in: ['B2B TEST BOOKING', 'B2B TEST BOOKING EXPIRY'] } })
        ]);
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

runVerification();
