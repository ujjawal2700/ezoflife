import Order from '../models/Order.js';
import B2BOrder from '../models/B2BOrder.js';
import ServiceArea from '../models/ServiceArea.js';

/**
 * Admin Business Reports, computed from orders in a date range.
 *
 * GET /api/admin/reports/:type?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   tat        vendor turnaround time (from each order's statusHistory)
 *   heatmap    where orders come from (pickup coordinates + address pincode)
 *   leakage    revenue lost to cancellations, refunds, unpaid deliveries, discounts
 *   customers  repeat vs one-time customers
 */

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const round2 = n => Math.round((Number(n) || 0) * 100) / 100;
const round1 = n => Math.round((Number(n) || 0) * 10) / 10;

export const REPORT_TYPES = ['tat', 'heatmap', 'leakage', 'customers'];

export const parseReportRange = (query) => {
    const now = new Date();
    const from = query.from ? new Date(query.from) : new Date(now.getTime() - 30 * DAY);
    const to = query.to ? new Date(query.to) : now;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return { error: 'from/to must be valid dates' };
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    if (to < from) return { error: '"to" must be on or after "from"' };
    if (to - from > 731 * DAY) return { error: 'Range cannot exceed 2 years' };
    return { from, to };
};

/** First time the order entered one of `statuses`, from its statusHistory. */
const firstAt = (order, statuses) => {
    const hit = (order.statusHistory || [])
        .filter(h => statuses.includes(h.status) && h.timestamp)
        .map(h => new Date(h.timestamp).getTime())
        .sort((a, b) => a - b)[0];
    return hit ?? null;
};

const avg = list => (list.length ? list.reduce((s, n) => s + n, 0) / list.length : null);

// ------------------------------------------------------------------
// Vendor TAT: how long orders take, measured from recorded status changes
// ------------------------------------------------------------------
const tatReport = async ({ from, to }) => {
    const orders = await Order.find({ status: 'DELIVERED', createdAt: { $gte: from, $lte: to } })
        .select('vendor vendorSnapshot createdAt statusHistory')
        .populate('vendor', 'displayName shopDetails.name phone')
        .lean();

    const perVendor = {};
    const endToEnd = [];
    let withoutTimeline = 0;

    for (const o of orders) {
        const deliveredAt = firstAt(o, ['DELIVERED']);
        if (!deliveredAt) { withoutTimeline++; continue; }

        const totalHours = (deliveredAt - new Date(o.createdAt).getTime()) / HOUR;
        const receivedAt = firstAt(o, ['RECEIVED_BY_VENDOR']);
        const readyAt = firstAt(o, ['READY_FOR_DISPATCH']);
        const processingHours = receivedAt && readyAt && readyAt >= receivedAt ? (readyAt - receivedAt) / HOUR : null;

        endToEnd.push(totalHours);
        const id = o.vendor?._id ? String(o.vendor._id) : `snapshot:${o.vendorSnapshot?.displayName || 'unknown'}`;
        if (!perVendor[id]) {
            perVendor[id] = {
                vendorId: o.vendor?._id || null,
                name: o.vendor?.shopDetails?.name || o.vendor?.displayName || o.vendorSnapshot?.displayName || 'Unknown vendor',
                phone: o.vendor?.phone || o.vendorSnapshot?.phone || '',
                total: [],
                processing: []
            };
        }
        perVendor[id].total.push(totalHours);
        if (processingHours !== null) perVendor[id].processing.push(processingHours);
    }

    const vendors = Object.values(perVendor).map(v => ({
        vendorId: v.vendorId,
        name: v.name,
        phone: v.phone,
        orders: v.total.length,
        avgTotalHours: round1(avg(v.total)),
        avgProcessingHours: v.processing.length ? round1(avg(v.processing)) : null,
        within48h: v.total.filter(h => h <= 48).length
    })).sort((a, b) => b.avgTotalHours - a.avgTotalHours);

    const bucket = (lo, hi) => endToEnd.filter(h => h >= lo && h < hi).length;
    return {
        summary: {
            deliveredOrders: orders.length,
            measuredOrders: endToEnd.length,
            ordersWithoutTimeline: withoutTimeline,
            avgTotalHours: endToEnd.length ? round1(avg(endToEnd)) : null,
            within48hPercent: endToEnd.length ? round1((endToEnd.filter(h => h <= 48).length / endToEnd.length) * 100) : null
        },
        distribution: [
            { name: '< 24h', value: bucket(0, 24) },
            { name: '24–48h', value: bucket(24, 48) },
            { name: '48–72h', value: bucket(48, 72) },
            { name: '> 72h', value: bucket(72, Infinity) }
        ],
        vendors
    };
};

