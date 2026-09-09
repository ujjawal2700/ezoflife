import User from '../models/User.js';
import Order from '../models/Order.js';
import B2BOrder from '../models/B2BOrder.js';
import Ticket from '../models/Ticket.js';
import JobApplication from '../models/JobApplication.js';
import Feedback from '../models/Feedback.js';
import MasterService from '../models/MasterService.js';
import VendorMasterSupply from '../models/VendorMasterSupply.js';
import SupplierApplication from '../models/SupplierApplication.js';
import ServiceArea from '../models/ServiceArea.js';

export const getDashboardAnalytics = async (req, res) => {
    try {
        const { channel, state, city, pincode, geofence, timeRange, startDate, endDate } = req.query;

        // Parse temporal range
        let start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default 30 days
        let end = new Date();

        if (timeRange === 'Today') {
            start = new Date();
            start.setHours(0, 0, 0, 0);
        } else if (timeRange === 'Last 7 Days') {
            start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'Last 30 Days') {
            start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'Year-to-Date') {
            start = new Date(new Date().getFullYear(), 0, 1);
        } else if (timeRange === 'Custom Range' && startDate) {
            start = new Date(startDate);
            if (endDate) {
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
            }
        }

        // Resolve geofence boundary pincodes
        let geofencePincodes = [];
        if (geofence) {
            const area = await ServiceArea.findOne({ areaName: geofence });
            if (area) {
                geofencePincodes = area.pincodes || [];
            }
        }

        // Helper to construct dynamic queries for Users
        const buildUserQuery = (role, extra = {}) => {
            const q = { role, ...extra };
            q.createdAt = { $gte: start, $lte: end };

            const conditions = [];
            if (state) {
                conditions.push({
                    $or: [
                        { 'addresses.state': { $regex: new RegExp(state, 'i') } },
                        { 'shopDetails.state': { $regex: new RegExp(state, 'i') } },
                        { 'supplierDetails.state': { $regex: new RegExp(state, 'i') } }
                    ]
                });
            }
            if (city) {
                conditions.push({
                    $or: [
                        { 'addresses.city': { $regex: new RegExp(city, 'i') } },
                        { 'shopDetails.city': { $regex: new RegExp(city, 'i') } },
                        { 'supplierDetails.city': { $regex: new RegExp(city, 'i') } }
                    ]
                });
            }
            if (pincode) {
                conditions.push({
                    $or: [
                        { 'addresses.pincode': pincode },
                        { 'shopDetails.pincode': pincode },
                        { 'supplierDetails.pincode': pincode }
                    ]
                });
            }
            if (geofence) {
                if (geofencePincodes.length) {
                    conditions.push({
                        $or: [
                            { 'addresses.pincode': { $in: geofencePincodes } },
                            { 'shopDetails.pincode': { $in: geofencePincodes } },
                            { 'supplierDetails.pincode': { $in: geofencePincodes } }
                        ]
                    });
                } else {
                    q._id = null; // No pincodes matches nothing
                }
            }

            if (conditions.length) {
                q.$and = conditions;
            }
            return q;
        };

        // Helper to construct dynamic queries for B2C Orders
        const buildOrderQuery = async (extra = {}) => {
            const q = { ...extra };
            q.createdAt = { $gte: start, $lte: end };

            if (channel === 'B2B') {
                q._id = null;
                return q;
            }

            if (state || city || pincode || geofence) {
                const userQuery = buildUserQuery('Customer');
                const customerIds = await User.distinct('_id', userQuery);
                q.customer = { $in: customerIds };
            }
            return q;
        };

        // Helper to construct dynamic queries for B2B Orders
        const buildB2BOrderQuery = async (extra = {}) => {
            const q = { ...extra };
            q.createdAt = { $gte: start, $lte: end };

            if (channel === 'B2C') {
                q._id = null;
                return q;
            }

            if (city) {
                q.city = { $regex: new RegExp(city, 'i') };
            }
            if (pincode) {
                q.pincode = pincode;
            }
            if (geofence) {
                if (geofencePincodes.length) {
                    q.pincode = { $in: geofencePincodes };
                } else {
                    q._id = null;
                }
            }
            if (state) {
                const vendorQuery = buildUserQuery('Vendor');
                const vendorIds = await User.distinct('_id', vendorQuery);
                q.vendor = { $in: vendorIds };
            }
            return q;
        };

        // Helper to construct dynamic queries for Tickets
        const buildTicketQuery = async (extra = {}) => {
            const q = { ...extra };
            q.createdAt = { $gte: start, $lte: end };

            if (state || city || pincode || geofence) {
                const userQuery = buildUserQuery('Customer');
                const customerIds = await User.distinct('_id', userQuery);
                q.customer = { $in: customerIds };
            }
            return q;
        };

        // Helper to construct dynamic queries for JobApplications
        const buildJobApplicationQuery = async (extra = {}) => {
            const q = { ...extra };
            q.createdAt = { $gte: start, $lte: end };

            if (state || city || pincode || geofence) {
                const userQuery = buildUserQuery('User');
                const userIds = await User.distinct('_id', userQuery);
                q.$or = [
                    { applicant: { $in: userIds } },
                    { vendor: { $in: userIds } }
                ];
            }
            return q;
        };

        // Helper to construct dynamic queries for Feedbacks
        const buildFeedbackQuery = async (extra = {}) => {
            const q = { ...extra };
            q.createdAt = { $gte: start, $lte: end };

            if (state || city || pincode || geofence) {
                const userQuery = buildUserQuery('Customer');
                const customerIds = await User.distinct('_id', userQuery);
                q.user = { $in: customerIds };
            }
            return q;
        };

        // ----------------------------------------------------
        // MODULE 2.1: CUSTOMER ANALYTICS (Parallelized)
        // ----------------------------------------------------
        const spanMs = Math.max(24 * 60 * 60 * 1000, end.getTime() - start.getTime());
        const priorStart = new Date(start.getTime() - spanMs);
        const priorEnd = new Date(start.getTime());

        const customerQuery = buildUserQuery('Customer');
        const individualQuery = buildUserQuery('Customer', { customerType: { $ne: 'retail' } });
        const businessQuery = buildUserQuery('Customer', { customerType: 'retail' });
        const recentOrderQuery = await buildOrderQuery({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
        const recentRegQuery = buildUserQuery('Customer', { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

        const priorCustomerQuery = buildUserQuery('Customer');
        priorCustomerQuery.createdAt = { $gte: priorStart, $lt: priorEnd };

        const [
            totalCustomers,
            individualCustomers,
            businessCustomers,
            activeCustomerIds,
            recentRegUsers,
            priorCustomersCount
        ] = await Promise.all([
            User.countDocuments(customerQuery),
            User.countDocuments(individualQuery),
            User.countDocuments(businessQuery),
            Order.distinct('customer', recentOrderQuery),
            User.find(recentRegQuery).select('_id').lean(),
            User.countDocuments(priorCustomerQuery)
        ]);

        const churnRiskCount = Math.max(0, totalCustomers - activeCustomerIds.length);

        let customerTrendMoM = '0%';
        if (priorCustomersCount > 0) {
            const diff = ((totalCustomers - priorCustomersCount) / priorCustomersCount) * 100;
            customerTrendMoM = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
        } else if (totalCustomers > 0) {
            customerTrendMoM = '+100%';
        }

        // Vectorized onboarding friction check (no N+1 loop)
        const recentRegCustomerIds = recentRegUsers.map(u => u._id);
        const orderedCustomerIds = recentRegCustomerIds.length > 0 
            ? await Order.distinct('customer', { customer: { $in: recentRegCustomerIds } })
            : [];
        const onboardingFrictionCount = Math.max(0, recentRegCustomerIds.length - orderedCustomerIds.length);

        // ----------------------------------------------------
        // MODULE 2.2: VENDOR PERFORMANCE (Parallelized)
        // ----------------------------------------------------
        const vendorQuery = buildUserQuery('Vendor');
        const activeVendorOrderQuery = await buildOrderQuery({ status: { $ne: 'ORDER_PLACED' }, createdAt: { $gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } });
        const feedbackQuery = await buildFeedbackQuery({ vendor: { $exists: true } });
        const b2bOrdersQuery = await buildB2BOrderQuery();
        const b2bRecentOrdersQuery = await buildB2BOrderQuery({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
        const jobAppQuery = await buildJobApplicationQuery({ creatorRole: 'Vendor', createdAt: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } });

        const [
            totalVendors,
            localVendors,
            proprietorshipVendors,
            partnershipVendors,
            pvtLtdVendors,
            franchiseVendors,
            activeVendorIds,
            feedbacks,
            b2bOrderVendors,
            b2bRecentOrderVendors,
            talentReqIndex
        ] = await Promise.all([
            User.countDocuments(vendorQuery),
            User.countDocuments(buildUserQuery('Vendor', { businessType: { $in: ['', null] } })),
            User.countDocuments(buildUserQuery('Vendor', { businessType: 'Proprietorship' })),
            User.countDocuments(buildUserQuery('Vendor', { businessType: 'Partnership' })),
            User.countDocuments(buildUserQuery('Vendor', { businessType: 'Pvt Ltd' })),
            User.countDocuments(buildUserQuery('Vendor', { businessType: 'Franchise' })),
            Order.distinct('vendor', activeVendorOrderQuery),
            Feedback.find(feedbackQuery).populate('vendor', 'displayName phone').lean(),
            B2BOrder.distinct('vendor', b2bOrdersQuery),
            B2BOrder.distinct('vendor', b2bRecentOrdersQuery),
            JobApplication.countDocuments(jobAppQuery)
        ]);

        const dormantVendorsCount = Math.max(0, totalVendors - activeVendorIds.length);
        const neverOrderedB2B = Math.max(0, totalVendors - b2bOrderVendors.length);
        const dormancy30DaysB2B = Math.max(0, totalVendors - b2bRecentOrderVendors.length);

        // Feedback Outliers
        const vendorRatings = {};
        feedbacks.forEach(f => {
            if (!f.vendor) return;
            const id = f.vendor._id.toString();
            if (!vendorRatings[id]) {
                vendorRatings[id] = { name: f.vendor.displayName || 'Vendor', count: 0, sum: 0 };
            }
            vendorRatings[id].count++;
            vendorRatings[id].sum += f.rating;
        });

        const vendorLeaderboard = Object.keys(vendorRatings).map(id => ({
            id,
            name: vendorRatings[id].name,
            rating: Number((vendorRatings[id].sum / vendorRatings[id].count).toFixed(1)),
            count: vendorRatings[id].count
        })).sort((a, b) => b.rating - a.rating);

        const topVendors = vendorLeaderboard.slice(0, 5);
        const bottomVendors = [...vendorLeaderboard].reverse().slice(0, 5);

        // ----------------------------------------------------
        // MODULE 2.3 & 2.4: SUPPLIER & FINANCIAL INTELLIGENCE (Parallelized)
        // ----------------------------------------------------
        const supplierQuery = buildUserQuery('Supplier');
        const wholesalerQuery = buildUserQuery('Supplier', { 'supplierDetails.businessName': { $regex: /wholesaler|distributor/i } });
        const orderQ = await buildOrderQuery({ status: { $ne: 'CANCELLED' } });
        const b2bOrderQ = await buildB2BOrderQuery({ status: { $nin: ['CANCELLED', 'REJECTED'] } });
        const walletQuery = buildUserQuery('Customer');
        const refundOrderQ = await buildOrderQuery({ paymentStatus: 'Refunded' });
        const refundB2BOrderQ = await buildB2BOrderQuery({ escrowStatus: 'Refunded' });

        // Past 6 months for dynamic monthly trend
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [
            totalSuppliers,
            wholesalersCount,
            b2cRevenues,
            b2bRevenues,
            walletAgg,
            monthlyB2CAgg,
            monthlyB2BAgg,
            b2cRefundAgg,
            b2bRefundAgg,
            supplierDeliveriesAgg,
            allSuppliersList
        ] = await Promise.all([
            User.countDocuments(supplierQuery),
            User.countDocuments(wholesalerQuery),
            Order.aggregate([
                { $match: orderQ },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, platform: { $sum: '$priceBreakdown.platformFee' }, logistics: { $sum: '$priceBreakdown.logisticsFee' } } }
            ]),
            B2BOrder.aggregate([
                { $match: b2bOrderQ },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, platform: { $sum: '$platformFee' } } }
            ]),
            User.aggregate([
                { $match: walletQuery },
                { $group: { _id: null, total: { $sum: '$walletBalance' } } }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo }, status: { $ne: 'CANCELLED' } } },
                { $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    platform: { $sum: '$priceBreakdown.platformFee' },
                    logistics: { $sum: '$priceBreakdown.logisticsFee' }
                }},
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            B2BOrder.aggregate([
                { $match: { createdAt: { $gte: sixMonthsAgo }, status: { $nin: ['CANCELLED', 'REJECTED'] } } },
                { $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    platform: { $sum: '$platformFee' }
                }},
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            Order.aggregate([
                { $match: refundOrderQ },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            B2BOrder.aggregate([
                { $match: refundB2BOrderQ },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            B2BOrder.aggregate([
                { $match: { status: { $in: ['DELIVERED', 'Delivered', 'SETTLED', 'Settled'] } } },
                { $group: { _id: '$supplier', count: { $sum: 1 } } }
            ]),
            User.find({ role: 'Supplier' }).select('_id supplierDetails').lean()
        ]);

        const manufacturersCount = Math.max(0, totalSuppliers - wholesalersCount);
        const b2cRev = b2cRevenues[0]?.total || 0;
        const b2bRev = b2bRevenues[0]?.total || 0;
        const grossRevenue = (channel === 'B2B') ? b2bRev : (channel === 'B2C') ? b2cRev : (b2cRev + b2bRev);

        const b2cPlatform = b2cRevenues[0]?.platform || 0;
        const b2bPlatform = b2bRevenues[0]?.platform || 0;
        const netProfit = (channel === 'B2B') ? b2bPlatform : (channel === 'B2C') ? b2cPlatform : (b2cPlatform + b2bPlatform);

        const logisticsFee = (channel === 'B2B') ? 0 : (b2cRevenues[0]?.logistics || 0);
        const vendorPayouts = Math.max(0, grossRevenue - netProfit - logisticsFee);
        const walletLiability = walletAgg[0]?.total || 0;

        const b2cRefunds = b2cRefundAgg[0]?.total || 0;
        const b2bRefunds = b2bRefundAgg[0]?.total || 0;
        const totalRefunds = (channel === 'B2B') ? b2bRefunds : (channel === 'B2C') ? b2cRefunds : (b2cRefunds + b2bRefunds);

        // Merge real monthly aggregations
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dynamicMonthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const label = monthNames[d.getMonth()];

            const b2cItem = monthlyB2CAgg.find(item => item._id.year === y && item._id.month === m);
            const b2bItem = monthlyB2BAgg.find(item => item._id.year === y && item._id.month === m);

            const b2cMRev = b2cItem?.revenue || 0;
            const b2bMRev = b2bItem?.revenue || 0;
            const b2cMPlat = b2cItem?.platform || 0;
            const b2bMPlat = b2bItem?.platform || 0;
            const logM = b2cItem?.logistics || 0;

            const revM = (channel === 'B2B') ? b2bMRev : (channel === 'B2C') ? b2cMRev : (b2cMRev + b2bMRev);
            const profM = (channel === 'B2B') ? b2bMPlat : (channel === 'B2C') ? b2cMPlat : (b2cMPlat + b2bMPlat);
            const payM = Math.max(0, revM - profM - logM);

            dynamicMonthlyTrend.push({
                month: label,
                Revenue: Math.round(revM),
                Payouts: Math.round(payM),
                Logistics: Math.round(logM),
                Profit: Math.round(profM)
            });
        }

        // Revenue MoM calculation from real monthly history
        const curMRev = dynamicMonthlyTrend[5]?.Revenue || 0;
        const prevMRev = dynamicMonthlyTrend[4]?.Revenue || 0;
        let revenueTrendMoM = '0%';
        if (prevMRev > 0) {
            const diff = ((curMRev - prevMRev) / prevMRev) * 100;
            revenueTrendMoM = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
        } else if (curMRev > 0) {
            revenueTrendMoM = '+100%';
        }

        // Dynamic Supplier Scatter Data
        const supplierDeliveriesMap = {};
        supplierDeliveriesAgg.forEach(item => {
            if (item._id) supplierDeliveriesMap[item._id.toString()] = item.count;
        });
        const dynamicSupplierScatter = allSuppliersList.map(s => ({
            deliveries: supplierDeliveriesMap[s._id.toString()] || 0,
            rating: Number((s.supplierDetails?.rating || 5.0).toFixed(1))
        }));

        // ----------------------------------------------------
        // MODULE 2.5 & 2.6: CATALOGS (Parallelized)
        // ----------------------------------------------------
        const [
            totalServices,
            inactiveServices,
            pendingCatalogReviews,
            totalB2BProducts,
            inactiveB2BProducts,
            pendingMaterialReviews
        ] = await Promise.all([
            MasterService.countDocuments({ active: true }),
            MasterService.countDocuments({ active: false }),
            User.countDocuments(buildUserQuery('Vendor', { 'shopDetails.services.status': 'pending' })),
            VendorMasterSupply.countDocuments(),
            VendorMasterSupply.countDocuments({ active: false }),
            SupplierApplication.countDocuments({ status: 'pending' })
        ]);

        // ----------------------------------------------------
        // MODULE 2.7: B2C ORDER LIFECYCLE (Parallelized)
        // ----------------------------------------------------
        const mainOrderQuery = await buildOrderQuery();
        const acceptedOrderQuery = await buildOrderQuery({ status: { $nin: ['ORDER_PLACED', 'CANCELLED'] } });
        const logisticsBouncesQuery = await buildOrderQuery({ 'shipmentDetails.lastStatus': 'rejected' });
        const immediateTimeoutsQuery = await buildOrderQuery({ status: 'ORDER_PLACED', createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } });
        const criticalTimeoutsQuery = await buildOrderQuery({ status: 'ORDER_PLACED', createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
        const inProgressQ = await buildOrderQuery({ status: 'PROCESSING' });
        const readyForDispatchQ = await buildOrderQuery({ status: 'READY_FOR_DISPATCH' });
        const outboundLogisticsQ = await buildOrderQuery({ status: 'IN_TRANSIT' });
        const reverseLogisticsQ = await buildOrderQuery({ status: 'OUT_FOR_DELIVERY' });

        const pickupViolationsQ = await buildOrderQuery({ pickupStatus: { $in: ['failed', 'rescheduled'] } });
        const dropoffViolationsQ = await buildOrderQuery({ deliveryStatus: 'failed' });
        const vendorSlaViolationsQ = await buildOrderQuery({ 
            status: 'PROCESSING', 
            updatedAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } 
        });

        const [
            totalSubmitted,
            totalAccepted,
            logisticsBounces,
            immediateTimeouts,
            criticalTimeouts,
            inProgress,
            readyForDispatch,
            outboundLogistics,
            reverseLogistics,
            pickupViolations,
            dropoffViolations,
            vendorSlaViolations
        ] = await Promise.all([
            Order.countDocuments(mainOrderQuery),
            Order.countDocuments(acceptedOrderQuery),
            Order.countDocuments(logisticsBouncesQuery),
            Order.countDocuments(immediateTimeoutsQuery),
            Order.countDocuments(criticalTimeoutsQuery),
            Order.countDocuments(inProgressQ),
            Order.countDocuments(readyForDispatchQ),
            Order.countDocuments(outboundLogisticsQ),
            Order.countDocuments(reverseLogisticsQ),
            Order.countDocuments(pickupViolationsQ),
            Order.countDocuments(dropoffViolationsQ),
            Order.countDocuments(vendorSlaViolationsQ)
        ]);

        // ----------------------------------------------------
        // MODULE 2.8: B2B ORDER LIFECYCLE (Real MongoDB Counts)
        // ----------------------------------------------------
        const b2bTotalPlacedQ = await buildB2BOrderQuery();
        const b2bAcceptedQ = await buildB2BOrderQuery({ status: { $in: ['ACCEPTED', 'Confirmed', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'Settled'] } });
        const b2bInProgressQ = await buildB2BOrderQuery({ status: { $in: ['PROCESSING'] } });
        const b2bDispatchedQ = await buildB2BOrderQuery({ status: { $in: ['DISPATCHED', 'Out for Delivery'] } });
        const b2bDeliveredQ = await buildB2BOrderQuery({ status: { $in: ['DELIVERED', 'Settled'] } });
        const b2bCancelledQ = await buildB2BOrderQuery({ status: { $in: ['CANCELLED', 'REJECTED'] } });

        const b2bSla1hQ = await buildB2BOrderQuery({ 
            status: { $in: ['SUBMITTED', 'Submitted'] }, 
            createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } 
        });
        const b2bSla48hQ = await buildB2BOrderQuery({ 
            status: { $in: ['PROCESSING', 'ACCEPTED', 'Confirmed'] }, 
            createdAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } 
        });
        const b2bLateQ = await buildB2BOrderQuery({ 
            deliveryDate: { $lt: new Date() }, 
            status: { $nin: ['DELIVERED', 'Delivered', 'SETTLED', 'Settled', 'CANCELLED', 'Cancelled', 'REJECTED'] } 
        });
        const b2bCancelledSupplierQ = await buildB2BOrderQuery({ status: { $in: ['REJECTED', 'Rejected'] } });
        const b2bCancelledVendorQ = await buildB2BOrderQuery({ status: { $in: ['CANCELLED', 'Cancelled'] } });

        const [
            b2bPlaced,
            b2bAccepted,
            b2bProcessing,
            b2bDispatched,
            b2bDelivered,
            b2bCancelled,
            b2bSla1h,
            b2bSla48h,
            b2bLate,
            b2bCancelledSupplier,
            b2bCancelledVendor
        ] = await Promise.all([
            B2BOrder.countDocuments(b2bTotalPlacedQ),
            B2BOrder.countDocuments(b2bAcceptedQ),
            B2BOrder.countDocuments(b2bInProgressQ),
            B2BOrder.countDocuments(b2bDispatchedQ),
            B2BOrder.countDocuments(b2bDeliveredQ),
            B2BOrder.countDocuments(b2bCancelledQ),
            B2BOrder.countDocuments(b2bSla1hQ),
            B2BOrder.countDocuments(b2bSla48hQ),
            B2BOrder.countDocuments(b2bLateQ),
            B2BOrder.countDocuments(b2bCancelledSupplierQ),
            B2BOrder.countDocuments(b2bCancelledVendorQ)
        ]);

        const b2bOnTime = Math.max(0, b2bDelivered - b2bLate);

        // ----------------------------------------------------
        // MODULE 2.9 & 2.10: ATS, HELPDESK & FEEDBACK SENTIMENT (Parallelized)
        // ----------------------------------------------------
        const priorFeedbackQ = await buildFeedbackQuery({
            createdAt: { $gte: priorStart, $lt: priorEnd }
        });

        const [
            adminApplicants,
            vendorApplicants,
            supplierApplicants,
            openTickets,
            progressTickets,
            resolvedTickets,
            closedTickets,
            priorFeedbacks
        ] = await Promise.all([
            JobApplication.countDocuments(await buildJobApplicationQuery({ creatorRole: 'Admin' })),
            JobApplication.countDocuments(await buildJobApplicationQuery({ creatorRole: 'Vendor' })),
            JobApplication.countDocuments(await buildJobApplicationQuery({ creatorRole: 'Supplier' })),
            Ticket.countDocuments(await buildTicketQuery({ status: 'Open' })),
            Ticket.countDocuments(await buildTicketQuery({ status: 'In Progress' })),
            Ticket.countDocuments(await buildTicketQuery({ status: 'Resolved' })),
            Ticket.countDocuments(await buildTicketQuery({ status: 'Closed' })),
            Feedback.find(priorFeedbackQ).select('rating').lean()
        ]);

        let avgRating = 0;
        if (feedbacks.length > 0) {
            let totalRating = 0;
            feedbacks.forEach(f => { totalRating += f.rating; });
            avgRating = Number((totalRating / feedbacks.length).toFixed(1));
        }

        let feedbackTrendMoM = '0.0';
        if (priorFeedbacks.length > 0 && feedbacks.length > 0) {
            const priorAvg = priorFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / priorFeedbacks.length;
            const diff = avgRating - priorAvg;
            feedbackTrendMoM = (diff >= 0 ? '+' : '') + diff.toFixed(1);
        }

        // Dynamic Feedback Sentiment Extraction from real customer submissions
        const knownTags = [
            'Crisp Folding', 'Fresh Fragrance', 'On-Time Delivery', 'Friendly Rider', 
            'Polite Rider', 'Excellent Wash', 'Fast Service', 'Neat Packaging',
            'Late Pickup', 'Damp Clothes', 'High Delivery Fee', 'Delayed Response',
            'Improper Crease', 'Rude Rider', 'Missing Clothes', 'Poor Wash'
        ];

        const posCount = {};
        const critCount = {};

        feedbacks.forEach(f => {
            const text = (f.comment || '') + ' ' + (f.category || '');
            if (!text.trim()) return;

            if (f.rating >= 4) {
                knownTags.forEach(tag => {
                    if (new RegExp(tag, 'i').test(text)) {
                        posCount[tag] = (posCount[tag] || 0) + 1;
                    }
                });
                if (f.category && f.category !== 'Other' && f.category !== 'order') {
                    const catTag = f.category + ' Quality';
                    posCount[catTag] = (posCount[catTag] || 0) + 1;
                }
            } else {
                knownTags.forEach(tag => {
                    if (new RegExp(tag, 'i').test(text)) {
                        critCount[tag] = (critCount[tag] || 0) + 1;
                    }
                });
                if (f.category && f.category !== 'Other' && f.category !== 'order') {
                    const catTag = f.category + ' Issue';
                    critCount[catTag] = (critCount[catTag] || 0) + 1;
                }
            }
        });

        const dynamicPositiveKeywords = Object.entries(posCount)
            .sort((a, b) => b[1] - a[1])
            .map(e => e[0])
            .slice(0, 5);

        const dynamicCriticalKeywords = Object.entries(critCount)
            .sort((a, b) => b[1] - a[1])
            .map(e => e[0])
            .slice(0, 5);

        // ----------------------------------------------------
        // MODULE 2.10: PENDING PARTNER VERIFICATIONS
        // ----------------------------------------------------
        const [
            pendingVendorCount,
            pendingSupplierCount
        ] = await Promise.all([
            User.countDocuments({
                role: 'Vendor',
                $or: [
                    { onboardingStage: { $in: ['INITIAL_REVIEW', 'FINAL_REVIEW', 'DOCUMENTS_SUBMITTED', 'PENDING'] } },
                    { status: { $in: ['pending', 'revision_required'] } }
                ],
                $nor: [
                    { status: 'approved', onboardingStage: 'COMPLETED' },
                    { status: 'approved', onboardingStage: { $in: [null, undefined, ''] } }
                ]
            }),
            SupplierApplication.countDocuments({
                status: { $in: ['Pending', 'pending', 'Revision_Required'] },
                onboardingStage: { $ne: 'Onboarded' }
            })
        ]);

        // Compile all analytics response (pure database numbers)
        res.status(200).json({
            success: true,
            data: {
                channel: channel || 'All',
                pendingVerifications: {
                    total: pendingVendorCount + pendingSupplierCount,
                    vendors: pendingVendorCount,
                    suppliers: pendingSupplierCount
                },
                monthlyTrend: dynamicMonthlyTrend,
                customerAnalytics: {
                    totalCustomers: totalCustomers,
                    individualCount: individualCustomers,
                    businessCount: businessCustomers,
                    churnRisk: churnRiskCount,
                    onboardingFriction: onboardingFrictionCount,
                    trendMoM: customerTrendMoM
                },
                vendorPerformance: {
                    totalVendors: totalVendors,
                    cohorts: {
                        local: localVendors,
                        proprietorship: proprietorshipVendors,
                        partnership: partnershipVendors,
                        pvtLtd: pvtLtdVendors,
                        franchise: franchiseVendors
                    },
                    dormantCount: dormantVendorsCount,
                    topVendors: topVendors,
                    bottomVendors: bottomVendors,
                    neverOrderedB2B: neverOrderedB2B,
                    dormancy30DaysB2B: dormancy30DaysB2B,
                    talentRequisitionIndex: talentReqIndex
                },
                supplierAnalytics: {
                    totalSuppliers: totalSuppliers,
                    wholesalers: wholesalersCount,
                    manufacturers: manufacturersCount,
                    scatterData: dynamicSupplierScatter
                },
                financials: {
                    grossRevenue: grossRevenue,
                    b2cRevenue: b2cRev,
                    b2bRevenue: b2bRev,
                    vendorPayouts: vendorPayouts,
                    logisticsPayouts: logisticsFee,
                    netProfit: netProfit,
                    refunds: totalRefunds,
                    walletLiability: walletLiability,
                    trendMoM: revenueTrendMoM
                },
                catalogB2C: {
                    totalServices: totalServices,
                    inactiveServices: inactiveServices,
                    pendingReviews: pendingCatalogReviews
                },
                catalogB2B: {
                    totalProducts: totalB2BProducts,
                    inactiveProducts: inactiveB2BProducts,
                    pendingReviews: pendingMaterialReviews
                },
                orderLifecycleB2C: {
                    totalSubmitted: totalSubmitted,
                    totalAccepted: totalAccepted,
                    logisticsBounces: logisticsBounces,
                    immediateTimeouts: immediateTimeouts,
                    criticalTimeouts: criticalTimeouts,
                    inProgress: inProgress,
                    readyForDispatch: readyForDispatch,
                    outboundLogistics: outboundLogistics,
                    reverseLogistics: reverseLogistics,
                    violations: {
                        pickup: pickupViolations,
                        dropoff: dropoffViolations,
                        vendorSla: vendorSlaViolations
                    }
                },
                orderLifecycleB2B: {
                    totalPlaced: b2bPlaced,
                    totalAccepted: b2bAccepted,
                    inProgress: b2bProcessing,
                    dispatched: b2bDispatched,
                    delivered: b2bDelivered,
                    cancelled: b2bCancelled,
                    slaBreach1h: b2bSla1h,
                    slaBreach48h: b2bSla48h,
                    onTime: b2bOnTime,
                    late: b2bLate,
                    cancellations: { supplier: b2bCancelledSupplier, vendor: b2bCancelledVendor }
                },
                atsLaborExchange: {
                    admin: adminApplicants,
                    vendor: vendorApplicants,
                    supplier: supplierApplicants
                },
                helpdesk: {
                    open: openTickets,
                    inProgress: progressTickets,
                    resolved: resolvedTickets,
                    closed: closedTickets
                },
                feedbackSentiment: {
                    averageRating: avgRating,
                    trendMoM: feedbackTrendMoM,
                    positiveKeywords: dynamicPositiveKeywords,
                    criticalKeywords: dynamicCriticalKeywords
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getDashboardFilters = async (req, res) => {
    try {
        const capitalize = (str) => {
            if (!str) return '';
            return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        };

        const getStateForCity = (city) => {
            const c = city.toLowerCase();
            if (c === 'indore' || c === 'bhopal') return 'Madhya Pradesh';
            if (c === 'nashik' || c === 'mumbai' || c === 'pune') return 'Maharashtra';
            return 'Madhya Pradesh'; // default fallback
        };

        const stateCityMap = {};
        const cityPincodeMap = {};
        const geofenceMap = {};
        const allStates = new Set();

        // 1. Process ServiceAreas (Geofences)
        const serviceAreas = await ServiceArea.find({}).lean();
        for (const area of serviceAreas) {
            if (!area.city) continue;
            const normalizedCity = capitalize(area.city.trim());
            const normalizedState = getStateForCity(normalizedCity);

            allStates.add(normalizedState);

            if (!stateCityMap[normalizedState]) stateCityMap[normalizedState] = new Set();
            stateCityMap[normalizedState].add(normalizedCity);

            if (!cityPincodeMap[normalizedCity]) cityPincodeMap[normalizedCity] = new Set();
            if (area.pincodes) {
                area.pincodes.forEach(p => {
                    if (p) cityPincodeMap[normalizedCity].add(p.trim());
                });
            }

            if (!geofenceMap[normalizedCity]) geofenceMap[normalizedCity] = new Set();
            if (area.areaName) {
                geofenceMap[normalizedCity].add(capitalize(area.areaName.trim()));
            }
        }

        // 2. Process Users (Customers, Vendors, Suppliers)
        const users = await User.find({ role: { $in: ['Customer', 'Vendor', 'Supplier'] } }).lean();
        for (const u of users) {
            if (u.addresses) {
                u.addresses.forEach(addr => {
                    if (addr.state && addr.city) {
                        const s = capitalize(addr.state.trim());
                        const c = capitalize(addr.city.trim());
                        allStates.add(s);
                        if (!stateCityMap[s]) stateCityMap[s] = new Set();
                        stateCityMap[s].add(c);

                        if (addr.pincode) {
                            if (!cityPincodeMap[c]) cityPincodeMap[c] = new Set();
                            cityPincodeMap[c].add(addr.pincode.trim());
                        }
                    }
                });
            }
            const details = u.shopDetails || u.supplierDetails;
            if (details && details.city && details.state) {
                const s = capitalize(details.state.trim());
                const c = capitalize(details.city.trim());
                allStates.add(s);
                if (!stateCityMap[s]) stateCityMap[s] = new Set();
                stateCityMap[s].add(c);

                if (details.pincode) {
                    if (!cityPincodeMap[c]) cityPincodeMap[c] = new Set();
                    cityPincodeMap[c].add(details.pincode.trim());
                }
            }
        }

        // Format mapping response
        const formattedStateCityMap = {};
        const formattedCityPincodeMap = {};
        const formattedGeofenceMap = {};

        Object.keys(stateCityMap).forEach(s => {
            formattedStateCityMap[s] = Array.from(stateCityMap[s]).sort();
        });
        Object.keys(cityPincodeMap).forEach(c => {
            formattedCityPincodeMap[c] = Array.from(cityPincodeMap[c]).sort();
        });
        Object.keys(geofenceMap).forEach(c => {
            formattedGeofenceMap[c] = Array.from(geofenceMap[c]).sort();
        });

        res.status(200).json({
            success: true,
            data: {
                states: Array.from(allStates).sort(),
                stateCityMap: formattedStateCityMap,
                cityPincodeMap: formattedCityPincodeMap,
                geofenceMap: formattedGeofenceMap
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
