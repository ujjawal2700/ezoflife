import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VendorHeader from '../components/VendorHeader';
import { orderApi } from '../../../lib/api';
import useNotificationStore from '../../../shared/stores/notificationStore';
import socket from '../../../lib/socket';

const IncomingTimer = ({ duration, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    useEffect(() => {
        if (timeLeft <= 0) {
            onExpire();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    return (
        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest tabular-nums">
            00:{timeLeft.toString().padStart(2, '0')}
        </p>
    );
};

const PoolOrderCard = ({ order, onAccept, acceptingId, onReject }) => {
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (timeLeft <= 0) {
            onReject(order._id);
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const totalArticles = order.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) || 0;
    const approxEarnings = (order.totalAmount * 0.85).toFixed(0); // Assuming 15% commission

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -100 }}
            className="w-[340px] bg-white text-slate-900 rounded-[2.8rem] p-7 space-y-5 border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden shrink-0 group"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
            
            {/* Header: ID & Live Timer */}
            <div className="flex justify-between items-center relative z-10">
                <span className="text-[10px] font-black bg-slate-900 text-white px-3.5 py-2 rounded-xl uppercase tracking-widest shadow-md">
                    {order.orderId}
                </span>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${timeLeft < 10 ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${timeLeft < 10 ? 'bg-rose-500 animate-ping' : 'bg-slate-300'}`}></span>
                    <p className="text-[10px] font-black uppercase tracking-widest tabular-nums">00:{timeLeft.toString().padStart(2, '0')}</p>
                </div>
            </div>

            {/* Customer & Badges */}
            <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xl font-black tracking-tight text-slate-900 truncate flex-1">
                        {order.customer?.displayName || 'Premium User'}
                    </h4>
                    <div className="flex gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${order.tier === 'Heritage' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {order.tier || 'Essential'}
                        </span>
                        {order.deliveryMode === 'Express' && (
                            <span className="px-2.5 py-1 bg-primary text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                ⚡ Express
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                    {order.distance} KM • {order.pickupAddress?.split(',')[0]}
                </p>
            </div>

            {/* Details: Time & Breakdown */}
            <div className="space-y-4 relative z-10">
                <div className="bg-slate-50 p-4 rounded-[1.8rem] border border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">schedule</span>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pickup Slot</p>
                            <p className="text-[11px] font-black text-slate-900 mt-0.5">{order.pickupSlot?.date} | {order.pickupSlot?.time}</p>
                        </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-200/50">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                            Items ({totalArticles})
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {order.items?.map((item, idx) => (
                                <span key={idx} className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[9px] font-black text-slate-700 uppercase">
                                    {item.name} × {item.quantity}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {order.notes && (
                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                        <span className="material-symbols-outlined text-amber-500 text-lg">sticky_note_2</span>
                        <p className="text-[10px] font-bold text-amber-800 leading-relaxed italic">"{order.notes}"</p>
                    </div>
                )}
            </div>

            {/* Earnings & Footer */}
            <div className="pt-2 relative z-10">
                <div className="flex items-center justify-between bg-slate-900 p-5 rounded-[2rem] shadow-xl shadow-slate-900/10">
                    <div>
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Approx Earnings</p>
                        <p className="text-2xl font-black text-white tracking-tighter mt-1.5">₹{approxEarnings}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-none">Order Value</p>
                        <p className="text-xs font-black text-white/40 line-through mt-1.5">₹{order.totalAmount}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-5">
                    <button 
                        onClick={() => onAccept(order._id)}
                        disabled={acceptingId === order._id}
                        className={`flex-[2.5] py-5 rounded-[1.6rem] font-black text-[11px] uppercase tracking-widest shadow-xl transition-all ${
                            acceptingId === order._id ? 'bg-slate-100 text-slate-400' : 'bg-primary text-white hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                    >
                        {acceptingId === order._id ? 'Validating...' : 'Accept Order'}
                    </button>
                    <button 
                        onClick={() => onReject(order._id)}
                        className="flex-1 py-5 rounded-[1.6rem] font-black text-[11px] uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200"
                    >
                        Ignore
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Available');
    const [isOnline, setIsOnline] = useState(true);
    const [allOrders, setAllOrders] = useState([]);
    const [poolOrders, setPoolOrders] = useState([]);
    const [incomingOrder, setIncomingOrder] = useState(null);
    const [ignoredOrders, setIgnoredOrders] = useState(() => {
        const saved = localStorage.getItem('ignored_orders');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState(null);
    const { fetchNotifications } = useNotificationStore();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
    const vendorData = JSON.parse(vendorDataRaw);
    const vendorId = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id;

    const handleIgnoreOrder = (orderId) => {
        const newList = [...ignoredOrders, orderId];
        setIgnoredOrders(newList);
        localStorage.setItem('ignored_orders', JSON.stringify(newList));
        setPoolOrders(prev => prev.filter(o => o._id !== orderId));
    };

    const fetchOrders = async () => {
        try {
            const res = await orderApi.getVendorOrders(vendorId);
            setAllOrders(res);
        } catch (err) {
            console.error('Fetch orders error:', err);
        }
    };

    const fetchPoolOrders = async () => {
        // SECURITY: If vendor is NOT approved, don't show pool orders
        if (vendorData?.status !== 'approved') {
            setPoolOrders([]);
            setLoading(false);
            return;
        }
        try {
            const res = await orderApi.getPoolOrders(vendorId);
            const filtered = res.filter(o => !ignoredOrders.includes(o._id));
            setPoolOrders(filtered);
        } catch (err) {
            console.error('Fetch pool orders error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllData = async () => {
        try {
            await Promise.all([
                fetchOrders(),
                fetchPoolOrders(),
                fetchNotifications(vendorId, 'vendor')
            ]);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    useEffect(() => {
        if (!vendorId) return;

        fetchAllData();
        // Socket will connect automatically

        socket.on('pool_update', (data) => {
            if (data.action === 'removed') {
                setPoolOrders(prev => prev.filter(o => o._id !== data.orderId));
            } else {
                fetchPoolOrders();
            }
        });

        socket.on('new_order_available', (data) => {
            console.log('🔔 [SOCKET] New order broadcast received:', data);
            // SECURITY: Only show to approved vendors
            if (vendorData?.status === 'approved' && !ignoredOrders.includes(data.orderId)) {
                setIncomingOrder(data);
                fetchPoolOrders(); // Refresh list too
            }
        });

        const interval = setInterval(fetchAllData, 1800000); // Polling as fallback (30 minutes)
        
        return () => {
            clearInterval(interval);
            socket.off('pool_update');
            // socket handled by singleton
        };
    }, [vendorId]);

    const categorizedOrders = useMemo(() => {
        return {
            'Available': allOrders.filter(o => o.status === 'Assigned'),
            'In Progress': allOrders.filter(o => ['Picked Up', 'In Progress'].includes(o.status)),
            'Ready': allOrders.filter(o => ['Ready', 'Out for Delivery', 'Delivered'].includes(o.status))
        };
    }, [allOrders]);

    const displayCompletedOrders = useMemo(() => {
        let list = categorizedOrders['Ready'] || [];
        if (startDate && endDate) {
            const start = new Date(startDate).setHours(0,0,0,0);
            const end = new Date(endDate).setHours(23,59,59,999);
            list = list.filter(o => {
                const time = new Date(o.createdAt || o.updatedAt).getTime();
                return time >= start && time <= end;
            });
            list.sort((a,b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt));
        } else {
            list = [...list].sort((a,b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt)).slice(0, 50);
        }
        return list;
    }, [categorizedOrders, startDate, endDate]);

    const dailyEarnings = useMemo(() => {
        const today = new Date().setHours(0, 0, 0, 0);
        return allOrders
            .filter(o => new Date(o.createdAt).getTime() >= today && o.status === 'Delivered')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    }, [allOrders]);

    const dashboardStats = useMemo(() => [
        { 
            label: 'Earnings Today', 
            value: `₹${dailyEarnings.toLocaleString()}`, 
            change: dailyEarnings > 0 ? 'Trending Up' : 'No sales yet', 
            trend: 'up', 
            variant: 'surface' 
        },
        { label: 'Process Queue', value: categorizedOrders['In Progress'].length.toString().padStart(2, '0'), variant: 'primary' }
    ], [categorizedOrders, dailyEarnings]);

    const [selectedOrderForReady, setSelectedOrderForReady] = useState(null);

    const markAsReady = async (order) => {
        try {
            await orderApi.updateOrderStatus(order._id, 'Ready');
            fetchOrders(); // Refresh
            setSelectedOrderForReady(null);
            alert(`Order ${order.orderId} marked as READY. Return rider notified!`);
        } catch (err) {
            alert('Error updating status');
        }
    };

    const startProcessing = async (order) => {
        try {
            await orderApi.updateOrderStatus(order._id, 'In Progress');
            fetchOrders();
        } catch (err) {
            alert('Error starting process');
        }
    };

    const handleVendorAccept = async (orderId) => {
        try {
            setAcceptingId(orderId);
            await orderApi.vendorAcceptOrder(orderId, vendorId);
            fetchAllData(); // Refresh everything
            alert('Order Accepted! Riders notified for pickup.');
        } catch (err) {
            console.error('Accept error:', err);
            alert('Failed to accept order. It might have been taken by another vendor.');
        } finally {
            setAcceptingId(null);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-background text-on-background min-h-screen pb-32 font-body"
        >


            {/* 🚀 PREMIUM INCOMING ORDER REQUEST MODAL */}
            <AnimatePresence>
                {incomingOrder && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, y: 100 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 100 }}
                            className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] relative flex flex-col max-h-[90vh] overflow-hidden"
                        >
                            {/* Animated Background Decor */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-24 -mt-24 animate-pulse pointer-events-none"></div>
                            
                            {/* Scrollable Content Container */}
                            <div className="flex-1 overflow-y-auto p-9 pb-4 hide-scrollbar">
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="space-y-1.5">
                                        <div className="flex gap-2">
                                            <span className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                                                {incomingOrder.displayId || incomingOrder.orderId}
                                            </span>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                                                <IncomingTimer duration={30} onExpire={() => {
                                                    handleIgnoreOrder(incomingOrder.orderId);
                                                    setIncomingOrder(null);
                                                }} />
                                            </div>
                                        </div>
                                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter mt-4 leading-none">New Request</h3>
                                    </div>
                                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                                        <span className="material-symbols-outlined text-3xl">notifications_active</span>
                                    </div>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    {/* Core Details Card */}
                                    <div className="bg-slate-50 p-7 rounded-[2.8rem] border border-slate-100 shadow-sm space-y-5">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer & Pickup</p>
                                                <h4 className="text-xl font-black text-slate-900 mt-1 truncate">{incomingOrder.customerName || 'Rahul Sharma'}</h4>
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-primary">distance</span>
                                                    {incomingOrder.distance} KM • Vijay Nagar, Indore
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-1.5 items-end">
                                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${incomingOrder.tier === 'Heritage' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-200 text-slate-500'}`}>
                                                    {incomingOrder.tier || 'Heritage'}
                                                </span>
                                                {incomingOrder.deliveryMode === 'Express' && (
                                                    <span className="px-3 py-1.5 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                                        ⚡ Express
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Pickup Slot */}
                                        <div className="flex items-center gap-4 py-4 border-y border-slate-200/50">
                                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
                                                <span className="material-symbols-outlined text-[22px]">schedule</span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time Slot</p>
                                                <p className="text-sm font-black text-slate-900 mt-0.5">Today, 5:00 PM - 6:00 PM</p>
                                            </div>
                                        </div>

                                        {/* Articles & Photos */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm">inventory_2</span>
                                                    Articles ({incomingOrder.items?.reduce((a,c) => a + c.quantity, 0) || 6})
                                                </p>
                                                <div className="flex -space-x-2">
                                                    {[1,2,3].map(i => (
                                                        <div key={i} className="w-8 h-8 rounded-lg border-2 border-white bg-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                                                            <span className="material-symbols-outlined text-sm">image</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
                                                {incomingOrder.items?.map((item, idx) => (
                                                    <span key={idx} className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-[11px] font-black text-slate-800 uppercase tracking-tight shadow-sm">
                                                        {item.name} × {item.quantity}
                                                    </span>
                                                ))}
                                                {!incomingOrder.items && ['Shirt × 3', 'Pant × 2', 'Blanket × 1'].map((item, idx) => (
                                                    <span key={idx} className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-[11px] font-black text-slate-800 uppercase tracking-tight shadow-sm">
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Customer Notes */}
                                        {(incomingOrder.notes || true) && (
                                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100/50 flex gap-4">
                                                <span className="material-symbols-outlined text-amber-500 text-2xl">sticky_note_2</span>
                                                <p className="text-[11px] font-bold text-amber-800 leading-relaxed italic">
                                                    "{incomingOrder.notes || "Handle clothes carefully, urgent delivery needed."}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Earnings Section */}
                                    <div className="flex items-center justify-between bg-slate-900 p-7 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.2)] border border-slate-800">
                                        <div>
                                            <p className="text-[11px] font-black text-primary uppercase tracking-widest leading-none">Approx Earnings</p>
                                            <p className="text-4xl font-black text-white tracking-tighter mt-2">₹{(incomingOrder.totalAmount * 0.85 || 420).toFixed(0)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">Order Value</p>
                                            <p className="text-base font-black text-white/40 line-through mt-1">₹{incomingOrder.totalAmount || 499}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer for Actions */}
                            <div className="px-9 pb-9 pt-4 bg-white/80 backdrop-blur-md border-t border-slate-50 relative z-20">
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => {
                                            handleVendorAccept(incomingOrder.orderId);
                                            setIncomingOrder(null);
                                        }}
                                        className="flex-[2.5] py-6 rounded-[2rem] bg-primary text-white font-black text-[13px] uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(61,90,254,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Accept Order
                                    </button>
                                    <button 
                                        onClick={() => {
                                            handleIgnoreOrder(incomingOrder.orderId);
                                            setIncomingOrder(null);
                                        }}
                                        className="flex-1 py-6 rounded-[2rem] bg-slate-100 text-slate-500 font-black text-[13px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal for Mark as Ready */}
            <AnimatePresence>
                {selectedOrderForReady && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl space-y-8"
                        >
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-4">
                                    <span className="material-symbols-outlined text-[24px]">task_alt</span>
                                </div>
                                <h3 className="text-2xl font-black text-on-surface tracking-tighter">Ready for Handover?</h3>
                                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest leading-loose">
                                    Confirming order <span className="text-primary">#{selectedOrderForReady.id}</span> will notify the next available rider for immediate pickup.
                                </p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-xl">{selectedOrderForReady.icon}</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-on-surface">{selectedOrderForReady.title}</h4>
                                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{selectedOrderForReady.desc}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => setSelectedOrderForReady(null)}
                                    className="flex-1 py-4 rounded-full bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => markAsReady(selectedOrderForReady)}
                                    className="flex-[2] py-4 rounded-full bg-primary-gradient text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Confirm & Dispatch
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 🚀 MAIN CONTENT AREA */}
            <main className="max-w-xl mx-auto px-6 pt-6 space-y-8">
                
                {/* 0. EARNINGS TODAY (BLACK & WHITE PREMIUM) */}
                <section>
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -5 }}
                        className="relative group cursor-default"
                    >
                        <div className="relative bg-white text-slate-900 p-9 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden border border-slate-100">
                            {/* Sophisticated Pattern */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">Net Revenue</p>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter mt-1">Today's Earnings</h3>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                                        <span className="material-symbols-outlined text-3xl">payments</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-300 tracking-tight leading-none">₹</span>
                                    <h2 className="text-7xl font-black tracking-tighter leading-none text-slate-900">{dailyEarnings.toLocaleString()}</h2>
                                    
                                    <div className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl border ${dailyEarnings > 0 ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'} transition-all ml-4`}>
                                        <span className="material-symbols-outlined text-sm font-black">{dailyEarnings > 0 ? 'trending_up' : 'info'}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {dailyEarnings > 0 ? 'Active' : 'No Sales'}
                                        </span>
                                    </div>
                                </div>

                                {/* Micro Details */}
                                <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-10">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Your Payout</p>
                                            <p className="text-lg font-black text-slate-900 mt-1">
                                                ₹{(dailyEarnings * 0.85).toFixed(0)}
                                            </p>
                                        </div>
                                        <div className="w-px h-10 bg-slate-100"></div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fees (15%)</p>
                                            <p className="text-lg font-black text-slate-900 mt-1">
                                                ₹{(dailyEarnings * 0.15).toFixed(0)}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/vendor/earnings')}
                                        className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-xl font-black">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* 1. ORDER WORKFLOW TABS (NOW AT THE TOP) */}
                <section className="space-y-6">
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Order Hub</h3>

                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner w-full">
                            {['Available', 'In Progress', 'Completed'].map((tab) => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-3 px-1 rounded-[1.1rem] text-[9px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1.5 ${activeTab === tab ? 'bg-white text-primary shadow-lg scale-[1.02]' : 'text-slate-400'}`}
                                >
                                    <span className="whitespace-nowrap">{tab}</span>
                                    <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[7px] font-black tabular-nums transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
                                        {tab === 'Available' ? poolOrders.length : (tab === 'Completed' ? displayCompletedOrders.length : (categorizedOrders[tab] || []).length)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <AnimatePresence mode="wait">
                                {activeTab === 'Available' ? (
                                    // 1. AVAILABLE TAB: Nearby Orders
                                    poolOrders.length > 0 ? (
                                        poolOrders.map((order) => (
                                            <motion.div 
                                                key={order._id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-6 relative overflow-hidden group"
                                            >
                                                {/* Card Content Header */}
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">{order.orderId}</span>
                                                        <span className="bg-rose-50 text-rose-500 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                                                            Nearby
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.distance || '1.2'} KM AWAY</p>
                                                </div>

                                                <div className="flex gap-5">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 shadow-inner">
                                                        <span className="material-symbols-outlined text-3xl">local_laundry_service</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Area</p>
                                                        <h4 className="text-xl font-black text-slate-900 tracking-tight truncate">{order.customerArea || order.pickupAddress?.split(',')[0] || 'Malviya Nagar'}</h4>
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {order.items?.map((item, idx) => (
                                                                <span key={idx} className="bg-slate-50 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-tight border border-slate-100">{item.name}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 py-5 border-y border-slate-50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-xl">schedule</span></div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pickup Time</p>
                                                            <p className="text-[11px] font-black text-slate-900 mt-0.5">{order.pickupSlot?.time || 'ASAP'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined text-xl">inventory_2</span></div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</p>
                                                            <p className="text-[11px] font-black text-slate-900 mt-0.5">{order.items?.reduce((a,c) => a + c.quantity, 0) || 0} Articles</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-6 pt-2">
                                                    <div>
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Est. Earning</p>
                                                        <p className="text-3xl font-black text-slate-900 tracking-tighter mt-2">₹{(order.totalAmount * 0.85).toFixed(0)}</p>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleVendorAccept(order._id); }}
                                                        disabled={acceptingId === order._id}
                                                        className="flex-1 py-5 rounded-[1.6rem] bg-primary text-white font-black text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-black transition-all active:scale-95"
                                                    >
                                                        {acceptingId === order._id ? 'ACCEPTING...' : 'ACCEPT ORDER'}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="py-24 text-center opacity-30">
                                            <span className="material-symbols-outlined text-6xl mb-4 animate-pulse">radar</span>
                                            <p className="text-[11px] font-black uppercase tracking-[0.2em]">Scanning for nearby orders...</p>
                                        </div>
                                    )
                                ) : (
                                    // 2. IN PROGRESS & COMPLETED TABS
                                    <>
                                        {activeTab === 'Completed' && (
                                            <div className="flex gap-3 mb-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                                                    <input 
                                                        type="date" 
                                                        value={startDate}
                                                        onChange={e => setStartDate(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
                                                    <input 
                                                        type="date" 
                                                        value={endDate}
                                                        onChange={e => setEndDate(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                    />
                                                </div>
                                                {(startDate || endDate) && (
                                                    <div className="flex items-end">
                                                        <button 
                                                            onClick={() => { setStartDate(''); setEndDate(''); }}
                                                            className="h-[42px] px-4 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {(activeTab === 'In Progress' ? (categorizedOrders['In Progress'] || []) : displayCompletedOrders).length > 0 ? (
                                            (activeTab === 'In Progress' ? (categorizedOrders['In Progress'] || []) : displayCompletedOrders).map((order) => (
                                            <motion.div 
                                                key={order._id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-5 cursor-pointer hover:border-primary/20 transition-all group"
                                                onClick={() => navigate(`/vendor/order/${order._id}`)}
                                            >
                                                {/* Header: ID & Status */}
                                                <div className="flex justify-between items-center">
                                                    <span className="bg-slate-100 text-slate-900 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                        {order.orderId}
                                                    </span>
                                                    <span className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                        activeTab === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                        {activeTab === 'Completed' ? 'COMPLETED' : order.status}
                                                    </span>
                                                </div>

                                                {/* Content: Service Info */}
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                                                        activeTab === 'In Progress' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
                                                    }`}>
                                                        <span className="material-symbols-outlined text-2xl">
                                                            {activeTab === 'In Progress' ? 'autofps_select' : 'local_shipping'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-base font-black text-slate-900 truncate">
                                                            {order.items[0]?.name} {order.items.length > 1 ? `+${order.items.length - 1} more` : ''}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {order.items.map((item, idx) => (
                                                                <span key={idx} className="text-[9px] font-bold text-slate-400 uppercase">
                                                                    {item.name} {idx < order.items.length - 1 ? '•' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                                                </div>

                                                {/* Footer: Time & Action */}
                                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                            <span className="material-symbols-outlined text-lg">timer</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Time In Shop</p>
                                                            <p className="text-[11px] font-black text-slate-900 mt-0.5">
                                                                {Math.floor((new Date() - new Date(order.updatedAt)) / (1000 * 60))} Mins
                                                            </p>
                                                        </div>
                                                    </div>
                                                    

                                                    {activeTab === 'Completed' && (
                                                        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">
                                                            <div className="relative">
                                                                <span className="material-symbols-outlined text-emerald-500 text-xl animate-bounce">local_shipping</span>
                                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Rider Alerted</p>
                                                                <p className="text-[8px] font-bold text-emerald-400 uppercase mt-1">Waiting Pickup</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="py-24 text-center opacity-30">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                            </div>
                                            <p className="text-[11px] font-black uppercase tracking-widest">No active orders</p>
                                        </div>
                                    )}
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </section>

            </main>
        </motion.div>
    );
};

export default Dashboard;
