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

    const DetailModal = ({ order, onClose }) => {
        if (!order) return null;
        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Shipment Detail</p>
                                <h3 className="text-xl font-bold text-slate-900">#{order.b2bOrderId}</h3>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-700">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor Name</p>
                                        <p className="text-sm font-black text-slate-900">{order.vendor?.displayName || 'Unknown Vendor'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400">
                                        <span className="material-symbols-outlined">location_on</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivery Address</p>
                                        <p className="text-[11px] font-bold text-slate-600 leading-tight">{order.shippingAddress}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Items</p>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-black text-slate-600 bg-slate-100 w-8 h-8 flex items-center justify-center rounded-lg">x{item.quantity}</span>
                                                <span className="text-[12px] font-bold text-slate-700">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 tracking-tight">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Amount</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{order.totalAmount}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-2xl ${order.status === 'Cancelled' ? 'bg-slate-200' : 'bg-slate-900'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${order.status === 'Cancelled' ? 'text-slate-600' : 'text-white'}`}>
                                        <span className="material-symbols-outlined text-[14px]">
                                            {order.status === 'Cancelled' ? 'cancel' : 'verified'}
                                        </span>
                                        {order.status === 'Cancelled' ? 'Cancelled' : order.status === 'Settled' || order.paymentStatus === 'Paid' ? 'Settled' : 'Delivered'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        );
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
            await b2bOrderApi.updateStatus(orderId, { status: newStatus, supplierId });
            toast.success(`Order marked as ${newStatus}`);
            fetchOrders();
        } catch (error) {
            console.error('Update Status Error:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const handleBulkDeliver = async () => {
        const activeOrders = orders.filter(o => o.supplier && o.status !== 'Delivered');
        if (activeOrders.length === 0) {
            toast.error('No active orders to mark as delivered');
            return;
        }

        try {
            setLoading(true);
            const orderIds = activeOrders.map(o => o._id);
            await b2bOrderApi.bulkUpdateStatus({
                orderIds,
                status: 'Delivered',
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

    const handleVendorBulkUpdate = async (orderIds, isAllDispatched) => {
        const nextStatus = isAllDispatched ? 'Delivered' : 'Dispatched';
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
            // Include orders that are Accepted or Dispatched (belonging to this supplier)
            if (order.supplier && (order.status === 'Accepted' || order.status === 'Dispatched')) {
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
                        allDispatched: true, // Will become false if any order is 'Accepted'
                        earliestOrderDate: order.createdAt,
                        items: {}
                    };
                }
                
                const group = vendorGroups[vendorId];
                group.totalAmount += order.totalAmount || 0;
                group.orderIds.push(order._id);
                
                if (order.status === 'Accepted') {
                    group.allDispatched = false;
                }
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
        
        return Object.values(vendorGroups).map(group => ({
            ...group,
            itemsList: Object.entries(group.items).map(([name, data]) => ({ name, ...data }))
        }));
    }, [orders]);

    return (
        <div className="bg-background text-on-surface min-h-screen pb-60 font-body relative">
            <AnimatePresence>
                {showModal && (
                    <DetailModal 
                        order={selectedOrder} 
                        onClose={() => setShowModal(false)} 
                    />
                )}
            </AnimatePresence>
            {/* Header */}
            <header className="px-6 pt-6 flex items-center justify-between mb-10">
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

            {/* TABS */}
            <div className="px-6 mb-6 relative z-10">
                <div className="flex p-1 bg-white/60 rounded-2xl gap-1 backdrop-blur-xl border border-black/5 shadow-sm">
                    {['available', 'queue', 'history'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                activeTab === tab 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                            }`}
                        >
                            {tab === 'available' ? 'Available' : tab === 'queue' ? 'Queue' : 'History'}
                        </button>
                    ))}
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
                            className="space-y-8"
                        >
                            {/* 1. VENDOR-WISE CONSOLIDATION QUEUE */}
                            <section className="space-y-6 pb-6">
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <h3 className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Vendor Consolidation Queue</h3>
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                                        {vendorAggregatedStats.length} Vendors
                                    </span>
                                </div>

                                {vendorAggregatedStats.length === 0 ? (
                                    <div className="text-center py-10 opacity-40 italic text-xs font-black uppercase tracking-widest">No active deliveries scheduled.</div>
                                ) : (
                                    vendorAggregatedStats.map((vendorGroup, idx) => (
                                        <motion.div 
                                            key={vendorGroup.vendorId}
                                            variants={itemVariants}
                                            initial="hidden"
                                            animate="visible"
                                            className="bg-white rounded-[2.5rem] border border-black/5 shadow-lg shadow-slate-200/50 overflow-hidden"
                                        >
                                            {/* Vendor Header */}
                                            <div className="bg-slate-900 p-6 flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                                                        <span className="material-symbols-outlined">storefront</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-white tracking-tight uppercase">{vendorGroup.vendorName}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <span className="material-symbols-outlined text-[12px]">call</span>
                                                            {vendorGroup.vendorPhone}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                                                    vendorGroup.allDispatched ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                                                }`}>
                                                    {vendorGroup.allDispatched ? 'Ready to Deliver' : 'Needs Dispatch'}
                                                </span>
                                            </div>

                                            <div className="p-6 space-y-6">
                                                {/* Address Info */}
                                                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-start gap-3">
                                                    <span className="material-symbols-outlined text-slate-400 mt-0.5">location_on</span>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery Address</p>
                                                        <p className="text-xs font-bold text-slate-700 leading-relaxed italic">{vendorGroup.deliveryAddress}</p>
                                                    </div>
                                                </div>

                                                {/* Delivery Schedule & Amount */}
                                                <div className="flex items-center justify-between px-2">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Scheduled Date</p>
                                                        <p className="text-sm font-black text-slate-800">
                                                            {new Date(new Date(vendorGroup.earliestOrderDate).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aggregated Total</p>
                                                        <p className="text-2xl font-black text-primary tracking-tighter">₹{vendorGroup.totalAmount.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                {/* Aggregated Items Inventory */}
                                                <div className="space-y-3">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Consolidated Inventory</p>
                                                    <div className="bg-slate-50 rounded-3xl p-4 grid grid-cols-2 gap-3">
                                                        {vendorGroup.itemsList.map((item, i) => (
                                                            <div key={i} className="flex items-center justify-between border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                                                                <span className="text-[11px] font-bold text-slate-700 truncate pr-2">{item.name}</span>
                                                                <span className="text-[10px] font-black text-slate-900 bg-white px-2 py-1 rounded-lg shadow-sm">x{item.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="pt-2">
                                                    <button 
                                                        onClick={() => handleVendorBulkUpdate(vendorGroup.orderIds, vendorGroup.allDispatched)}
                                                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                                            vendorGroup.allDispatched 
                                                            ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600' 
                                                            : 'bg-primary text-white shadow-primary/20 hover:bg-primary-dark'
                                                        }`}
                                                    >
                                                        {vendorGroup.allDispatched ? 'Mark All as Delivered' : 'Dispatch Entire Shipment'}
                                                        <span className="material-symbols-outlined text-sm">
                                                            {vendorGroup.allDispatched ? 'task_alt' : 'local_shipping'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
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
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-black text-slate-400 tracking-widest">Incoming Orders (Pool)</h3>
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] animate-pulse">radar</span>
                                    Live Pool
                                </span>
                            </div>

                            <div className="space-y-4 pb-20">
                                {orders.filter(o => o.status === 'Pending' || o.status === 'Open').length === 0 ? (
                                    <div className="text-center py-10 opacity-40 italic text-xs font-black uppercase tracking-widest">No incoming orders in your region yet.</div>
                                ) : (
                                    orders.filter(o => o.status === 'Pending' || o.status === 'Open').map(order => (
                                        <motion.div 
                                            key={order._id}
                                            variants={itemVariants}
                                            initial="hidden"
                                            animate="visible"
                                            className="bg-white p-6 rounded-[2.5rem] border border-outline-variant/10 flex flex-col gap-5 shadow-sm hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                                                        <span className="material-symbols-outlined">store</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-headline font-black text-on-surface text-sm uppercase tracking-tight">{order.vendor?.displayName || 'Unknown Vendor'}</h4>
                                                        <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-none mt-1">{order.b2bOrderId}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${order.status === 'Locked' ? 'bg-indigo-100 text-indigo-600' : 'bg-primary/10 text-primary'}`}>
                                                    {order.status}
                                                </span>
                                            </div>

                                            {/* Contact & Address Details */}
                                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-3xl">
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contact Vendor</p>
                                                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">call</span>
                                                        {order.vendor?.phone || 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Delivery Region</p>
                                                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">location_on</span>
                                                        {order.vendor?.shopDetails?.city || 'Local'}
                                                    </p>
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shipping Address</p>
                                                    <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic line-clamp-2">
                                                        {order.shippingAddress || 'Address not provided'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-y border-slate-50 py-4">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Order Items Inventory</p>
                                                {order.items.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-[11px] font-bold group">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[9px] text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">x{item.quantity}</span>
                                                            <span className="text-on-surface">{item.name}</span>
                                                        </div>
                                                        <span className="text-on-surface-variant italic">₹{item.price * item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between gap-3 pt-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Aggregate Value</span>
                                                    <span className="text-lg font-black text-on-surface">₹{order.totalAmount}</span>
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleStatusUpdate(order._id, 'Accepted')}
                                                        className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-slate-800 active:scale-95 transition-all"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button 
                                                        onClick={() => handleStatusUpdate(order._id, 'Cancelled')}
                                                        className="px-4 py-2.5 bg-white border border-rose-100 text-rose-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 active:scale-95 transition-all"
                                                    >
                                                        Reject
                                                    </button>
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
                                {orders.filter(o => ['Delivered', 'Settled', 'Cancelled'].includes(o.status)).slice(0, 50).map((order) => {
                                    const totalQty = order.items.reduce((acc, item) => acc + item.quantity, 0);
                                    const isCancelled = order.status === 'Cancelled';
                                    const isSettled = order.status === 'Settled' || order.paymentStatus === 'Paid';
                                    
                                    return (
                                        <div 
                                            key={order._id} 
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowModal(true);
                                            }}
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
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-block ${
                                                    isCancelled ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white'
                                                }`}>
                                                    {isCancelled ? 'Cancelled' : isSettled ? 'Settled' : 'Delivered'}
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