// ------------------------------------------------------------------
// Heatmap: order density from real pickup coordinates and address pincodes
// ------------------------------------------------------------------
const heatmapReport = async ({ from, to }) => {
    const orders = await Order.find({ status: { $ne: 'CANCELLED' }, createdAt: { $gte: from, $lte: to } })
        .select('pickupLocation pickupAddress totalAmount')
        .lean();

    const cells = {};
    const pincodes = {};
    let withoutLocation = 0;

    for (const o of orders) {
        const lat = Number(o.pickupLocation?.lat);
        const lng = Number(o.pickupLocation?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
            // ~1 km grid
            const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
            if (!cells[key]) cells[key] = { lat: Number(lat.toFixed(2)), lng: Number(lng.toFixed(2)), orders: 0, revenue: 0 };
            cells[key].orders += 1;
            cells[key].revenue += o.totalAmount || 0;
        } else {
            withoutLocation++;
        }

        const pin = String(o.pickupAddress || '').match(/\b[1-9]\d{5}\b/)?.[0];
        if (pin) {
            if (!pincodes[pin]) pincodes[pin] = { pincode: pin, orders: 0, revenue: 0 };
            pincodes[pin].orders += 1;
            pincodes[pin].revenue += o.totalAmount || 0;
        }
    }

    // Name the busiest cells by the service area (geofence) they fall in
    const cellList = Object.values(cells).sort((a, b) => b.orders - a.orders);
    await Promise.all(cellList.slice(0, 50).map(async (c) => {
        try {
            const area = await ServiceArea.findOne({
                boundary: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [c.lng, c.lat] } } }
            }).select('areaName city').lean();
            c.area = area ? `${area.areaName}${area.city ? `, ${area.city}` : ''}` : null;
        } catch {
            c.area = null; // no geo index / invalid boundary: leave unnamed rather than guess
        }
    }));

    return {
        summary: {
            orders: orders.length,
            mappedOrders: orders.length - withoutLocation,
            ordersWithoutLocation: withoutLocation,
            activeCells: cellList.length,
            pincodes: Object.keys(pincodes).length
        },
        cells: cellList.map(c => ({ ...c, revenue: round2(c.revenue), area: c.area ?? null })),
        pincodes: Object.values(pincodes)
            .map(p => ({ ...p, revenue: round2(p.revenue) }))
            .sort((a, b) => b.orders - a.orders)
    };
};

