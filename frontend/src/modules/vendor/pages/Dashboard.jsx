import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VendorHeader from '../components/VendorHeader';
import { orderApi, authApi, vendorPaymentApi } from '../../../lib/api';
import useNotificationStore from '../../../shared/stores/notificationStore';
import socket from '../../../lib/socket';
import { requestForToken } from '../../../lib/firebase';

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
    const calculateTimeLeft = () => {
        const created = new Date(order.createdAt).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((created + 60 * 60 * 1000 - now) / 1000);
        return Math.max(0, diff);
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (timeLeft <= 0) {
            onReject(order._id);
            return;
        }
        const timer = setInterval(() => {
            const next = calculateTimeLeft();
            setTimeLeft(next);
            if (next <= 0) {
                clearInterval(timer);
                onReject(order._id);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [order.createdAt]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

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
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${timeLeft < 300 ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${timeLeft < 300 ? 'bg-rose-500 animate-ping' : 'bg-slate-300'}`}></span>
                    <p className="text-[10px] font-black uppercase tracking-widest tabular-nums">{formatTime(timeLeft)}</p>
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

const isToday = (dateInput) => {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
};

const isYesterday = (dateInput) => {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.getDate() === yesterday.getDate() &&
           d.getMonth() === yesterday.getMonth() &&
           d.getFullYear() === yesterday.getFullYear();
};

const parsePickupSlotToDate = (dateStr, timeStr) => {
    try {
        if (!dateStr) return null;
        let dateObj = new Date();
        const upperDateStr = dateStr.toUpperCase();
        if (upperDateStr.includes('TODAY')) {
            // Already today
        } else if (upperDateStr.includes('TOMORROW')) {
            dateObj.setDate(dateObj.getDate() + 1);
        } else {
            const parts = dateStr.split(',');
            const datePart = parts[1] || parts[0];
            const parsed = new Date(datePart);
            if (!isNaN(parsed.getTime())) {
                dateObj = parsed;
                dateObj.setFullYear(new Date().getFullYear());
            }
        }

        if (timeStr) {
            const startTimeStr = timeStr.split('-')[0].trim();
            const match = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (match) {
                let hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const ampm = match[3].toUpperCase();
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                dateObj.setHours(hours, minutes, 0, 0);
            } else {
                dateObj.setHours(12, 0, 0, 0);
            }
        } else {
            dateObj.setHours(12, 0, 0, 0);
        }
        return dateObj;
    } catch (e) {
        console.error('Error parsing pickup slot:', dateStr, timeStr, e);
        return null;
    }
};

const isUpcomingPickup = (dateStr, timeStr) => {
    const pickupDate = parsePickupSlotToDate(dateStr, timeStr);
    if (!pickupDate) return false;
    const now = new Date();
    const diffMs = pickupDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= -1 && diffHours <= 8;
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
    const [summary, setSummary] = useState(null);
    const [payoutHistory, setPayoutHistory] = useState([]);
    const { fetchNotifications } = useNotificationStore();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);

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
            const [ordersRes, summaryRes, payoutsRes] = await Promise.all([
                orderApi.getVendorOrders(vendorId),
                vendorPaymentApi.getEarningsSummary(vendorId),
                vendorPaymentApi.getPayoutHistory(vendorId).catch(err => {
                    console.error('Fetch payouts error:', err);
                    return [];
                })
            ]);
            setAllOrders(ordersRes);
            setSummary(summaryRes);
            setPayoutHistory(Array.isArray(payoutsRes) ? payoutsRes : []);
            await Promise.all([
                fetchPoolOrders(),
                fetchNotifications(vendorId, 'vendor')
            ]);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    useEffect(() => {
        if (!vendorId) return;

        // --- FCM TOKEN REGISTRATION ---
        const setupNotifications = async () => {
            try {
                const token = await requestForToken();
                if (token) {
                    await authApi.updateFcmToken(vendorId, token);
                    console.log('✅ Vendor FCM Token Updated');
                }
            } catch (err) {
                console.error('❌ Vendor FCM Registration Error:', err);
            }
        };
        setupNotifications();

        fetchAllData();
        // Socket will connect automatically

        socket.on('connect', () => {
            console.log('🔌 [SOCKET] Connected to server');
            socket.emit('join_room', 'vendors_pool');
            socket.emit('join_room', `user_${vendorId}`);
        });

        socket.on('pool_update', (data) => {
            console.log('📦 [SOCKET] Pool update received:', data);
            if (data.action === 'removed') {
                setPoolOrders(prev => prev.filter(o => o._id !== data.orderId));
            } else {
                fetchPoolOrders();
            }
        });

        socket.on('new_order_available', (data) => {
            console.log('🔔 [SOCKET] New order received real-time:', data);
            setIncomingOrder(data);
            fetchPoolOrders(); 
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
            'Available': [], // Pool orders are handled separately via poolOrders state
            'In Progress': allOrders.filter(o => ['Assigned', 'Picked Up', 'In Progress'].includes(o.status)),
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

    const newRequestsCount = useMemo(() => {
        return poolOrders.filter(o => isToday(o.createdAt)).length;
    }, [poolOrders]);

    const upcomingPickupsCount = useMemo(() => {
        return allOrders.filter(o => o.status === 'Assigned' && isUpcomingPickup(o.pickupSlot?.date, o.pickupSlot?.time)).length;
    }, [allOrders]);

    const activeOrdersCount = useMemo(() => {
        return allOrders.filter(o => 
            ['Assigned', 'Picked Up', 'In Progress'].includes(o.status) && 
            (isToday(o.updatedAt) || isToday(o.createdAt))
        ).length;
    }, [allOrders]);

    const businessBookedToday = useMemo(() => {
        return allOrders
            .filter(o => (isToday(o.updatedAt) || isToday(o.createdAt)) && o.status !== 'Cancelled')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    }, [allOrders]);

    const totalPayoutsReceivedYesterday = useMemo(() => {
        const history = Array.isArray(payoutHistory) ? payoutHistory : [];
        return history
            .filter(p => p && p.status === 'Completed' && isYesterday(p.paidAt || p.createdAt))
            .reduce((sum, p) => sum + (p.amount || 0), 0);
    }, [payoutHistory]);

    const readyForDeliveryCount = useMemo(() => {
        return allOrders.filter(o => o.status === 'Ready').length;
    }, [allOrders]);

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
            className="text-on-background min-h-screen pb-32 font-body"
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
                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={() => setIncomingOrder(null)}
                                            className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-2xl font-black">close</span>
                                        </button>
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                                            <span className="material-symbols-outlined text-3xl">notifications_active</span>
                                        </div>
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

            <AnimatePresence>
                {selectedOrderForDetails && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-6"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Order Details</h3>
                                <button onClick={() => setSelectedOrderForDetails(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {selectedOrderForDetails.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined">image</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-black text-slate-900 uppercase">{item.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400">Quantity: {item.quantity || 1}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <VendorHeader />
            
            {/* 🚀 MAIN CONTENT AREA */}
            <main className="max-w-xl mx-auto px-6 pt-4 space-y-4 min-h-screen">
                
                {/* 0. DAYS SUMMARY (ULTRA COMPACT) */}
                <section className="max-w-md mx-auto w-full">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group cursor-default"
                    >
                        <div className="relative bg-white text-slate-900 p-4 rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.04)] overflow-hidden border border-slate-100">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Days Summary</p>
                                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined text-lg">analytics</span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-0.5">
                                    {[
                                        { label: 'New Request', value: newRequestsCount, icon: 'notifications_active', color: 'text-rose-500', bg: 'bg-rose-50' },
                                        { label: 'Upcoming Pickups (Next 6-8 hrs.)', value: upcomingPickupsCount, icon: 'schedule', color: 'text-amber-500', bg: 'bg-amber-50' },
                                        { label: 'Active orders', value: activeOrdersCount, icon: 'motion_photos_on', color: 'text-blue-500', bg: 'bg-blue-50' },
                                        { label: 'Business booked today', value: `₹${businessBookedToday.toLocaleString()}`, icon: 'payments', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                        { label: 'Total Payouts received', value: `₹${totalPayoutsReceivedYesterday.toLocaleString()}`, icon: 'account_balance_wallet', color: 'text-slate-900', bg: 'bg-slate-50' },
                                        { label: 'Ready for delivery', value: readyForDeliveryCount, icon: 'local_shipping', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                    ].map((stat, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group/item">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shadow-sm`}>
                                                    <span className="material-symbols-outlined text-[15px]">{stat.icon}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{stat.label}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 tracking-tighter">
                                                {stat.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => navigate('/vendor/earnings')}
                                    className="mt-2 w-full py-2.5 rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center gap-2"
                                >
                                    Report <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* 1. ORDER WORKFLOW TABS */}
                <section className="space-y-2">
                    <div className="flex flex-col gap-2">
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
                                        <div className="flex flex-col gap-6">
                                            {poolOrders.map((order) => (
                                                <PoolOrderCard 
                                                    key={order._id}
                                                    order={order}
                                                    onAccept={handleVendorAccept}
                                                    acceptingId={acceptingId}
                                                    onReject={handleIgnoreOrder}
                                                />
                                            ))}
                                        </div>
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
                                            (activeTab === 'In Progress' ? (categorizedOrders['In Progress'] || []) : displayCompletedOrders).map((order) => {
                                                const getFriendlyStatus = (status) => {
                                                    if (status === 'Assigned') return 'Awaiting Pickup';
                                                    if (status === 'Picked Up') return 'Awaiting Articles';
                                                    if (status === 'In Progress') return 'Work In Progress';
                                                    if (status === 'Ready') return 'Marked as Ready';
                                                    return status;
                                                };

                                                const posessionTime = Math.floor((new Date() - new Date(order.updatedAt)) / (1000 * 60));

                                                return (
                                                    <motion.div 
                                                        key={order._id}
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden group"
                                                    >
                                                        {/* 1) Date & 2) Order ID */}
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                            <span className="bg-slate-900 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                                #{order.orderId}
                                                            </span>
                                                        </div>

                                                        {/* 3) Current Status */}
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full animate-pulse ${
                                                                order.status === 'In Progress' ? 'bg-blue-500' : (order.status === 'Ready' ? 'bg-emerald-500' : 'bg-amber-500')
                                                            }`}></div>
                                                            <h4 className={`text-[11px] font-black uppercase tracking-tight ${
                                                                order.status === 'In Progress' ? 'text-blue-600' : (order.status === 'Ready' ? 'text-emerald-600' : 'text-amber-600')
                                                            }`}>
                                                                {getFriendlyStatus(order.status)}
                                                            </h4>
                                                        </div>

                                                        {/* 4) Article Possession & 5) Details Button */}
                                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="material-symbols-outlined text-[14px] text-slate-400">timer</span>
                                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                                                    Possession: <span className="text-slate-900 font-black">{posessionTime}m</span>
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedOrderForDetails(order);
                                                                    }}
                                                                    className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                                                                >
                                                                    Details
                                                                </button>
                                                                <button 
                                                                    onClick={() => navigate(`/vendor/order/${order._id}`)}
                                                                    className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
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
