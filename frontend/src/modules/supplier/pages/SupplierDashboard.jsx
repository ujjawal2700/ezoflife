import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { b2bOrderApi, authApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const SupplierDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('available');
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);

    const b2bStatusMapSupplier = {
        'SUBMITTED': { label: 'New Order Received', emoji: '📥', color: 'bg-amber-50 text-amber-600 border-amber-200' },
        'ACCEPTED': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'PROCESSING': { label: 'Preparing Order', emoji: '📦', color: 'bg-blue-50 text-blue-600 border-blue-200' },
        'DISPATCHED': { label: 'Shipped / En Route', emoji: '🚚', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        'DELIVERED': { label: 'Fulfilled & Completed', emoji: '🏁', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'REJECTED': { label: 'Order Declined', emoji: '🚫', color: 'bg-rose-50 text-rose-600 border-rose-200' },
        'CANCELLED': { label: 'Cancelled by Buyer', emoji: '💣', color: 'bg-red-50 text-red-600 border-red-200' },

        // Old CamelCase statuses for backward compatibility
        'Submitted': { label: 'New Order Received', emoji: '📥', color: 'bg-amber-50 text-amber-600 border-amber-200' },
        'Confirmed': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Accepted': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Out for Delivery': { label: 'Shipped / En Route', emoji: '🚚', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        'Delivered': { label: 'Fulfilled & Completed', emoji: '🏁', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Cancelled': { label: 'Cancelled by Buyer', emoji: '💣', color: 'bg-red-50 text-red-600 border-red-200' }
    };

    const getStatusLabel = (status) => b2bStatusMapSupplier[status]?.label || status;
    const getStatusIcon = (status) => b2bStatusMapSupplier[status]?.emoji || '📥';
    const getStatusColor = (status) => b2bStatusMapSupplier[status]?.color || 'bg-slate-500 text-white';

    const getNextStatus = (status) => {
        if (!status) return null;
        const s = status.toUpperCase();
        if (s === 'ACCEPTED' || s === 'CONFIRMED') return 'PROCESSING';
        if (s === 'PROCESSING') return 'DISPATCHED';
        if (s === 'DISPATCHED' || s === 'OUT FOR DELIVERY') return 'DELIVERED';
        return null;
    };


    const user = JSON.parse(localStorage.getItem('supplierData') || localStorage.getItem('userData') || localStorage.getItem('user') || '{}');
    const supplierId = user._id || user.id;

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const ordersData = await b2bOrderApi.getSupplierOrders(supplierId);
            setOrders(ordersData);
        } catch (error) {
            console.error('Fetch Data Error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (supplierId) {
            fetchOrders();
        }
    }, [supplierId]);

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            setUpdatingOrderId(orderId);
            await b2bOrderApi.updateStatus(orderId, { status: newStatus, supplierId });
            toast.success(`Order marked as ${newStatus}`);
            fetchOrders();
        } catch (error) {
            console.error('Update Status Error:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleBulkDeliver = async () => {
        const activeOrders = orders.filter(o => o.supplier && !['DELIVERED', 'Delivered', 'CANCELLED', 'Cancelled', 'REJECTED'].includes(o.status));
        if (activeOrders.length === 0) {
            toast.error('No active orders to mark as delivered');
            return;
        }

        try {
            setLoading(true);
            const orderIds = activeOrders.map(o => o._id);
            await b2bOrderApi.bulkUpdateStatus({
                orderIds,
                status: 'DELIVERED',
                supplierId
            });
            toast.success('All active orders marked as Delivered');
            fetchOrders();
        } catch (error) {
            console.error('Bulk Update Error:', error);
            toast.error('Failed to update orders');
        } finally {
            setLoading(false);
        }
    };

    const handleVendorBulkUpdate = async (orderIds, nextStatus) => {
        try {
            setLoading(true);
            await b2bOrderApi.bulkUpdateStatus({
                orderIds,
                status: nextStatus,
                supplierId
            });
            toast.success(`Orders marked as ${nextStatus}`);
            fetchOrders();
        } catch (error) {
            console.error('Bulk Update Error:', error);
            toast.error('Failed to update orders');
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }), []);
    const itemVariants = useMemo(() => ({
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }), []);

    const dashboardTabs = useMemo(() => ['Incoming Orders', 'History', 'Logistics'], []);

    const inProgressOrders = useMemo(() => {
        return orders.filter(o => 
            o.supplier && 
            ['ACCEPTED', 'Accepted', 'Confirmed', 'PROCESSING', 'Processing', 'DISPATCHED', 'Dispatched', 'Out for Delivery'].includes(o.status)
        );
    }, [orders]);

    const aggregatedStats = useMemo(() => {
        const stats = {};
        orders.forEach(order => {
            // Only aggregate orders that this supplier has accepted and aren't delivered yet
            if (order.supplier && order.status !== 'Delivered') {
                order.items.forEach(item => {
                    const name = item.name.toLowerCase();
                    if (!stats[name]) stats[name] = { quantity: 0, unit: 'Units' };
                    stats[name].quantity += item.quantity;
                    
                    if (name.includes('detergent')) stats[name].unit = 'KG';
                    else if (name.includes('softener') || name.includes('liquid')) stats[name].unit = 'Ltr';
                    else if (name.includes('hanger') || name.includes('bag')) stats[name].unit = 'Units';
                    else stats[name].unit = 'Qty';
                });
            }
        });
        return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
    }, [orders]);

    const vendorAggregatedStats = useMemo(() => {
        const vendorGroups = {};
        
        orders.forEach(order => {
            // Include orders that are Accepted, Processing, or Dispatched (belonging to this supplier)
            if (order.supplier && ['Accepted', 'ACCEPTED', 'PROCESSING', 'Dispatched', 'DISPATCHED', 'Out for Delivery'].includes(order.status)) {
                const vendorId = order.vendor?._id || 'unknown_vendor';
                
                if (!vendorGroups[vendorId]) {
                    vendorGroups[vendorId] = {
                        vendorId: vendorId,
                        vendorName: order.vendor?.displayName || 'Unknown Vendor',
                        vendorPhone: order.vendor?.phone || 'N/A',
                        deliveryAddress: order.shippingAddress || 'Address not provided',
                        deliveryCity: order.vendor?.shopDetails?.city || 'Local',
                        totalAmount: 0,
                        orderIds: [],
                        orders: [],
                        earliestOrderDate: order.createdAt,
                        items: {}
                    };
                }
                
                const group = vendorGroups[vendorId];
                group.totalAmount += order.totalAmount || 0;
                group.orderIds.push(order._id);
                group.orders.push(order);
                
                if (new Date(order.createdAt) < new Date(group.earliestOrderDate)) {
                    group.earliestOrderDate = order.createdAt;
                }

                // Aggregate items
                order.items.forEach(item => {
                    const name = item.name;
                    if (!group.items[name]) {
                        group.items[name] = { quantity: 0 };
                    }
                    group.items[name].quantity += item.quantity;
                });
            }
        });
        
        return Object.values(vendorGroups).map(group => {
            // Determine next status
            let nextStatus = 'DELIVERED';
            if (group.orders.some(o => ['Accepted', 'ACCEPTED'].includes(o.status))) {
                nextStatus = 'PROCESSING';
            } else if (group.orders.some(o => o.status === 'PROCESSING')) {
                nextStatus = 'DISPATCHED';
            }
            
            return {
                ...group,
                nextStatus,
                itemsList: Object.entries(group.items).map(([name, data]) => ({ name, ...data }))
            };
        });
    }, [orders]);

    const isToday = (dateInput) => {
        if (!dateInput) return false;
        const d = new Date(dateInput);
        const today = new Date();
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    };

    const isWithinNext2Days = (dateInput) => {
        if (!dateInput) return false;
        const d = new Date(dateInput);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfLimit = new Date(startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);
        return d.getTime() >= startOfToday.getTime() && d.getTime() < endOfLimit.getTime();
    };

    const isCurrentMonth = (dateInput) => {
        if (!dateInput) return false;
        const d = new Date(dateInput);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    const newRequestsCount = useMemo(() => {
        return orders.filter(o => 
            ['SUBMITTED', 'Confirmed', 'Open', 'Pending'].includes(o.status) && 
            isToday(o.createdAt)
        ).length;
    }, [orders]);

    const upcomingPickupsCount = useMemo(() => {
        return orders.filter(o => 
            ['ACCEPTED', 'Confirmed', 'PROCESSING'].includes(o.status) &&
            o.deliveryDate && 
            isWithinNext2Days(o.deliveryDate)
        ).length;
    }, [orders]);

    const activeOrdersCount = useMemo(() => {
        return orders.filter(o => 
            ['ACCEPTED', 'Confirmed', 'PROCESSING', 'DISPATCHED', 'Out for Delivery'].includes(o.status) && 
            isCurrentMonth(o.updatedAt || o.createdAt)
        ).length;
    }, [orders]);

    const businessBookedToday = useMemo(() => {
        return orders
            .filter(o => 
                !['SUBMITTED', 'Open', 'Pending', 'REJECTED', 'CANCELLED', 'Cancelled'].includes(o.status) && 
                isCurrentMonth(o.updatedAt || o.createdAt)
            )
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    }, [orders]);

    const totalPayoutsReceived = useMemo(() => {
        return orders
            .filter(o => 
                o.paymentStatus === 'Paid' && 
                isCurrentMonth(o.updatedAt || o.createdAt)
            )
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    }, [orders]);

    const readyForDeliveryCount = useMemo(() => {
        return orders.filter(o => o.status === 'PROCESSING').length;
    }, [orders]);

    return (
        <div className="text-on-surface min-h-screen pb-60 font-body relative">
            {/* Header */}
            <header className="px-6 pt-2 flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tighter text-slate-950 uppercase leading-none">Spinzyt</h1>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 animate-pulse"></div>
                </div>

                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center text-slate-400 shadow-sm relative"
                    >
                        <span className="material-symbols-outlined text-xl">notifications</span>
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>
                    </motion.button>

                    <motion.div 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/supplier/profile')}
                        className="w-10 h-10 rounded-full bg-white border border-black/5 overflow-hidden shadow-sm cursor-pointer"
                    >
                        <img 
                            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100" 
                            alt="Supplier" 
                            className="w-full h-full object-cover" 
                        />
                    </motion.div>
                </div>
            </header>

            {/* MONTH SUMMARY (ULTRA COMPACT BLACK & WHITE MATCHING VENDOR STYLE) */}
            <section className="px-6 mb-6 max-w-xl mx-auto w-full">
                <div className="relative bg-black text-white p-3.5 rounded-[2rem] shadow-xl border border-neutral-900">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2.5 px-1">
                            <p className="text-[12px] font-medium text-zinc-400 tracking-wider leading-none">Monthly Summary</p>
                            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
                                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'New Request', value: newRequestsCount },
                                { label: 'Upcoming Pickups (Next 2 days)', value: upcomingPickupsCount, highlight: upcomingPickupsCount > 0 },
                                { label: 'Active orders', value: activeOrdersCount },
                                { label: 'Business booked today', value: `₹${businessBookedToday.toLocaleString('en-IN')}` },
                                { label: 'Total Payouts received', value: `₹${totalPayoutsReceived.toLocaleString('en-IN')}` },
                                { label: 'Ready for delivery', value: readyForDeliveryCount },
                            ].map((stat, idx) => (
                                <div key={idx} className={`flex items-center justify-between py-1.5 px-5 rounded-full border min-h-[38px] transition-colors ${stat.highlight ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20' : 'bg-black border-white hover:border-white/80'}`}>
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className={`text-[11px] font-medium leading-tight line-clamp-1 ${stat.highlight ? 'text-red-400' : 'text-zinc-300'}`}>
                                            {stat.label}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-black shrink-0 ml-2 ${stat.highlight ? 'text-red-500' : 'text-white'}`}>
                                        {stat.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* TABS */}
            <div className="px-6 mb-6 relative z-10">
                <div className="flex p-1 bg-white/60 rounded-2xl gap-1 backdrop-blur-xl border border-black/5 shadow-sm">
                    {['available', 'queue', 'history'].map(tab => {
                        const count = tab === 'available'
                            ? orders.filter(o => ['SUBMITTED', 'Confirmed', 'Open', 'Pending'].includes(o.status)).length
                            : tab === 'queue'
                            ? inProgressOrders.length
                            : orders.filter(o => ['Delivered', 'DELIVERED', 'Settled', 'SETTLED', 'Cancelled', 'CANCELLED', 'REJECTED'].includes(o.status)).length;

                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3.5 px-1 rounded-[1.1rem] text-[9px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === tab 
                                    ? 'bg-white text-slate-950 shadow-md scale-[1.02]' 
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <span>{tab === 'available' ? 'Available' : tab === 'queue' ? 'In Progress' : 'Completed'}</span>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black tabular-nums transition-colors ${
                                    activeTab === tab ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-400'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <main className="px-6 space-y-8 flex-1 max-w-xl mx-auto w-full">
                <AnimatePresence mode="wait">
                    {activeTab === 'queue' && (
                        <motion.div 
                            key="queue" 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }} 
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <section className="space-y-4 pb-20">

                                {inProgressOrders.length === 0 ? (
                                    <div className="text-center py-10 opacity-40 italic text-xs font-black uppercase tracking-widest">No active deliveries in progress.</div>
                                ) : (
                                    inProgressOrders.map((order) => {
                                        const nextStatus = getNextStatus(order.status);
                                        return (
                                            <motion.div 
                                                key={order._id}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                className="w-full max-w-md mx-auto bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2 relative overflow-hidden group text-slate-900"
                                            >
                                                {/* Order ID */}
                                                <div className="flex justify-start items-center">
                                                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                        #{order.b2bOrderId}
                                                    </span>
                                                </div>

                                                {/* Date & Time Received */}
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Time Received</span>
                                                    <span className="text-[10px] font-black text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400">schedule</span>
                                                        {new Date(order.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Time for Delivery */}
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time for Delivery</span>
                                                    <span className="text-[10px] font-black text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400">timer</span>
                                                        {(() => {
                                                            const end = ['DELIVERED', 'Delivered', 'CANCELLED', 'Cancelled', 'REJECTED'].includes(order.status) ? new Date(order.updatedAt) : new Date();
                                                            const timeTakenMs = end - new Date(order.createdAt);
                                                            const hours = Math.floor(timeTakenMs / (1000 * 60 * 60));
                                                            const minutes = Math.floor((timeTakenMs % (1000 * 60 * 60)) / (1000 * 60));
                                                            return `${hours}h ${minutes}m`;
                                                        })()}
                                                    </span>
                                                </div>

                                                {/* Bottom Row: Amount & Action Buttons */}
                                                <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-50">
                                                    <span className="text-[12px] font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                                                        ₹{order.totalAmount || 0}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => navigate(`/supplier/order/${order._id}`)}
                                                            className="px-4 py-1.5 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                                                        >
                                                            More
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </section>
                        </motion.div>
                    )}

                    {activeTab === 'available' && (
                        <motion.div 
                            key="available" 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }} 
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div className="space-y-4 pb-20">
                                {orders.filter(o => ['SUBMITTED', 'Confirmed', 'Open', 'Pending'].includes(o.status)).length === 0 ? (
                                    <div className="text-center py-10 opacity-40 italic text-xs font-black uppercase tracking-widest">No incoming orders in your region yet.</div>
                                ) : (
                                    orders.filter(o => ['SUBMITTED', 'Confirmed', 'Open', 'Pending'].includes(o.status)).map(order => (
                                        <motion.div 
                                            key={order._id}
                                            variants={itemVariants}
                                            initial="hidden"
                                            animate="visible"
                                            className="w-full max-w-md mx-auto bg-white text-slate-900 rounded-[2rem] p-4 border border-slate-200 shadow-sm flex flex-col gap-3"
                                        >
                                            {/* Row 1: Action Buttons (Left) | Order ID (Right) */}
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleStatusUpdate(order._id, 'ACCEPTED')}
                                                        disabled={updatingOrderId === order._id}
                                                        className={`px-5 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                                            updatingOrderId === order._id ? 'bg-slate-200 text-slate-500' : 'bg-black text-white hover:bg-slate-800 shadow-md active:scale-95'
                                                        }`}
                                                    >
                                                        {updatingOrderId === order._id ? (
                                                            <>
                                                                <span className="material-symbols-outlined text-[10px] animate-spin">refresh</span>
                                                                Processing
                                                            </>
                                                        ) : (
                                                            'Accept'
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                                        #{order.b2bOrderId}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Dark summary box */}
                                            <div className="bg-slate-950 text-white rounded-[1.8rem] p-4.5 shadow-xl relative overflow-hidden group border border-white/5">
                                                <div className="absolute right-0 top-0 p-4 opacity-[0.03] rotate-12 pointer-events-none">
                                                    <span className="material-symbols-outlined text-[60px]">local_shipping</span>
                                                </div>
                                                
                                                <div className="relative z-10 flex flex-col gap-3">
                                                    {/* Row 1: Delivery Date & Day */}
                                                    <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                                                        {/* Delivery Date */}
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                                                <span className="material-symbols-outlined text-white/60 text-[12px]">calendar_today</span>
                                                            </div>
                                                            <div className="text-left min-w-0">
                                                                <p className="text-[7px] font-black text-white/30 uppercase tracking-widest leading-none mb-0.5">Delivery Date</p>
                                                                <p className="text-[10px] font-black text-white uppercase truncate">
                                                                    {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Delivery Day */}
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                                                <span className="material-symbols-outlined text-white/60 text-[12px]">schedule</span>
                                                            </div>
                                                            <div className="text-left min-w-0">
                                                                <p className="text-[7px] font-black text-white/30 uppercase tracking-widest leading-none mb-0.5">Delivery Day</p>
                                                                <p className="text-[10px] font-black text-white uppercase truncate">
                                                                    {order.deliveryDay || 'Standard Cycle'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Price at the bottom right corner */}
                                                    <div className="flex justify-end">
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[7px] font-black text-white/40 uppercase tracking-widest leading-none mb-0.5">Price</p>
                                                            <p className="text-[14px] font-black text-white tracking-tighter">₹{order.totalAmount}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Article Details with Service Name & Images vertically stacked */}
                                            <div className="border-t border-slate-100 pt-3.5 px-1 space-y-4">
                                                <p className="text-[8px] font-black text-slate-900 uppercase tracking-[0.2em] text-left mb-1">Article Details</p>
                                                <div className="space-y-4 text-left">
                                                    {order.items?.map((item, idx) => {
                                                        const itemImg = item.image || item.photo || (item.photos && item.photos[0]) || '';
                                                        return (
                                                            <div key={idx} className="space-y-2">
                                                                {/* Service Name & Qty */}
                                                                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                                                                    <p className="text-[9.5px] font-black text-slate-800 uppercase tracking-wide leading-none">{item.name}</p>
                                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/60 px-2.5 py-1 rounded-md">QTY: {item.quantity}</span>
                                                                </div>
                                                                {/* Service Image */}
                                                                <div className="w-full h-32 rounded-2xl bg-slate-50/50 border border-slate-200/40 flex items-center justify-center text-slate-300 overflow-hidden shadow-inner">
                                                                    {itemImg ? (
                                                                        <img src={itemImg.url || itemImg} alt={item.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center gap-1 opacity-40">
                                                                            <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                                                            <span className="text-[8px] font-bold uppercase tracking-widest">No Image Available</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'history' && (
                        <motion.div 
                            key="history" 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }} 
                            transition={{ duration: 0.2 }}
                            className="space-y-6 pb-20"
                        >
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-black text-slate-400 tracking-widest">Historical Shipments</h3>
                                <span className="material-symbols-outlined text-slate-300 text-sm">history</span>
                            </div>

                            <div className="space-y-3">
                                {orders.filter(o => ['Delivered', 'DELIVERED', 'Settled', 'SETTLED', 'Cancelled', 'CANCELLED', 'REJECTED'].includes(o.status)).slice(0, 50).map((order) => {
                                    const totalQty = order.items.reduce((acc, item) => acc + item.quantity, 0);
                                    const isCancelled = ['Cancelled', 'CANCELLED', 'REJECTED'].includes(order.status);
                                    const isSettled = ['Settled', 'SETTLED'].includes(order.status) || order.paymentStatus === 'Paid';
                                    
                                    return (
                                        <div 
                                            key={order._id} 
                                            onClick={() => navigate(`/supplier/order/${order._id}`)}
                                            className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                                                isCancelled ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-white border-slate-200 hover:border-slate-900 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                                                    isCancelled ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-900'
                                                }`}>
                                                    <span className="material-symbols-outlined text-xl">
                                                        {isCancelled ? 'cancel' : 'package_2'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className={`text-sm font-black tracking-tight ${isCancelled ? 'text-slate-500 line-through opacity-70' : 'text-slate-900'}`}>
                                                        Shipment #{order.b2bOrderId}
                                                    </h4>
                                                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isCancelled ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {new Date(order.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {totalQty} Items
                                                    </p>
                                                    {isCancelled && (
                                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">
                                                            Reason: Non-fulfilled / Rejected
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black tracking-tight ${isCancelled ? 'text-slate-500 opacity-50' : 'text-slate-900'}`}>₹{order.totalAmount}</p>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1 border ${getStatusColor(order.status)}`}>
                                                    <span className="text-xs">{getStatusIcon(order.status)}</span>
                                                    <span>{getStatusLabel(order.status)}</span>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {orders.filter(o => ['Delivered', 'Settled', 'Cancelled'].includes(o.status)).length === 0 && (
                                    <p className="text-center py-10 opacity-30 text-[11px] font-black uppercase tracking-widest italic">No historical data available</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default SupplierDashboard;
