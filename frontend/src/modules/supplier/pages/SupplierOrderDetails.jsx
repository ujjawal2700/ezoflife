import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { b2bOrderApi, UPLOADS_URL } from '../../../lib/api';
import toast from 'react-hot-toast';

const SupplierOrderDetails = () => {
    const navigate = useNavigate();
    const { id: orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [timeLeft, setTimeLeft] = useState('--h --m --s');
    const [isOverdue, setIsOverdue] = useState(false);
    const [targetDateStr, setTargetDateStr] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    const b2bStatusMapSupplier = {
        'SUBMITTED': { label: 'New Order Received', emoji: '📥', color: 'bg-amber-50 text-amber-600 border-amber-200' },
        'ACCEPTED': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'PROCESSING': { label: 'Preparing Order', emoji: '📦', color: 'bg-blue-50 text-blue-600 border-blue-200' },
        'DISPATCHED': { label: 'Shipped / En Route', emoji: '🚚', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        'DELIVERED': { label: 'Fulfilled & Completed', emoji: '🏁', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'REJECTED': { label: 'Order Declined', emoji: '🚫', color: 'bg-rose-50 text-rose-600 border-rose-200' },
        'CANCELLED': { label: 'Cancelled by Buyer', emoji: '💣', color: 'bg-red-50 text-red-600 border-red-200' },
        'SETTLED': { label: 'Fulfilled & Completed', emoji: '🏁', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },

        'Submitted': { label: 'New Order Received', emoji: '📥', color: 'bg-amber-50 text-amber-600 border-amber-200' },
        'Confirmed': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Accepted': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Out for Delivery': { label: 'Shipped / En Route', emoji: '🚚', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        'Delivered': { label: 'Fulfilled & Completed', emoji: '🏁', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Cancelled': { label: 'Cancelled by Buyer', emoji: '💣', color: 'bg-red-50 text-red-600 border-red-200' }
    };

    const formatB2BDate = (dateInput) => {
        if (!dateInput) return 'N/A';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return 'N/A';
        const day = d.getDate();
        const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const formatReceivedDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'short' });
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${day} ${month}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    };

    const getStatusLabel = (status) => b2bStatusMapSupplier[status]?.label || status;
    const getStatusIcon = (status) => b2bStatusMapSupplier[status]?.emoji || '📥';
    const getStatusColor = (status) => b2bStatusMapSupplier[status]?.color || 'bg-slate-500 text-white';

    const getNextStatus = (status) => {
        if (!status) return null;
        const s = status.toUpperCase();
        if (s === 'ACCEPTED' || s === 'CONFIRMED') return 'PROCESSING';
        if (s === 'PROCESSING') return 'DISPATCHED';
        return null;
    };

    const getActionLabel = (status) => {
        if (!status) return '';
        const s = status.toUpperCase();
        if (s === 'ACCEPTED' || s === 'CONFIRMED') return 'Start Preparing';
        if (s === 'PROCESSING') return 'Mark Order Ready';
        if (s === 'DISPATCHED' || s === 'OUT FOR DELIVERY') return 'Mark Delivered';
        return '';
    };

    const fetchOrder = async () => {
        try {
            const data = await b2bOrderApi.getById(orderId);
            setOrder(data);
        } catch (err) {
            console.error('Error fetching order details:', err);
            toast.error('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    useEffect(() => {
        if (!order || !order.deliveryDate) return;
        
        const targetDate = new Date(order.deliveryDate);
        setTargetDateStr(targetDate.toLocaleDateString('en-IN', { 
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }));

        const updateCountdown = () => {
            const now = new Date();
            const diff = targetDate - now;

            if (diff <= 0) {
                setIsOverdue(true);
                const overdueDiff = Math.abs(diff);
                const hours = Math.floor(overdueDiff / (1000 * 60 * 60));
                const minutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((overdueDiff % (1000 * 60)) / 1000);
                setTimeLeft(`+${hours}h ${minutes}m ${seconds}s`);
            } else {
                setIsOverdue(false);
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [order]);

    const orderStages = useMemo(() => {
        if (!order) return [];
        const status = order.status?.toUpperCase();
        
        const stages = [
            { id: 1, label: 'New Order Received', icon: 'schedule', status: 'pending' },
            { id: 2, label: 'Timeline Scheduled', icon: 'handshake', status: 'pending' },
            { id: 3, label: 'Preparing Order', icon: 'inventory_2', status: 'pending' },
            { id: 4, label: 'Shipped / En Route', icon: 'local_shipping', status: 'pending' },
            { id: 5, label: 'Fulfilled & Completed', icon: 'verified', status: 'pending' }
        ];

        const statusOrder = ['SUBMITTED', 'ACCEPTED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'SETTLED'];
        let currentIdx = statusOrder.indexOf(status);
        if (status === 'CONFIRMED') currentIdx = 1;
        if (status === 'OUT FOR DELIVERY') currentIdx = 3;

        if (currentIdx >= 0) stages[0].status = currentIdx === 0 ? 'active' : 'completed';
        if (currentIdx >= 1) stages[1].status = currentIdx === 1 ? 'active' : 'completed';
        if (currentIdx >= 2) stages[2].status = currentIdx === 2 ? 'active' : 'completed';
        if (currentIdx >= 3) stages[3].status = currentIdx === 3 ? 'active' : 'completed';
        if (currentIdx >= 4) {
            stages.forEach(s => s.status = 'completed');
        }
        
        if (status === 'CANCELLED' || status === 'REJECTED') {
            stages.forEach(s => s.status = 'pending');
        }

        return stages;
    }, [order]);

    const handleStatusUpdate = async (newStatus) => {
        try {
            setUpdating(true);
            const user = JSON.parse(localStorage.getItem('supplierData') || localStorage.getItem('userData') || localStorage.getItem('user') || '{}');
            const supplierId = user._id || user.id;
            await b2bOrderApi.updateStatus(order._id, { status: newStatus, supplierId });
            toast.success(`Order marked as ${getStatusLabel(newStatus)}`);
            await fetchOrder();
        } catch (error) {
            console.error('Update Status Error:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const getImageUrl = (item) => {
        const img = item.image || item.photo || (item.photos && item.photos[0]) || item.materialId?.images?.[0] || '';
        if (!img) return '';
        if (typeof img === 'string') {
            if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
            return `${UPLOADS_URL}${img}`;
        }
        if (img.url) return img.url;
        return '';
    };

    const resolveImageUrl = (img) => {
        if (!img) return '';
        if (typeof img === 'string') {
            if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) return img;
            return `${UPLOADS_URL}${img}`;
        }
        if (img.url) return img.url;
        return '';
    };

    if (loading) {
        return (
            <div className="bg-[#F8FAFC] font-body min-h-screen flex flex-col overflow-x-hidden">
                <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-full animate-pulse" />
                        <div>
                            <div className="w-32 h-6 bg-slate-200 rounded mb-1 animate-pulse" />
                            <div className="w-20 h-3 bg-slate-100 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="w-16 h-6 bg-slate-200 rounded-lg animate-pulse" />
                </header>

                <main className="flex-1 flex flex-col px-6 py-6 gap-6 overflow-y-auto pb-40">
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm animate-pulse">
                        <div className="flex justify-between items-start">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-slate-100" />
                                    <div className="w-16 h-2 bg-slate-100 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
                <div>
                    <h2 className="text-xl font-black mb-2">Order Not Found</h2>
                    <button onClick={() => navigate(-1)} className="text-primary font-bold">Go Back</button>
                </div>
            </div>
        );
    }

    const nextStatus = getNextStatus(order.status);
    const actionLabel = getActionLabel(order.status);

    return (
        <div className="bg-transparent font-body text-slate-900 min-h-[100dvh] flex flex-col overflow-x-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl">
                <header className="flex justify-between items-center w-full px-6 py-4">
                    <div className="flex items-center gap-4">
                        <motion.button 
                            whileTap={{ scale: 0.9 }} 
                            onClick={() => navigate(-1)} 
                            className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-slate-900">arrow_back</span>
                        </motion.button>
                        <div>
                            <h1 className="font-headline font-black text-xl tracking-tight text-slate-900 leading-none mb-1">Order Details</h1>
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] font-black bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                            #{order.b2bOrderId}
                        </span>
                    </div>
                </header>

                {/* PROGRESS TIMELINE */}
                <section className="py-5 overflow-x-auto no-scrollbar pl-6">
                    <div className="flex items-start relative min-w-max gap-8 pr-6">
                        <div className="absolute top-5 left-5 right-10 h-0.5 bg-slate-100 -z-0" />
                        
                        {orderStages.map((stage, index) => (
                            <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2 w-16">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                                    stage.status === 'completed' ? 'bg-black text-white shadow-lg shadow-black/10' :
                                    stage.status === 'active' ? 'bg-black text-white shadow-lg shadow-black/20 scale-110' :
                                    'bg-white border-2 border-slate-100 text-slate-300'
                                }`}>
                                    <span className="material-symbols-outlined text-sm">
                                        {stage.status === 'completed' ? 'check' : stage.icon}
                                    </span>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-tight ${
                                    stage.status === 'active' ? 'text-black' : 
                                    stage.status === 'completed' ? 'text-black' : 
                                    'text-slate-400'
                                }`}>
                                    {stage.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* COUNTDOWN TIMER */}
                <div className="px-6 pb-4 pt-4 mt-2 flex flex-col gap-1 border-t border-slate-55">
                    <p className={`text-[8px] font-black uppercase tracking-widest ${isOverdue ? 'text-slate-900' : 'text-slate-400'}`}>Remaining Time</p>
                    
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-lg ${isOverdue ? 'text-slate-900' : 'text-slate-900 animate-pulse'}`}>timer</span>
                            <div className="flex items-center gap-2">
                                {isOverdue && <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest">OVERDUE</span>}
                                <span className="text-xl font-black tracking-tighter text-slate-900">{timeLeft}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-700">
                                {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                            </p>
                            <p className="text-[10px] font-black text-slate-400">{order.deliveryDay || 'Standard Cycle'}</p>
                        </div>
                    </div>
                </div>

                {/* DARK CONCISE ORDER SUMMARY CARD */}
                <div className="px-6 pb-4">
                    <div className="bg-slate-950 text-white rounded-[1.8rem] p-5 shadow-xl relative overflow-hidden group border border-white/5">
                        <div className="absolute right-0 top-0 p-4 opacity-[0.03] pointer-events-none">
                            <span className="material-symbols-outlined text-[60px]">local_shipping</span>
                        </div>
                        
                        <div className="relative z-10 flex flex-col gap-4 text-left">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    {/* Submitted Date */}
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-white/70 text-[20px] shrink-0">schedule</span>
                                        <div className="min-w-0">
                                            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">DATE & TIME RECEIVED</p>
                                            <p className="text-[10px] font-black text-white uppercase truncate">
                                                {formatReceivedDate(order.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Delivery Date */}
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-white/70 text-[20px] shrink-0">calendar_today</span>
                                        <div className="min-w-0">
                                            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">TIME FOR DELIVERY</p>
                                            <p className="text-[10px] font-black text-white uppercase truncate">
                                                {order.deliveryDate ? formatB2BDate(order.deliveryDate) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    {/* Vendor Name */}
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-white/70 text-[20px] shrink-0">store</span>
                                        <div className="min-w-0">
                                            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">VENDOR NAME</p>
                                            <p className="text-[10px] font-black text-white uppercase truncate">
                                                {order.vendor?.displayName || 'UNKNOWN VENDOR'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Vendor Location */}
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-white/70 text-[20px] shrink-0">location_on</span>
                                        <div className="min-w-0">
                                            <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">VENDOR LOCATION</p>
                                            <p className="text-[10px] font-black text-white uppercase truncate">
                                                {order.vendor?.shopDetails?.city || order.city || 'Local'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OTP Display Card for Supplier */}
                {order.status?.toUpperCase() === 'DISPATCHED' && order.deliveryOtp && (
                    <div className="px-6 pb-4">
                        <div className="bg-slate-950 text-white rounded-[1.8rem] p-5 shadow-xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Delivery OTP</h4>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Share this with the vendor to complete delivery</p>
                                </div>
                                <span className="text-xl font-black text-white tracking-widest bg-white/10 px-4 py-1.5 rounded-xl border border-white/10">{order.deliveryOtp}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-6 pb-2 pt-2">
                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Product Detail</h3>
                </div>
            </div>

            <main className="flex-1 flex flex-col px-6 py-4 gap-6 overflow-y-auto pb-32 text-left">
                {/* PRODUCT DETAIL ITEMS */}
                <section className="flex flex-col gap-4">
                    {order.items?.map((item, i) => {
                        const itemImages = item.materialId?.images || [];
                        const description = item.materialId?.description || '';
                        return (
                            <div key={i} className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm space-y-4">
                                <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-wide leading-none">{item.name}</p>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/60 px-2.5 py-1 rounded-md leading-none">QTY: {item.quantity}</span>
                                </div>

                                {/* Images Slider */}
                                {itemImages.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                        {itemImages.map((img, imgIdx) => {
                                            const resolvedUrl = resolveImageUrl(img);
                                            return (
                                                <img
                                                    key={imgIdx}
                                                    src={resolvedUrl}
                                                    alt={`${item.name}-${imgIdx}`}
                                                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 cursor-pointer shadow-sm active:scale-95 transition-transform shrink-0"
                                                    onClick={() => setSelectedImage(resolvedUrl)}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Description */}
                                {description && (
                                    <div className="bg-slate-50/50 rounded-2xl p-3.5 border border-slate-100/50">
                                        <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Description</p>
                                        <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{description}</p>
                                    </div>
                                )}

                                {/* Price breakdown */}
                                <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
                                    <div>
                                        <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Unit Price</p>
                                        <p className="text-[11px] font-black text-slate-800">₹{item.price}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Price</p>
                                        <p className="text-[11px] font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">₹{item.price * item.quantity}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* BOTTOM ACTIONS AREA */}
                {nextStatus && (
                    <section className="flex flex-col items-center gap-4 mt-2">
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStatusUpdate(nextStatus)}
                            disabled={updating}
                            className="bg-black text-white w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] flex items-center justify-center gap-3 shadow-xl shadow-black/20"
                        >
                            {updating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                    Updating...
                                </span>
                            ) : (
                                <>
                                    {actionLabel}
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                </>
                            )}
                        </motion.button>
                    </section>
                )}
            </main>

            {/* Fullscreen Image Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <img 
                        src={selectedImage} 
                        alt="Full view" 
                        className="max-w-full max-h-[90vh] object-contain rounded-2xl" 
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                        className="absolute top-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                        onClick={() => setSelectedImage(null)}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SupplierOrderDetails;
