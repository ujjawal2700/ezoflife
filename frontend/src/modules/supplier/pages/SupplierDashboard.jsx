import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { b2bOrderApi, authApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const SupplierDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Incoming Orders');
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [timeline, setTimeline] = useState([]);
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
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">#{order.b2bOrderId}</h3>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary">
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
                                        <p className="text-[11px] font-bold text-slate-600 leading-tight italic">{order.shippingAddress}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Items</p>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-black text-primary bg-primary/5 w-8 h-8 flex items-center justify-center rounded-lg">x{item.quantity}</span>
                                                <span className="text-[12px] font-bold text-slate-700">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 tracking-tight">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Settled Amount</p>
                                    <p className="text-2xl font-black text-emerald-600 tracking-tighter">₹{order.totalAmount}</p>
                                </div>
                                <div className="bg-emerald-50 px-4 py-2 rounded-2xl">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">verified</span>
                                        Delivered
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
            const [ordersData, timelineData] = await Promise.all([
                b2bOrderApi.getSupplierOrders(supplierId),
                b2bOrderApi.getTimeline()
            ]);
            setOrders(ordersData);
            setTimeline(timelineData);
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

    const formatTimelineDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `In ${diffDays} Days`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

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

            <main className="px-6 space-y-8 flex-1 max-w-xl mx-auto">
                {/* 1. WEEKLY CONSOLIDATION QUEUE */}
                <section className="space-y-4">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-white tracking-tight italic">Weekly Consolidation Queue</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Cycle Aggregation</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                                    <span className="material-symbols-outlined text-white text-xl">rebase_edit</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                                {aggregatedStats.length === 0 ? (
                                    <div className="col-span-2 py-4 opacity-40 text-white text-[10px] font-black uppercase tracking-widest text-center italic">
                                        No items to aggregate yet
                                    </div>
                                ) : (
                                    aggregatedStats.slice(0, 4).map((stat, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{stat.name}</p>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-black text-white tracking-tighter">{stat.quantity.toLocaleString()}</span>
                                                <span className={`text-[10px] font-black uppercase ${idx % 2 === 0 ? 'text-indigo-400' : 'text-emerald-400'}`}>{stat.unit}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button 
                                onClick={handleBulkDeliver}
                                className="w-full mt-10 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-emerald-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                Mark All as Delivered
                                <span className="material-symbols-outlined text-sm">task_alt</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* 1.5 FULFILLMENT TIMELINE (LIVE DATA) */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-slate-400 tracking-widest">Fulfillment Timeline</h3>
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] animate-pulse">alarm</span>
                            Deadlines Active
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {loading ? (
                            <div className="h-40 bg-slate-50 animate-pulse rounded-[2.5rem]"></div>
                        ) : (
                            timeline.map((item) => (
                                <div 
                                    key={item.id}
                                    className={`p-5 rounded-[2.5rem] border flex items-center justify-between group overflow-hidden relative ${
                                        item.variant === 'danger' ? 'bg-rose-50 border-rose-100' : 
                                        item.variant === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm ${
                                            item.variant === 'danger' ? 'text-rose-500' : 
                                            item.variant === 'success' ? 'text-emerald-500' : 'text-indigo-500'
                                        }`}>
                                            <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 tracking-tight">{item.title}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <p className={`text-sm font-black tracking-tight ${
                                            item.variant === 'danger' ? 'text-rose-600' : 
                                            item.variant === 'success' ? 'text-emerald-600' : 'text-indigo-600'
                                        }`}>
                                            {formatTimelineDate(item.date)}
                                        </p>
                                        {item.actionRequired && (
                                            <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mt-1 italic animate-pulse text-right">Action Required</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm transition-all hover:shadow-md">
                        <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mb-2 px-1">Active Orders & Operations</p>
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-black text-on-surface tracking-tighter">
                                {orders.filter(o => o.supplier && o.status !== 'Delivered').length} 
                                <span className="text-sm opacity-40 ml-2 font-black">Your Active Orders</span>
                            </h2>
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-xl">local_shipping</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quick Actions Removed per user request */}

                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-slate-400 tracking-widest">Incoming Orders (Pool)</h3>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] animate-pulse">radar</span>
                            Live Pool
                        </span>
                    </div>

                    <div className="space-y-4">
                        {orders.filter(o => o.status !== 'Delivered').length === 0 ? (
                            <div className="text-center py-10 opacity-40 italic text-xs">No incoming orders in your region yet.</div>
                        ) : (
                            orders.filter(o => o.status !== 'Delivered').map(order => (
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
                                            {(order.status === 'Pending' || order.status === 'Open') && (
                                                <>
                                                    <button 
                                                        onClick={() => handleStatusUpdate(order._id, 'Accepted')}
                                                        className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-slate-800 active:scale-95 transition-all"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setOrders(prev => prev.filter(o => o._id !== order._id));
                                                            toast.error('Order request dismissed');
                                                        }}
                                                        className="px-4 py-2.5 bg-white border border-rose-100 text-rose-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 active:scale-95 transition-all"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {order.status === 'Accepted' && (
                                                <button 
                                                    onClick={() => handleStatusUpdate(order._id, 'Dispatched')}
                                                    className="px-6 py-2.5 bg-primary text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                                                >
                                                    Mark Dispatched
                                                </button>
                                            )}
                                            {order.status === 'Dispatched' && (
                                                <button 
                                                    onClick={() => handleStatusUpdate(order._id, 'Delivered')}
                                                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20"
                                                >
                                                    Mark Delivered
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                {/* 3. HISTORICAL SHIPMENTS LOG */}
                <section className="space-y-6 pb-20">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-slate-400 tracking-widest">Historical Shipments</h3>
                        <span className="material-symbols-outlined text-slate-300 text-sm">history</span>
                    </div>

                    <div className="space-y-3">
                        {orders.filter(o => o.status === 'Delivered').slice(0, 50).map((order) => (
                            <div 
                                key={order._id} 
                                onClick={() => {
                                    setSelectedOrder(order);
                                    setShowModal(true);
                                }}
                                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer active:scale-95"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                                        <span className="material-symbols-outlined text-xl">package_2</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 tracking-tight">Shipment #{order.b2bOrderId}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {new Date(order.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • Bulk Supply
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900 tracking-tight">₹{order.totalAmount}</p>
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">Settled</span>
                                </div>
                            </div>
                        ))}
                        {orders.filter(o => o.status === 'Delivered').length === 0 && (
                            <p className="text-center py-10 opacity-30 text-[11px] font-black uppercase tracking-widest italic">No historical data available</p>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SupplierDashboard;
