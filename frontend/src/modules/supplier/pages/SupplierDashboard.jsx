import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Package, Clock, Calendar, CheckCircle2, IndianRupee, 
    Truck, AlertCircle, RefreshCw, Store, MapPin, 
    ChevronDown, ChevronRight, FileText, Download, X, 
    Edit3, ArrowRight, Layers, Bell, Eye
} from 'lucide-react';
import { b2bOrderApi, authApi } from '../../../lib/api';
import toast from 'react-hot-toast';
import useNotificationStore from '../../../shared/stores/notificationStore';

const SupplierDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('available');
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [dateModalOpen, setDateModalOpen] = useState(false);
    const [selectedOrderForDate, setSelectedOrderForDate] = useState(null);
    const [newDeliveryDate, setNewDeliveryDate] = useState('');
    const [updatingDate, setUpdatingDate] = useState(false);

    const b2bStatusMapSupplier = {
        'SUBMITTED': { label: 'New Order Received', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        'ACCEPTED': { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        'PROCESSING': { label: 'Preparing', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        'DISPATCHED': { label: 'En Route', color: 'bg-purple-50 text-purple-700 border-purple-200' },
        'DELIVERED': { label: 'Fulfilled', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        'REJECTED': { label: 'Declined', color: 'bg-rose-50 text-rose-700 border-rose-200' },
        'CANCELLED': { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' },

        'Submitted': { label: 'New Order Received', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        'Confirmed': { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        'Accepted': { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        'Out for Delivery': { label: 'En Route', color: 'bg-purple-50 text-purple-700 border-purple-200' },
        'Delivered': { label: 'Fulfilled', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        'Cancelled': { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' }
    };

    const getStatusLabel = (status) => b2bStatusMapSupplier[status]?.label || status;
    const getStatusColor = (status) => b2bStatusMapSupplier[status]?.color || 'bg-slate-100 text-slate-700 border-slate-200';

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
            setOrders(ordersData || []);
        } catch (error) {
            console.error('Fetch Data Error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const { fetchNotifications, unreadCount } = useNotificationStore();

    useEffect(() => {
        if (supplierId) {
            fetchOrders();
            fetchNotifications(supplierId, 'supplier');
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

    const handleUpdateDeliveryDate = async () => {
        if (!selectedOrderForDate || !newDeliveryDate) return;
        try {
            setUpdatingDate(true);
            const res = await b2bOrderApi.updateDeliveryDate(selectedOrderForDate._id, newDeliveryDate);
            if (res.error) {
                toast.error(res.message || res.error || 'Failed to update delivery date');
            } else {
                toast.success('Delivery date updated successfully');
                setDateModalOpen(false);
                fetchOrders();
            }
        } catch (error) {
            console.error('Update Delivery Date Error:', error);
            toast.error(error.message || 'Failed to update delivery date');
        } finally {
            setUpdatingDate(false);
        }
    };

    const inProgressOrders = useMemo(() => {
        return orders.filter(o => 
            o.supplier && 
            ['ACCEPTED', 'Accepted', 'Confirmed', 'PROCESSING', 'Processing', 'DISPATCHED', 'Dispatched', 'Out for Delivery'].includes(o.status)
        );
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
            ['SUBMITTED', 'Confirmed', 'Open', 'Pending'].includes(o.status)
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

    const formatB2BDate = (dateInput) => {
        if (!dateInput) return 'N/A';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatReceivedDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const availableOrders = useMemo(() => {
        return orders.filter(o => ['SUBMITTED', 'Confirmed', 'Open', 'Pending'].includes(o.status));
    }, [orders]);

    const completedOrders = useMemo(() => {
        return orders.filter(o => ['Delivered', 'DELIVERED', 'Settled', 'SETTLED', 'Cancelled', 'CANCELLED', 'REJECTED'].includes(o.status));
    }, [orders]);

    return (
        <div className="font-['Poppins',sans-serif] text-slate-900">
            {/* Main Content Body */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
                
                {/* EXECUTIVE METRICS SUMMARY */}
                <section>
                    <div className="flex items-center justify-between mb-3.5">
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Monthly Performance Overview</h2>
                            <p className="text-xs text-slate-500 font-normal">Real-time tracking of order fulfillment, demand, and revenue</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200/80 shadow-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>This Month</span>
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
                                        Pending
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 2. Upcoming Pickups */}
                        <div className={`bg-white p-4 rounded-2xl border shadow-xs hover:shadow-sm transition-all flex flex-col justify-between ${
                            upcomingPickupsCount > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/80'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">Upcoming (2 Days)</span>
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
                                        Action
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
                                        Live
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
                                <span className="text-lg sm:text-xl font-bold text-slate-900">₹{businessBookedToday.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* 5. Total Payouts */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">Payouts Received</span>
                                <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg sm:text-xl font-bold text-slate-900">₹{totalPayoutsReceived.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* 6. Ready for Delivery */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">Ready for Dispatch</span>
                                <div className="w-7 h-7 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                    <Truck className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900">{readyForDeliveryCount}</span>
                                {readyForDeliveryCount > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                                        Ready
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SEGMENTED TAB SWITCHER */}
                <div className="flex justify-center pt-2">
                    <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 w-full max-w-xl shadow-xs">
                        {[
                            { id: 'available', label: 'Available Orders', count: availableOrders.length },
                            { id: 'queue', label: 'In Progress', count: inProgressOrders.length },
                            { id: 'history', label: 'Completed', count: completedOrders.length }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                    activeTab === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                    activeTab === tab.id 
                                        ? 'bg-slate-900 text-white' 
                                        : 'bg-slate-300 text-slate-700'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ORDERS DISPLAY AREA */}
                <div className="min-h-[420px]">
                    <AnimatePresence mode="wait">
                        
                        {/* TAB 1: AVAILABLE ORDERS */}
                        {activeTab === 'available' && (
                            <motion.div
                                key="available-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {availableOrders.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center max-w-md mx-auto shadow-xs space-y-3 my-8">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">No Incoming Orders</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            There are no new order requests in your region right now. You'll receive real-time notifications when vendors place new wholesale requests.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {availableOrders.map((order) => (
                                            <div 
                                                key={order._id}
                                                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                                            >
                                                {/* Header Row */}
                                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-900">#{order.b2bOrderId}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                                                            {getStatusLabel(order.status)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-400">
                                                        {formatReceivedDate(order.createdAt)}
                                                    </span>
                                                </div>

                                                {/* Vendor & Target Info */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span>Vendor Client</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-900 truncate">
                                                            {order.vendor?.displayName || 'Authorized Vendor'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                            {order.shippingAddress || order.vendor?.shopDetails?.address || 'Local Region'}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1 sm:border-l sm:border-slate-200/60 sm:pl-3">
                                                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                                            <span className="flex items-center gap-1.5">
                                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                                Delivery Target
                                                            </span>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedOrderForDate(order);
                                                                    const d = order.deliveryDate ? new Date(order.deliveryDate) : new Date();
                                                                    setNewDeliveryDate(d.toISOString().split('T')[0]);
                                                                    setDateModalOpen(true);
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                                                            >
                                                                <Edit3 className="w-2.5 h-2.5" />
                                                                Edit
                                                            </button>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-900">
                                                            {formatB2BDate(order.deliveryDate)}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {order.items?.length || 0} item types requested
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Items summary */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(order.items || []).slice(0, 3).map((it, idx) => (
                                                        <span key={idx} className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60">
                                                            {it.name} (x{it.quantity})
                                                        </span>
                                                    ))}
                                                    {(order.items?.length || 0) > 3 && (
                                                        <span className="text-[11px] font-medium text-slate-400 self-center">
                                                            +{order.items.length - 3} more
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Footer & Actions */}
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Order Value</span>
                                                        <span className="text-lg font-bold text-slate-900">₹{order.totalAmount || 0}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedOrder(order);
                                                                setShowModal(true);
                                                            }}
                                                            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>Details</span>
                                                        </button>

                                                        <button 
                                                            onClick={() => handleStatusUpdate(order._id, 'ACCEPTED')}
                                                            disabled={updatingOrderId === order._id}
                                                            className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                        >
                                                            {updatingOrderId === order._id ? (
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            )}
                                                            <span>Accept Order</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* TAB 2: IN PROGRESS ORDERS */}
                        {activeTab === 'queue' && (
                            <motion.div
                                key="queue-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {inProgressOrders.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center max-w-md mx-auto shadow-xs space-y-3 my-8">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">No Active Orders</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            You don't have any orders in active processing right now. Accept available orders above to start fulfillment.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {inProgressOrders.map((order) => {
                                            const nextStatus = getNextStatus(order.status);
                                            return (
                                                <div 
                                                    key={order._id}
                                                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                                                >
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-slate-900">#{order.b2bOrderId}</span>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                                                                {getStatusLabel(order.status)}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-400">
                                                            {formatReceivedDate(order.createdAt)}
                                                        </span>
                                                    </div>

                                                    {/* Details Card */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                                                        <div className="space-y-1">
                                                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                                                <Store className="w-3.5 h-3.5 text-slate-400" />
                                                                Vendor
                                                            </span>
                                                            <p className="text-xs font-bold text-slate-900 truncate">
                                                                {order.vendor?.displayName || 'Authorized Vendor'}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                                {order.shippingAddress || order.vendor?.shopDetails?.city || 'Local Delivery'}
                                                            </p>
                                                        </div>

                                                        <div className="space-y-1 sm:border-l sm:border-slate-200/60 sm:pl-3">
                                                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                                Target Delivery
                                                            </span>
                                                            <p className="text-xs font-bold text-slate-900">
                                                                {order.deliveryDate ? formatB2BDate(order.deliveryDate) : 'Standard Timeline'}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {order.items?.length || 0} product lines
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Footer & Status Progression */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                        <div>
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Amount</span>
                                                            <span className="text-lg font-bold text-slate-900">₹{order.totalAmount || 0}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => navigate(`/supplier/order/${order._id}`)}
                                                                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                <span>Full Details</span>
                                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                            </button>

                                                            {nextStatus && (
                                                                <button 
                                                                    onClick={() => handleStatusUpdate(order._id, nextStatus)}
                                                                    disabled={updatingOrderId === order._id}
                                                                    className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                                >
                                                                    {updatingOrderId === order._id ? (
                                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                                    )}
                                                                    <span>Mark {nextStatus}</span>
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
                        {activeTab === 'history' && (
                            <motion.div
                                key="history-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {completedOrders.length === 0 ? (
                                    <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center max-w-md mx-auto shadow-xs space-y-3 my-8">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">No Completed Records</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Your fulfilled B2B supply orders will appear here for record-keeping and invoice downloads.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {completedOrders.slice(0, 50).map((order) => {
                                            const isExpanded = expandedOrderId === order._id;
                                            return (
                                                <div 
                                                    key={order._id}
                                                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all space-y-3"
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="font-bold text-sm text-slate-900">#{order.b2bOrderId}</span>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                                                                {getStatusLabel(order.status)}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-normal">
                                                                • Placed on {formatReceivedDate(order.createdAt)}
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
                                                                <span>Items ({order.items?.length || 0})</span>
                                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Items Drawer */}
                                                    {isExpanded && (
                                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-2 mt-2">
                                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supplied Products</p>
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

            {/* Product Details Modal */}
            <AnimatePresence>
                {showModal && selectedOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-xl border border-slate-200 space-y-5"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Order Items Specification</h3>
                                    <p className="text-xs text-slate-500">Order #{selectedOrder.b2bOrderId}</p>
                                </div>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                                {(selectedOrder.items || []).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">{item.name}</p>
                                            <p className="text-[11px] text-slate-500">Unit rate: ₹{item.price || item.unitPrice || 'N/A'}</p>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold">
                                            Qty: {item.quantity || 1}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div>
                                    <span className="text-xs text-slate-400 font-medium block">Total Value</span>
                                    <span className="text-base font-bold text-slate-900">₹{selectedOrder.totalAmount || 0}</span>
                                </div>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delivery Date Modal */}
            <AnimatePresence>
                {dateModalOpen && selectedOrderForDate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl border border-slate-200 space-y-5"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Reschedule Delivery Date</h3>
                                    <p className="text-xs text-slate-500">Order #{selectedOrderForDate.b2bOrderId}</p>
                                </div>
                                <button 
                                    onClick={() => setDateModalOpen(false)}
                                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Target Delivery Date</label>
                                <input 
                                    type="date"
                                    value={newDeliveryDate}
                                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button 
                                    onClick={() => setDateModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUpdateDeliveryDate}
                                    disabled={updatingDate || !newDeliveryDate}
                                    className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {updatingDate && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SupplierDashboard;
