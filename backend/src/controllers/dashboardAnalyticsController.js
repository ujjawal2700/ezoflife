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
import { extractFeedbackTags } from '../utils/feedbackTags.js';
import { getSupplierRatings } from '../utils/supplierRatings.js';

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

        const hasGeoFilter = Boolean(state || city || pincode || geofence);

        // Location conditions for users. Deliberately has NO date component:
        // "customers in Indore" means every customer there, not only those who
        // signed up inside the selected period.
        const buildGeoConditions = () => {
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
                conditions.push(geofencePincodes.length
                    ? {
                        $or: [
                            { 'addresses.pincode': { $in: geofencePincodes } },
                            { 'shopDetails.pincode': { $in: geofencePincodes } },
                            { 'supplierDetails.pincode': { $in: geofencePincodes } }
                        ]
                    }
                    : { _id: null }); // geofence without pincodes matches nothing
            }
            return conditions;
        };

        /**
         * Users of a role in the selected location.
         * `signedUpInPeriod: true` additionally limits to users created in the
         * selected period (for "new sign-ups" style metrics only).
         */
        const buildUserQuery = (role, extra = {}, { signedUpInPeriod = false } = {}) => {
            const q = { role, ...extra };
            if (signedUpInPeriod && !extra.createdAt) {
                q.createdAt = { $gte: start, $lte: end };
            }
            const conditions = buildGeoConditions();
            if (conditions.length) q.$and = conditions;
            return q;
        };

        // Cached ids of users in the selected location, by role(s).
        const geoIdCache = {};
        const userIdsInLocation = async (roles) => {
            const key = roles.join(',');
            if (!geoIdCache[key]) {
                const q = { role: { $in: roles } };
                const conditions = buildGeoConditions();
                if (conditions.length) q.$and = conditions;
                geoIdCache[key] = await User.distinct('_id', q);
            }
            return geoIdCache[key];
        };

        // Activity queries default to the selected period, but an explicit
        // createdAt in `extra` (e.g. "last 5 days", "older than 24h",
        // "prior period") is respected instead of being overwritten.
        const withPeriod = (extra) => ({ ...extra, createdAt: extra.createdAt ?? { $gte: start, $lte: end } });

        // B2C orders, filtered by the customer's location
        const buildOrderQuery = async (extra = {}) => {
            const q = withPeriod(extra);
            if (channel === 'B2B') {
                q._id = null;
                return q;
            }
            if (hasGeoFilter) {
                q.customer = { $in: await userIdsInLocation(['Customer']) };
            }
            return q;
        };

        // B2B (vendor -> supplier) orders, filtered by the order's delivery location
        const buildB2BOrderQuery = async (extra = {}) => {
            const q = withPeriod(extra);
            if (channel === 'B2C') {
                q._id = null;
                return q;
            }
            if (city) q.city = { $regex: new RegExp(city, 'i') };
            if (pincode) q.pincode = pincode;
            if (geofence) {
                if (geofencePincodes.length) q.pincode = { $in: geofencePincodes };
                else q._id = null;
            }
            if (state) {
                q.vendor = { $in: await userIdsInLocation(['Vendor']) };
            }
            return q;
        };

        // Tickets raised by customers or vendors in the location
        const buildTicketQuery = async (extra = {}) => {
            const q = withPeriod(extra);
            if (hasGeoFilter) {
                const ids = await userIdsInLocation(['Customer', 'Vendor']);
                q.$or = [{ customer: { $in: ids } }, { vendor: { $in: ids } }];
            }
            return q;
        };

        // Job applications by applicants or for vendors in the location
        const buildJobApplicationQuery = async (extra = {}) => {
            const q = withPeriod(extra);
            if (hasGeoFilter) {
                const ids = await userIdsInLocation(['Customer', 'Vendor', 'Supplier', 'Rider']);
                q.$or = [
                    { applicant: { $in: ids } },
                    { vendor: { $in: ids } }
                ];
            }
            return q;
        };

        // Feedback from customers in the location
        const buildFeedbackQuery = async (extra = {}) => {
            const q = withPeriod(extra);
            if (hasGeoFilter) {
                q.user = { $in: await userIdsInLocation(['Customer']) };
            }
            return q;
        };

        // ----------------------------------------------------
        // MODULE 2.1: CUSTOMER ANALYTICS (Parallelized)
        // ----------------------------------------------------
        const spanMs = Math.max(24 * 60 * 60 * 1000, end.getTime() - start.getTime());
        const priorStart = new Date(start.getTime() - spanMs);
        const priorEnd = new Date(start.getTime());
        const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

        const customerQuery = buildUserQuery('Customer');
        const recentOrderQuery = await buildOrderQuery({ createdAt: { $gte: daysAgo(30) } });

        const [
            totalCustomers,
            individualCustomers,
            businessCustomers,
            activeCustomerIds,
            recentRegUsers,
            newCustomersCount,
            priorNewCustomersCount
        ] = await Promise.all([
            User.countDocuments(customerQuery),
            User.countDocuments(buildUserQuery('Customer', { customerType: { $ne: 'retail' } })),
            User.countDocuments(buildUserQuery('Customer', { customerType: 'retail' })),
            Order.distinct('customer', recentOrderQuery),
            User.find(buildUserQuery('Customer', { createdAt: { $gte: daysAgo(1) } })).select('_id').lean(),
            User.countDocuments(buildUserQuery('Customer', {}, { signedUpInPeriod: true })),
            User.countDocuments(buildUserQuery('Customer', { createdAt: { $gte: priorStart, $lt: priorEnd } }))
        ]);

        // Customers in the location with no order in the last 30 days
        const churnRiskCount = await User.countDocuments({ ...customerQuery, _id: { $nin: activeCustomerIds } });

        // Growth in new sign-ups vs the previous period of equal length
        let customerTrendMoM = '0%';
        if (priorNewCustomersCount > 0) {
            const diff = ((newCustomersCount - priorNewCustomersCount) / priorNewCustomersCount) * 100;
            customerTrendMoM = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
        } else if (newCustomersCount > 0) {
            customerTrendMoM = '+100%';
        }

        // Sign-ups in the last 24h who have not ordered yet
        const recentRegCustomerIds = recentRegUsers.map(u => u._id);
        const orderedCustomerIds = recentRegCustomerIds.length > 0 
            ? await Order.distinct('customer', { customer: { $in: recentRegCustomerIds } })
            : [];
        const onboardingFrictionCount = Math.max(0, recentRegCustomerIds.length - orderedCustomerIds.length);

        // ----------------------------------------------------
        // MODULE 2.2: VENDOR PERFORMANCE (Parallelized)
        // ----------------------------------------------------
        const vendorQuery = buildUserQuery('Vendor');
        const feedbackQuery = await buildFeedbackQuery({ vendor: { $exists: true } });
        const jobAppQuery = await buildJobApplicationQuery({ creatorRole: 'Vendor', createdAt: { $gte: daysAgo(60) } });

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
            // Vendors who handled a customer order in the last 5 days
            Order.distinct('vendor', { vendor: { $ne: null }, status: { $ne: 'ORDER_PLACED' }, createdAt: { $gte: daysAgo(5) } }),
            Feedback.find(feedbackQuery).populate('vendor', 'displayName phone').lean(),
            // Vendors who ever placed a supply order / did so in the last 30 days
            B2BOrder.distinct('vendor', { vendor: { $ne: null }, status: { $nin: ['CART', 'PENDING_PAYMENT'] } }),
            B2BOrder.distinct('vendor', { vendor: { $ne: null }, status: { $nin: ['CART', 'PENDING_PAYMENT'] }, createdAt: { $gte: daysAgo(30) } }),
            JobApplication.countDocuments(jobAppQuery)
        ]);

        const [dormantVendorsCount, neverOrderedB2B, dormancy30DaysB2B] = await Promise.all([
            // Approved vendors in the location with no customer orders in the last 5 days
            User.countDocuments({ ...vendorQuery, status: 'approved', _id: { $nin: activeVendorIds } }),
            User.countDocuments({ ...vendorQuery, _id: { $nin: b2bOrderVendors } }),
            User.countDocuments({ ...vendorQuery, _id: { $nin: b2bRecentOrderVendors } })
        ]);

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
        // Unpaid (PENDING_PAYMENT) and draft supply orders are not revenue.
        const B2B_NOT_REVENUE = ['CART', 'PENDING_PAYMENT', 'CANCELLED', 'Cancelled', 'REJECTED'];
        const supplierQuery = buildUserQuery('Supplier');
        const wholesalerQuery = buildUserQuery('Supplier', { 'supplierDetails.businessName': { $regex: /wholesaler|distributor/i } });
        const orderQ = await buildOrderQuery({ status: { $ne: 'CANCELLED' } });
        const b2bOrderQ = await buildB2BOrderQuery({ status: { $nin: B2B_NOT_REVENUE } });
        const priorOrderQ = await buildOrderQuery({ status: { $ne: 'CANCELLED' }, createdAt: { $gte: priorStart, $lt: priorEnd } });
        const priorB2BOrderQ = await buildB2BOrderQuery({ status: { $nin: B2B_NOT_REVENUE }, createdAt: { $gte: priorStart, $lt: priorEnd } });
        const refundOrderQ = await buildOrderQuery({ paymentStatus: 'Refunded' });
        const refundB2BOrderQ = await buildB2BOrderQuery({ escrowStatus: 'Refunded' });

        // Past 6 months for the monthly trend, with the same channel/location filters
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        const monthlyOrderQ = await buildOrderQuery({ status: { $ne: 'CANCELLED' }, createdAt: { $gte: sixMonthsAgo } });
        const monthlyB2BOrderQ = await buildB2BOrderQuery({ status: { $nin: B2B_NOT_REVENUE }, createdAt: { $gte: sixMonthsAgo } });

        const b2bPlatformFeeExpr = { $sum: '$platformFee' };

        const [
            totalSuppliers,
            wholesalersCount,
            b2cRevenues,
            b2bRevenues,
            priorB2CRevenues,
            priorB2BRevenues,
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
                { $group: { _id: null, total: { $sum: '$totalAmount' }, platform: b2bPlatformFeeExpr } }
            ]),
            Order.aggregate([
                { $match: priorOrderQ },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            B2BOrder.aggregate([
                { $match: priorB2BOrderQ },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            // Wallet liability is every customer's current balance, not just recent sign-ups
            User.aggregate([
                { $match: customerQuery },
                { $group: { _id: null, total: { $sum: '$walletBalance' } } }
            ]),
            Order.aggregate([
                { $match: monthlyOrderQ },
                { $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    platform: { $sum: '$priceBreakdown.platformFee' },
                    logistics: { $sum: '$priceBreakdown.logisticsFee' }
                }},
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            B2BOrder.aggregate([
                { $match: monthlyB2BOrderQ },
                { $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$totalAmount' },
                    platform: b2bPlatformFeeExpr
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
            User.find(supplierQuery).select('_id supplierDetails').lean()
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

        // Revenue change vs the previous period of equal length, same filters
        const priorB2CRev = priorB2CRevenues[0]?.total || 0;
        const priorB2BRev = priorB2BRevenues[0]?.total || 0;
        const priorGross = (channel === 'B2B') ? priorB2BRev : (channel === 'B2C') ? priorB2CRev : (priorB2CRev + priorB2BRev);
        let revenueTrendMoM = '0%';
        if (priorGross > 0) {
            const diff = ((grossRevenue - priorGross) / priorGross) * 100;
            revenueTrendMoM = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
        } else if (grossRevenue > 0) {
            revenueTrendMoM = '+100%';
        }

        // Dynamic Supplier Scatter Data
        const supplierDeliveriesMap = {};
        supplierDeliveriesAgg.forEach(item => {
            if (item._id) supplierDeliveriesMap[item._id.toString()] = item.count;
        });
        // Ratings come from vendors rating delivered supply orders; unrated suppliers stay null.
        const supplierRatings = await getSupplierRatings(allSuppliersList.map(s => s._id));
        const dynamicSupplierScatter = allSuppliersList.map(s => ({
            deliveries: supplierDeliveriesMap[s._id.toString()] || 0,
            rating: supplierRatings.get(s._id.toString())?.avgRating ?? null,
            ratingCount: supplierRatings.get(s._id.toString())?.ratingCount || 0
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
            // Schema field is `isActive` (Boolean); `active` never existed, so these were always 0.
            MasterService.countDocuments({ isActive: true }),
            MasterService.countDocuments({ isActive: false }),
            User.countDocuments(buildUserQuery('Vendor', { 'shopDetails.services.status': 'pending' })),
            // Supply products use isActive: 'y' | 'n'
            VendorMasterSupply.countDocuments({ isActive: 'y' }),
            VendorMasterSupply.countDocuments({ isActive: 'n' }),
            // Supplier-submitted products awaiting admin approval
            VendorMasterSupply.countDocuments({ approvalStatus: 'Pending' })
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
        // Status values exist in both UPPERCASE and legacy Title Case, so match both.
        const B2B_ACCEPTED = ['ACCEPTED', 'Confirmed', 'PROCESSING', 'DISPATCHED', 'Out for Delivery', 'DELIVERED', 'Delivered', 'SETTLED', 'Settled'];
        const B2B_DELIVERED = ['DELIVERED', 'Delivered', 'SETTLED', 'Settled'];
        const B2B_CLOSED = [...B2B_DELIVERED, 'CANCELLED', 'Cancelled', 'REJECTED'];

        const b2bTotalPlacedQ = await buildB2BOrderQuery({ status: { $nin: ['CART', 'PENDING_PAYMENT'] } });
        const b2bAcceptedQ = await buildB2BOrderQuery({ status: { $in: B2B_ACCEPTED } });
        const b2bInProgressQ = await buildB2BOrderQuery({ status: { $in: ['PROCESSING'] } });
        const b2bDispatchedQ = await buildB2BOrderQuery({ status: { $in: ['DISPATCHED', 'Out for Delivery'] } });
        const b2bDeliveredQ = await buildB2BOrderQuery({ status: { $in: B2B_DELIVERED } });
        const b2bCancelledQ = await buildB2BOrderQuery({ status: { $in: ['CANCELLED', 'Cancelled', 'REJECTED'] } });

        // Operational alerts: all currently-open orders past their SLA, whenever placed
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
            status: { $nin: [...B2B_CLOSED, 'CART', 'PENDING_PAYMENT'] },
            createdAt: { $exists: true }
        });
        // Delivered on or before the promised date (last update = delivery)
        const b2bOnTimeQ = await buildB2BOrderQuery({
            status: { $in: B2B_DELIVERED },
            $expr: { $lte: ['$updatedAt', '$deliveryDate'] }
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
            b2bOnTime,
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
            B2BOrder.countDocuments(b2bOnTimeQ),
            B2BOrder.countDocuments(b2bCancelledSupplierQ),
            B2BOrder.countDocuments(b2bCancelledVendorQ)
        ]);


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

        // Feedback tags from real customer submissions
        const { positive: dynamicPositiveKeywords, critical: dynamicCriticalKeywords } = extractFeedbackTags(feedbacks);

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

        const stateCityMap = {};
        const cityPincodeMap = {};
        const geofenceMap = {};
        const allStates = new Set();
        const cityState = {}; // learned from real addresses, never guessed

        const addCityToState = (s, c) => {
            allStates.add(s);
            if (!stateCityMap[s]) stateCityMap[s] = new Set();
            stateCityMap[s].add(c);
            if (!cityState[c]) cityState[c] = s;
        };
        const addPincode = (c, pin) => {
            if (!pin) return;
            if (!cityPincodeMap[c]) cityPincodeMap[c] = new Set();
            cityPincodeMap[c].add(String(pin).trim());
        };

        // 1. Users (Customers, Vendors, Suppliers): the only records that carry a state
        const users = await User.find({ role: { $in: ['Customer', 'Vendor', 'Supplier'] } })
            .select('addresses shopDetails supplierDetails').lean();
        for (const u of users) {
            (u.addresses || []).forEach(addr => {
                if (addr.state && addr.city) {
                    const c = capitalize(addr.city.trim());
                    addCityToState(capitalize(addr.state.trim()), c);
                    addPincode(c, addr.pincode);
                }
            });
            const details = u.shopDetails || u.supplierDetails;
            if (details && details.city && details.state) {
                const c = capitalize(details.city.trim());
                addCityToState(capitalize(details.state.trim()), c);
                addPincode(c, details.pincode);
            }
        }

        // 2. ServiceAreas (Geofences). They have no state field, so a city's state is
        //    taken from real addresses above; cities with none stay unmapped.
        const unmappedCities = new Set();
        const serviceAreas = await ServiceArea.find({}).select('city pincodes areaName').lean();
        for (const area of serviceAreas) {
            if (!area.city) continue;
            const normalizedCity = capitalize(area.city.trim());
            const knownState = cityState[normalizedCity];
            if (knownState) addCityToState(knownState, normalizedCity);
            else unmappedCities.add(normalizedCity);

            (area.pincodes || []).forEach(p => addPincode(normalizedCity, p));

            if (!geofenceMap[normalizedCity]) geofenceMap[normalizedCity] = new Set();
            if (area.areaName) {
                geofenceMap[normalizedCity].add(capitalize(area.areaName.trim()));
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
                // Cities served by a geofence whose state isn't recorded on any address
                unmappedCities: Array.from(unmappedCities).filter(c => !cityState[c]).sort(),
                stateCityMap: formattedStateCityMap,
                cityPincodeMap: formattedCityPincodeMap,
                geofenceMap: formattedGeofenceMap
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
