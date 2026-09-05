import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Package, Clock, Calendar, CheckCircle2, IndianRupee, 
    Truck, AlertCircle, RefreshCw, Store, MapPin, 
    ChevronDown, ChevronRight, FileText, Download, X, 
    ArrowRight, Layers, Radar, Check, AlertTriangle, 
    Sparkles, ShieldCheck, Timer, Filter
} from 'lucide-react';
import VendorHeader from '../components/VendorHeader';
import { orderApi, authApi, vendorPaymentApi } from '../../../lib/api';
import useNotificationStore from '../../../shared/stores/notificationStore';
import socket from '../../../lib/socket';
import { requestForToken } from '../../../lib/firebase';
import toast from 'react-hot-toast';

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
        <span className="text-[11px] font-bold text-rose-600 tabular-nums bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            00:{timeLeft.toString().padStart(2, '0')}
        </span>
    );
};

const PoolOrderCard = ({ order, onAccept, acceptingId }) => {
    const platformFee = order.priceBreakdown?.platformFee || 0;
    const logisticsFee = order.priceBreakdown?.logisticsFee || 0;
    const approxEarnings = (order.totalAmount - platformFee - logisticsFee).toFixed(0);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white text-slate-900 rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
        >
            {/* Top Row: Order ID & Timer & Tiers */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                        {order.orderId?.startsWith('#') ? order.orderId : `#${order.orderId}`}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {order.tier || 'Essential'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {order.deliveryMode || 'Standard'}
                    </span>
                </div>
                <IncomingTimer duration={90} onExpire={() => {}} />
            </div>

            {/* Timings Slot Details */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Pickup Window</span>
                    <p className="font-bold text-slate-800 truncate">
                        {order.pickupSlot?.time || '07:00 AM - 09:00 AM'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                        {order.pickupSlot?.date || 'Today'}
                    </p>
                </div>
                <div className="space-y-0.5 border-l border-slate-200/60 pl-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Target Delivery</span>
                    <p className="font-bold text-slate-800 truncate">
                        {order.deliverySlot?.time || order.pickupSlot?.time || 'Within 48 hrs'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                        {order.deliverySlot?.date || 'Standard'}
                    </p>
                </div>
            </div>

            {/* Articles List */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Requested Articles</span>
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {order.items?.length || 0} items
                    </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {order.items?.map((item, idx) => {
                        const itemImg = (order.customerPhotos && order.customerPhotos[idx]) || 
                                        (order.customerPhotos && order.customerPhotos[0]) || 
                                        (item.photos && item.photos[0]);
                        return (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100/80 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                        {itemImg ? (
                                            <img src={itemImg.url || itemImg} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Layers className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                    <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                                </div>
                                <span className="font-bold text-slate-600 text-[11px] shrink-0">
                                    Qty: {item.quantity || 1}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer: Price & Accept Action */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Estimated Payout</span>
                    <span className="text-xl font-bold text-slate-900">₹{order.totalAmount}</span>
                </div>

                <button 
                    onClick={() => onAccept(order._id)}
                    disabled={acceptingId === order._id}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    {acceptingId === order._id ? (
                        <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Accepting...</span>
                        </>
                    ) : (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Order</span>
                        </>
                    )}
                </button>
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
            // Today
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
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.initialTab || 'Available');
    const [allOrders, setAllOrders] = useState([]);
    const [poolOrders, setPoolOrders] = useState([]);
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
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [selectedOrderForReady, setSelectedOrderForReady] = useState(null);

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
            setAllOrders(res || []);
        } catch (err) {
            console.error('Fetch orders error:', err);
        }
    };

    const fetchPoolOrders = async () => {
        if (vendorData?.status !== 'approved') {
            setPoolOrders([]);
            setLoading(false);
            return;
        }
        try {
            const res = await orderApi.getPoolOrders(vendorId);
            const filtered = (res || []).filter(o => !ignoredOrders.includes(o._id));
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
                vendorPaymentApi.getEarningsSummary(vendorId).catch(() => null),
                vendorPaymentApi.getPayoutHistory(vendorId).catch(() => [])
            ]);
            setAllOrders(ordersRes || []);
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

        const setupNotifications = async () => {
            try {
                const token = await requestForToken();
                if (token) {
                    await authApi.updateFcmToken(vendorId, token);
                }
            } catch (err) {
                console.error('Vendor FCM Registration Error:', err);
            }
        };
        setupNotifications();

        fetchAllData();

        socket.on('connect', () => {
            socket.emit('join_room', 'vendors_pool');
            socket.emit('join_room', `user_${vendorId}`);
        });

        socket.on('pool_update', (data) => {
            if (data.action === 'removed') {
                setPoolOrders(prev => prev.filter(o => o._id !== data.orderId));
            } else {
                fetchPoolOrders();
            }
        });

        socket.on('new_order_available', () => {
            fetchPoolOrders(); 
        });

        const interval = setInterval(fetchAllData, 1800000);
        
        return () => {
            clearInterval(interval);
            socket.off('pool_update');
            socket.off('new_order_available');
        };
    }, [vendorId]);

    const categorizedOrders = useMemo(() => {
        return {
            'Available': [],
            'In Progress': (allOrders || []).filter(o => ['PICKUP_ASSIGNED', 'RIDER_ARRIVING', 'IN_TRANSIT', 'RECEIVED_BY_VENDOR', 'PROCESSING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY'].includes(o.status)),
            'Ready': (allOrders || []).filter(o => ['DELIVERED'].includes(o.status))
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
        return allOrders.filter(o => o.status === 'PICKUP_ASSIGNED' && isUpcomingPickup(o.pickupSlot?.date, o.pickupSlot?.time)).length;
    }, [allOrders]);

    const activeOrdersCount = useMemo(() => {
        return allOrders.filter(o => 
            ['PICKUP_ASSIGNED', 'RIDER_ARRIVING', 'IN_TRANSIT', 'RECEIVED_BY_VENDOR', 'PROCESSING'].includes(o.status) && 
            (isToday(o.updatedAt) || isToday(o.createdAt))
        ).length;
    }, [allOrders]);

    const businessBookedToday = useMemo(() => {
        return allOrders
            .filter(o => (isToday(o.updatedAt) || isToday(o.createdAt)) && o.status !== 'CANCELLED')
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    }, [allOrders]);

    const totalPayoutsReceivedYesterday = useMemo(() => {
        const history = Array.isArray(payoutHistory) ? payoutHistory : [];
        return history
            .filter(p => p && p.status === 'Completed' && isYesterday(p.paidAt || p.createdAt))
            .reduce((sum, p) => sum + (p.amount || 0), 0);
    }, [payoutHistory]);

    const readyForDeliveryCount = useMemo(() => {
        return allOrders.filter(o => o.status === 'READY_FOR_DISPATCH').length;
    }, [allOrders]);

    const markAsReady = async (order) => {
        try {
            await orderApi.updateOrderStatus(order._id, 'READY_FOR_DISPATCH');
            fetchOrders();
            setSelectedOrderForReady(null);
            toast.success(`Order ${order.orderId} marked as Ready for Handover!`);
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const startProcessing = async (order) => {
        try {
            await orderApi.updateOrderStatus(order._id, 'PROCESSING');
            fetchOrders();
            toast.success(`Order ${order.orderId} moved to Processing`);
        } catch (err) {
            toast.error('Failed to start processing');
        }
    };

    const handleVendorAccept = async (orderId) => {
        try {
            setAcceptingId(orderId);
            await orderApi.vendorAcceptOrder(orderId, vendorId);
            toast.success('Order Accepted! Pickup assigned to courier partner.');
            fetchAllData();
        } catch (err) {
            console.error('Accept error:', err);
            toast.error('Failed to accept order. It might have been taken by another vendor.');
        } finally {
            setAcceptingId(null);
        }
    };

    const getFriendlyStatus = (status) => {
        if (status === 'ORDER_PLACED') return 'New Order';
        if (['PICKUP_ASSIGNED', 'RIDER_ARRIVING'].includes(status)) return 'Pickup Scheduled';
        if (status === 'IN_TRANSIT') return 'In Transit';
        if (status === 'RECEIVED_BY_VENDOR') return 'Sorting';
        if (status === 'PROCESSING') return 'In Processing';
        if (status === 'READY_FOR_DISPATCH') return 'Ready to Ship';
        if (status === 'OUT_FOR_DELIVERY') return 'Dispatched';
        if (status === 'DELIVERED') return 'Completed';
        return status;
    };

    return (
        <div className="font-['Poppins',sans-serif] text-slate-900">
            {/* 🚀 MAIN CONTENT AREA */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
                
                {/* 0. DAYS SUMMARY - EXECUTIVE 6-METRIC GRID */}
                <section>
                    <div className="flex items-center justify-between mb-3.5">
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Today's Store Performance</h2>
                            <p className="text-xs text-slate-500 font-normal">Real-time status of orders, payouts, and customer turnarounds</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200/80 shadow-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Live Summary</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* 1. New Request */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">New Requests</span>
                                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Package className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900">{newRequestsCount}</span>
                                {newRequestsCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                        Live
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 2. Upcoming Pickups */}
                        <div className={`bg-white p-4 rounded-2xl border shadow-xs hover:shadow-sm transition-all flex flex-col justify-between ${
                            upcomingPickupsCount > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/80'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">Pickups (6-8h)</span>
                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                                    upcomingPickupsCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    <Clock className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold ${upcomingPickupsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                    {upcomingPickupsCount}
                                </span>
                                {upcomingPickupsCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                        Urgent
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 3. Active Orders */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">Active Orders</span>
                                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Layers className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900">{activeOrdersCount}</span>
                                {activeOrdersCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                        Processing
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 4. Booked Today */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">Booked Today</span>
                                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <IndianRupee className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg sm:text-xl font-bold text-slate-900">₹{businessBookedToday.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* 5. Total Payouts */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">Payouts (Yesterday)</span>
                                <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg sm:text-xl font-bold text-slate-900">₹{totalPayoutsReceivedYesterday.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* 6. Ready for Delivery */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">Ready to Ship</span>
                                <div className="w-7 h-7 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                    <Truck className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900">{readyForDeliveryCount}</span>
                                {readyForDeliveryCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                                        Handover
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 1. ORDER WORKFLOW TABS */}
                <div className="flex justify-center pt-2">
                    <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 w-full max-w-xl shadow-xs">
                        {['Available', 'In Progress', 'Completed'].map((tab) => {
                            const count = tab === 'Available' ? poolOrders.length : (tab === 'Completed' ? displayCompletedOrders.length : (categorizedOrders[tab] || []).length);
                            return (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                        activeTab === tab
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <span>{tab}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                        activeTab === tab 
                                            ? 'bg-slate-900 text-white' 
                                            : 'bg-slate-300 text-slate-700'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. TAB CONTENT PANELS */}
                <div className="min-h-[420px]">
                    <AnimatePresence mode="wait">
                        
                        {/* TAB 1: AVAILABLE (POOL ORDERS) */}
                        {activeTab === 'Available' && (
                            <motion.div
                                key="available-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {poolOrders.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                                    <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center max-w-md mx-auto shadow-xs space-y-3 my-8">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                                            <Radar className="w-6 h-6 animate-pulse" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">Scanning for Nearby Orders</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Looking for customer orders in your service radius. As soon as an order is placed nearby, it will appear here for you to accept.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB 2: IN PROGRESS ORDERS */}
                        {activeTab === 'In Progress' && (
                            <motion.div
                                key="in-progress-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {(categorizedOrders['In Progress'] || []).length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center max-w-md mx-auto shadow-xs space-y-3 my-8">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">No Orders in Progress</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Accept available customer requests from the Available tab to start processing orders.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {(categorizedOrders['In Progress'] || []).map((order) => {
                                            const friendlyStatus = getFriendlyStatus(order.status);
                                            return (
                                                <div 
                                                    key={order._id}
                                                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                                                >
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-slate-900">
                                                                {order.orderId?.startsWith('#') ? order.orderId : `#${order.orderId}`}
                                                            </span>
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                {friendlyStatus}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-400">
                                                            {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    {/* Details info */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs">
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Pickup Details</span>
                                                            <p className="font-bold text-slate-800 truncate">
                                                                {order.pickupSlot?.time || '07:00 AM - 09:00 AM'}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                                {order.pickupAddress || 'Customer Address'}
                                                            </p>
                                                        </div>

                                                        <div className="space-y-1 sm:border-l sm:border-slate-200/60 sm:pl-3">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Target Delivery</span>
                                                            <p className="font-bold text-slate-800">
                                                                {order.deliverySlot?.time || 'Within 48 hrs'}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {order.items?.length || 0} service articles
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Footer & Next Status Actions */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                        <div>
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Amount</span>
                                                            <span className="text-lg font-bold text-slate-900">₹{order.totalAmount || 0}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => navigate(`/vendor/order/${order._id}`)}
                                                                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all cursor-pointer"
                                                            >
                                                                Details
                                                            </button>

                                                            {order.status === 'RECEIVED_BY_VENDOR' && (
                                                                <button 
                                                                    onClick={() => startProcessing(order)}
                                                                    className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition-all shadow-xs cursor-pointer"
                                                                >
                                                                    Start Processing
                                                                </button>
                                                            )}

                                                            {order.status === 'PROCESSING' && (
                                                                <button 
                                                                    onClick={() => setSelectedOrderForReady(order)}
                                                                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    <span>Mark as Ready</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB 3: COMPLETED ORDERS */}
                        {activeTab === 'Completed' && (
                            <motion.div
                                key="completed-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {/* Date Filter Toggle */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-700">Filter Delivery Records</span>
                                        {(startDate || endDate) && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                                        />
                                        <span className="text-xs text-slate-400 font-bold">to</span>
                                        <input 
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
                                        />
                                        {(startDate || endDate) && (
                                            <button 
                                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition-all cursor-pointer"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {displayCompletedOrders.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center max-w-md mx-auto shadow-xs space-y-3 my-8">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">No Completed Records</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Delivered orders within the selected date range will appear here with invoice receipts.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {displayCompletedOrders.map((order) => {
                                            const isExpanded = expandedOrderId === order._id;
                                            return (
                                                <div 
                                                    key={order._id}
                                                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all space-y-3"
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="font-bold text-sm text-slate-900">
                                                                {order.orderId?.startsWith('#') ? order.orderId : `#${order.orderId}`}
                                                            </span>
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Completed
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-normal">
                                                                • Delivered on {new Date(order.updatedAt || order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <span className="text-base font-bold text-slate-900">₹{order.totalAmount || 0}</span>
                                                            <button 
                                                                onClick={() => toast.success('Invoice will be downloaded shortly')}
                                                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                                                                title="Download Invoice"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                                                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                                            >
                                                                <span>Articles ({order.items?.length || 0})</span>
                                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Expanded items */}
                                                    {isExpanded && (
                                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-2 mt-2">
                                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Processed Items</p>
                                                            <div className="divide-y divide-slate-200/60">
                                                                {(order.items || []).map((it, idx) => (
                                                                    <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                                                                        <span className="font-semibold text-slate-800">{it.name}</span>
                                                                        <span className="font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                                                                            Qty: {it.quantity || 1}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>

            {/* Confirmation Modal for Mark as Ready */}
            <AnimatePresence>
                {selectedOrderForReady && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-200 space-y-5"
                        >
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Ready for Courier Handover?</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Confirming order <span className="font-bold text-slate-900">#{selectedOrderForReady.orderId}</span> will update status to Ready for Dispatch and notify the assigned return rider for pickup.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setSelectedOrderForReady(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => markAsReady(selectedOrderForReady)}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
                                >
                                    Confirm & Dispatch
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