// ------------------------------------------------------------------
// Revenue leakage: money the platform billed but did not keep
// ------------------------------------------------------------------
const leakageReport = async ({ from, to }) => {
    const range = { createdAt: { $gte: from, $lte: to } };
    const [orders, b2bUnpaid, b2bCancelled] = await Promise.all([
        Order.find(range)
            .select('orderId status paymentStatus totalAmount discountAmount walletAmountDeducted ledger createdAt customer customerSnapshot')
            .populate('customer', 'displayName phone')
            .lean(),
        B2BOrder.find({ ...range, status: 'PENDING_PAYMENT' }).select('platformFee').lean(),
        B2BOrder.find({ ...range, status: { $in: ['CANCELLED', 'Cancelled', 'REJECTED'] } }).select('totalAmount').lean()
    ]);

    const sum = (list, f) => round2(list.reduce((s, o) => s + (Number(f(o)) || 0), 0));
    const cancelled = orders.filter(o => o.status === 'CANCELLED');
    const refunded = orders.filter(o => o.paymentStatus === 'Refunded');
    const unpaidDelivered = orders.filter(o => o.status === 'DELIVERED' && o.paymentStatus !== 'Paid' && o.paymentStatus !== 'Refunded');
    const discounted = orders.filter(o => (o.discountAmount || 0) > 0);
    const platformPromo = discounted.filter(o => o.ledger?.promoOwnerType === 'PLATFORM');
    const billed = sum(orders.filter(o => o.status !== 'CANCELLED'), o => o.totalAmount);

    const categories = [
        { key: 'cancelled', name: 'Cancelled orders', count: cancelled.length, amount: sum(cancelled, o => o.totalAmount) },
        { key: 'refunds', name: 'Refunds issued', count: refunded.length, amount: sum(refunded, o => o.totalAmount) },
        { key: 'unpaidDelivered', name: 'Delivered but unpaid', count: unpaidDelivered.length, amount: sum(unpaidDelivered, o => o.totalAmount) },
        { key: 'platformDiscounts', name: 'Platform-funded discounts', count: platformPromo.length, amount: sum(platformPromo, o => o.discountAmount) },
        { key: 'vendorDiscounts', name: 'Vendor-funded discounts', count: discounted.length - platformPromo.length, amount: round2(sum(discounted, o => o.discountAmount) - sum(platformPromo, o => o.discountAmount)) },
        { key: 'b2bUnpaidFees', name: 'Unpaid supply-order platform fees', count: b2bUnpaid.length, amount: sum(b2bUnpaid, o => o.platformFee) },
        { key: 'b2bCancelled', name: 'Cancelled/rejected supply orders', count: b2bCancelled.length, amount: sum(b2bCancelled, o => o.totalAmount) }
    ];
    // Money the platform actually lost (vendor-funded discounts and cancelled
    // supply orders are shown for context but are not platform losses).
    const lossKeys = ['refunds', 'unpaidDelivered', 'platformDiscounts', 'b2bUnpaidFees'];
    const totalLeakage = round2(categories.filter(c => lossKeys.includes(c.key)).reduce((s, c) => s + c.amount, 0));

    return {
        summary: {
            billed,
            totalLeakage,
            leakagePercent: billed ? round1((totalLeakage / billed) * 100) : null,
            walletCreditsUsed: sum(orders, o => o.walletAmountDeducted)
        },
        categories: categories.map(c => ({ ...c, countsAsLoss: lossKeys.includes(c.key) })),
        unpaidDelivered: unpaidDelivered
            .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
            .slice(0, 50)
            .map(o => ({
                orderId: o.orderId,
                customer: o.customer?.displayName || o.customerSnapshot?.displayName || o.customer?.phone || '—',
                amount: round2(o.totalAmount),
                paymentStatus: o.paymentStatus,
                createdAt: o.createdAt
            }))
    };
};

// ------------------------------------------------------------------
// Repeat customers
// ------------------------------------------------------------------
const customersReport = async ({ from, to }) => {
    const grouped = await Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' }, customer: { $ne: null }, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$customer', orders: { $sum: 1 }, spend: { $sum: '$totalAmount' }, lastOrder: { $max: '$createdAt' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $project: { orders: 1, spend: 1, lastOrder: 1, name: { $arrayElemAt: ['$user.displayName', 0] }, phone: { $arrayElemAt: ['$user.phone', 0] } } }
    ]);

    const repeat = grouped.filter(c => c.orders >= 2);
    const totalOrders = grouped.reduce((s, c) => s + c.orders, 0);
    const totalSpend = grouped.reduce((s, c) => s + (c.spend || 0), 0);
    const repeatOrders = repeat.reduce((s, c) => s + c.orders, 0);
    const repeatSpend = repeat.reduce((s, c) => s + (c.spend || 0), 0);
    const count = (lo, hi) => grouped.filter(c => c.orders >= lo && c.orders <= hi).length;

    return {
        summary: {
            customers: grouped.length,
            repeatCustomers: repeat.length,
            repeatRate: grouped.length ? round1((repeat.length / grouped.length) * 100) : null,
            repeatOrderShare: totalOrders ? round1((repeatOrders / totalOrders) * 100) : null,
            repeatRevenueShare: totalSpend ? round1((repeatSpend / totalSpend) * 100) : null,
            avgOrdersPerCustomer: grouped.length ? round1(totalOrders / grouped.length) : null
        },
        frequency: [
            { name: '1 order', value: count(1, 1) },
            { name: '2 orders', value: count(2, 2) },
            { name: '3–5 orders', value: count(3, 5) },
            { name: '6+ orders', value: count(6, Infinity) }
        ],
        topCustomers: repeat
            .sort((a, b) => b.orders - a.orders || b.spend - a.spend)
            .slice(0, 50)
            .map(c => ({ name: c.name || '—', phone: c.phone || '', orders: c.orders, spend: round2(c.spend), lastOrder: c.lastOrder }))
    };
};

const REPORTS = { tat: tatReport, heatmap: heatmapReport, leakage: leakageReport, customers: customersReport };

export const getAdminReport = async (req, res) => {
    try {
        const { type } = req.params;
        if (!REPORTS[type]) {
            return res.status(400).json({ message: `Unknown report type. Use one of: ${REPORT_TYPES.join(', ')}` });
        }
        const range = parseReportRange(req.query);
        if (range.error) return res.status(400).json({ message: range.error });

        const data = await REPORTS[type](range);
        res.json({ type, range: { from: range.from, to: range.to }, ...data });
    } catch (error) {
        console.error('Admin report error:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};

// ------------------------------------------------------------------
// Refund ledger (Payments > Refunds): every refund actually recorded
// ------------------------------------------------------------------
export const getRefundLedger = async (req, res) => {
    try {
        const [orders, b2b] = await Promise.all([
            Order.find({ paymentStatus: 'Refunded' })
                .select('orderId totalAmount walletAmountDeducted paymentMethod razorpayPaymentId updatedAt createdAt customer customerSnapshot vendor vendorSnapshot')
                .populate('customer', 'displayName phone')
                .populate('vendor', 'displayName shopDetails.name')
                .sort({ updatedAt: -1 })
                .lean(),
            B2BOrder.find({ escrowStatus: 'Refunded' })
                .select('b2bOrderId totalAmount updatedAt vendor vendorSnapshot supplier supplierSnapshot')
                .populate('vendor', 'displayName shopDetails.name')
                .populate('supplier', 'displayName')
                .sort({ updatedAt: -1 })
                .lean()
        ]);

        const rows = [
            ...orders.map(o => {
                const wallet = Math.min(o.walletAmountDeducted || 0, o.totalAmount || 0);
                return {
                    id: String(o._id),
                    kind: 'Customer order',
                    reference: o.orderId,
                    party: o.customer?.displayName || o.customerSnapshot?.displayName || o.customer?.phone || '—',
                    counterparty: o.vendor?.shopDetails?.name || o.vendor?.displayName || o.vendorSnapshot?.displayName || '—',
                    amount: round2(o.totalAmount),
                    walletRefund: round2(wallet),
                    onlineRefund: round2(o.paymentMethod === 'Online' ? (o.totalAmount || 0) - wallet : 0),
                    paymentReference: o.razorpayPaymentId || null,
                    refundedAt: o.updatedAt,
                    orderedAt: o.createdAt
                };
            }),
            ...b2b.map(o => ({
                id: String(o._id),
                kind: 'Supply order',
                reference: o.b2bOrderId,
                party: o.vendor?.shopDetails?.name || o.vendor?.displayName || o.vendorSnapshot?.displayName || '—',
                counterparty: o.supplier?.displayName || o.supplierSnapshot?.displayName || '—',
                amount: round2(o.totalAmount),
                walletRefund: 0,
                onlineRefund: round2(o.totalAmount),
                paymentReference: null,
                refundedAt: o.updatedAt,
                orderedAt: null
            }))
        ].sort((a, b) => new Date(b.refundedAt) - new Date(a.refundedAt));

        res.json({
            summary: {
                count: rows.length,
                total: round2(rows.reduce((s, r) => s + r.amount, 0)),
                toWallet: round2(rows.reduce((s, r) => s + r.walletRefund, 0)),
                online: round2(rows.reduce((s, r) => s + r.onlineRefund, 0))
            },
            refunds: rows
        });
    } catch (error) {
        console.error('Refund ledger error:', error);
        res.status(500).json({ message: 'Error loading refunds' });
    }
};
