import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { orderApi } from '../../../lib/api';

const OrderDetails = () => {
    const navigate = useNavigate();
    const { id: order_Id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isHandshakeModalOpen, setIsHandshakeModalOpen] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '']);
    const [verifying, setVerifying] = useState(false);

    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState('');

    const [timeLeft, setTimeLeft] = useState('--h --m --s');
    const [isOverdue, setIsOverdue] = useState(false);
    const [targetDateStr, setTargetDateStr] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        if (!order) return;
        
        let baseTargetDate;
        if (order.deliveryTriggerTime) {
            baseTargetDate = new Date(order.deliveryTriggerTime);
        } else if (order.deliverySlot?.date) {
            let dateStr = order.deliverySlot.date;
            if (!/\d{4}/.test(dateStr)) {
                dateStr += `, ${new Date().getFullYear()}`;
            }
            baseTargetDate = new Date(dateStr);
            if (order.deliverySlot.time) {
                const timeStr = order.deliverySlot.time.split('-')[0].trim();
                const parts = timeStr.split(' ');
                if (parts.length === 2) {
                    const [time, modifier] = parts;
                    let [hours, minutes] = time.split(':');
                    if (hours === '12') hours = '00';
                    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
                    baseTargetDate.setHours(hours, minutes, 0, 0);
                } else {
                    baseTargetDate.setHours(18, 0, 0, 0);
                }
            } else {
                baseTargetDate.setHours(18, 0, 0, 0); 
            }
        } else {
            baseTargetDate = new Date(new Date(order.createdAt).getTime() + 48 * 60 * 60 * 1000);
        }

        const targetDate = new Date(baseTargetDate.getTime() - 2 * 60 * 60 * 1000);
        
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

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await orderApi.getById(order_Id);
                setOrder(data);
            } catch (err) {
                console.error('Error fetching order details:', err);
            } finally {
                setTimeout(() => {
                    setLoading(false);
                }, 5000);
            }
        };
        fetchOrder();
    }, [order_Id]);

    const orderStages = useMemo(() => {
        if (!order) return [];
        const status = order.status;
        
        const stages = [
            { id: 1, label: 'New Order', icon: 'schedule', status: 'pending' },
            { id: 2, label: 'In Transit', icon: 'local_shipping', status: 'pending' },
            { id: 3, label: 'In Progress', icon: 'local_laundry_service', status: 'pending' },
            { id: 4, label: 'Ready to Ship', icon: 'check_circle', status: 'pending' },
            { id: 5, label: 'Dispatched', icon: 'verified', status: 'pending' }
        ];

        const statusOrder = ['ORDER_PLACED', 'PICKUP_ASSIGNED', 'RIDER_ARRIVING', 'IN_TRANSIT', 'RECEIVED_BY_VENDOR', 'PROCESSING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'];
        const currentIdx = statusOrder.indexOf(status);

        if (currentIdx >= 0) stages[0].status = currentIdx === 0 ? 'active' : 'completed';
        if (currentIdx >= 1) stages[1].status = (currentIdx >= 1 && currentIdx <= 3) ? 'active' : 'completed';
        if (currentIdx >= 4) stages[2].status = (currentIdx >= 4 && currentIdx <= 5) ? 'active' : 'completed';
        if (currentIdx >= 6) stages[3].status = currentIdx === 6 ? 'active' : 'completed';
        if (currentIdx >= 7) stages[4].status = currentIdx === 7 ? 'active' : 'completed';
        if (currentIdx >= 8) stages[4].status = 'completed';
        
        if (status === 'CANCELLED') stages.forEach(s => s.status = 'pending');

        return stages;
    }, [order]);

    const getFriendlyStatus = (status) => {
        if (status === 'ORDER_PLACED') return 'New Order';
        if (['PICKUP_ASSIGNED', 'RIDER_ARRIVING'].includes(status)) return 'Awaiting Pickup';
        if (status === 'IN_TRANSIT') return 'In Transit';
        if (status === 'RECEIVED_BY_VENDOR') return 'Sorting';
        if (status === 'PROCESSING') return 'In Progress';
        if (status === 'READY_FOR_DISPATCH') return 'Ready to Ship';
        if (status === 'OUT_FOR_DELIVERY') return 'Dispatched';
        if (status === 'DELIVERED') return 'Completed';
        return status;
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
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-slate-100" />
                                    <div className="w-16 h-2 bg-slate-100 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
                            <div className="w-16 h-2 bg-slate-100 rounded mb-3" />
                            <div className="w-24 h-4 bg-slate-200 rounded" />
                        </div>
                        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
                            <div className="w-20 h-2 bg-slate-100 rounded mb-3" />
                            <div className="w-24 h-4 bg-slate-200 rounded" />
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between">
                            <div className="w-24 h-3 bg-slate-200 rounded" />
                            <div className="w-16 h-4 bg-slate-200 rounded" />
                        </div>
                        <div className="p-6 space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100" />
                                    <div className="flex-1">
                                        <div className="w-32 h-4 bg-slate-200 rounded mb-2" />
                                        <div className="w-24 h-2 bg-slate-100 rounded" />
                                    </div>
                                    <div className="w-12 h-4 bg-slate-200 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }
    if (!order) return <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center"><div><h2 className="text-xl font-black mb-2">Order Not Found</h2><button onClick={() => navigate(-1)} className="text-primary font-bold">Go Back</button></div></div>;

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 3) document.getElementById(`otp-${index + 1}`).focus();
    };

    const handleVerifyHandshake = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 4) return alert('Please enter 4-digit OTP');
        
        try {
            setVerifying(true);
            if (order.orderType === 'Walk-In' && !order.riderDropOff) {
                await orderApi.verifyDeliveryOtp(order._id, otpString);
            } else {
                await orderApi.verifyHandshake(order._id, 'Reverse', otpString);
            }
            window.location.reload();
        } catch (err) {
            alert(err.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="bg-transparent font-body text-slate-900 min-h-[100dvh] flex flex-col overflow-x-hidden"
        >
            {/* Sticky Header Area with Timeline */}
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
                </header>

                {/* ORDER PROGRESS TIMELINE */}
                <section className="py-5 overflow-x-auto no-scrollbar pl-6">
                    <div className="flex items-start relative min-w-max gap-8 pr-6">
                        {/* Progress Line Background */}
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
                                
                                {/* Connecting line for active/completed */}
                                {index < orderStages.length - 1 && (
                                    <div className={`absolute top-5 left-[50%] w-full h-[3px] -z-10 transition-all duration-1000 ${
                                        stage.status === 'completed' ? 'bg-black' : 'bg-transparent'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* 1. DROPOFF DEADLINE COUNTDOWN */}
                <div className="px-6 pb-4 pt-4 mt-2 flex flex-col gap-1 border-t border-slate-50">
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
                            <p className="text-[10px] font-black text-slate-700">{order?.deliverySlot?.date || 'N/A'}</p>
                            <p className="text-[10px] font-black text-slate-400">{order?.deliverySlot?.time || 'Standard SLA'}</p>
                        </div>
                    </div>
                </div>
                
                <div className="px-6 pb-2 pt-2">
                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Order Summary</h3>
                </div>
            </div>

            <main className="flex-1 flex flex-col px-6 py-4 gap-6 overflow-y-auto pb-32 text-left">
                
                {/* 2. ORDER SUMMARY ITEMS */}
                <section className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4">
                        {order.items?.map((item, i) => (
                            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
                                {/* Row 1 */}
                                <div className="flex justify-between items-center">
                                    <p className="font-black text-slate-900 text-sm uppercase">{item.name}</p>
                                    <p className="font-black text-slate-900 text-sm uppercase">{item.quantity} {item.unit || 'articles'}</p>
                                </div>
                                {/* Row 2 */}
                                <div className="flex justify-between items-center text-xs font-black text-slate-900 uppercase tracking-widest">
                                    <p>{order.deliveryMode || 'Normal'}</p>
                                    <p>{order.careType || item.careType || 'Essential'}</p>
                                </div>
                                {/* Row 3 */}
                                {item.photos && item.photos.length > 0 ? (
                                    <div className={`grid gap-2 ${item.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {item.photos.map((photo, pIdx) => (
                                            <div 
                                                key={pIdx} 
                                                className={`w-full ${item.photos.length === 1 ? 'h-40' : 'h-24'} rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 cursor-pointer`}
                                                onClick={() => setSelectedImage(photo)}
                                            >
                                                <img src={photo} alt={`${item.name} ${pIdx + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-full h-40 rounded-2xl bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100">
                                        <span className="material-symbols-outlined text-slate-300 text-4xl">local_laundry_service</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* PAYMENT */}
                    <div className="flex justify-between items-center pt-2">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Vendor Payout</p>
                        <p className="font-black text-slate-900 text-3xl tracking-tighter">₹{order.totalAmount}</p>
                    </div>
                </section>

                {/* 2.5 DELIVERY BOY DETAIL (Shiprocket Mock) */}
                {order && ['PICKUP_ASSIGNED', 'RIDER_ARRIVING', 'IN_TRANSIT', 'RECEIVED_BY_VENDOR', 'PROCESSING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && (
                    <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-3 border-b border-black/5 pb-4">
                            <span className="material-symbols-outlined text-black text-xl">delivery_dining</span>
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-black">Delivery Boy Details</h3>
                        </div>
                        
                        {/* Mocking the data here */}
                        {(() => {
                            // TODO: Replace with actual Shiprocket API responses later
                            const pickupRider = order.shiprocketPickupRider || null;
                            const deliveryRider = order.shiprocketDeliveryRider || null;
                            const isDeliveryAssigned = ['READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status);
                            
                            return (
                                <div className="flex flex-col gap-6">
                                    {/* Pickup Rider Block */}
                                    <div className="flex flex-col gap-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Pickup from Customer</p>
                                        {pickupRider ? (
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-black border border-black/5">
                                                    <span className="material-symbols-outlined">person</span>
                                                </div>
                                                <div>
                                                    <p className="font-black text-black text-sm">{pickupRider.name}</p>
                                                    <p className="font-bold text-black/60 text-xs mt-0.5">{pickupRider.phone}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-black/5">
                                                <span className="material-symbols-outlined text-black text-lg mt-0.5">info</span>
                                                <p className="text-xs font-bold text-black/80 leading-relaxed">
                                                    Shiprocket has not sent the pickup rider details yet.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Delivery Rider Block */}
                                    <div className="flex flex-col gap-3 pt-6 border-t border-black/5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Delivery to Customer</p>
                                        {!isDeliveryAssigned ? (
                                            <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-black/5 opacity-70">
                                                <span className="material-symbols-outlined text-black text-lg mt-0.5">schedule</span>
                                                <p className="text-xs font-bold text-black/80 leading-relaxed">
                                                    Delivery rider will be assigned once you mark the order as Ready for Dispatch.
                                                </p>
                                            </div>
                                        ) : deliveryRider ? (
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-black border border-black/5">
                                                    <span className="material-symbols-outlined">person</span>
                                                </div>
                                                <div>
                                                    <p className="font-black text-black text-sm">{deliveryRider.name}</p>
                                                    <p className="font-bold text-black/60 text-xs mt-0.5">{deliveryRider.phone}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-black/5">
                                                <span className="material-symbols-outlined text-black text-lg mt-0.5">info</span>
                                                <p className="text-xs font-bold text-black/80 leading-relaxed">
                                                    Shiprocket has not sent the delivery rider details yet.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </section>
                )}

                {/* 3. CUSTOMER DETAIL */}
                <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center gap-3 border-b border-black/5 pb-4">
                        <span className="material-symbols-outlined text-black text-xl">person</span>
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-black">Customer Details</h3>
                    </div>
                    
                    <div className="flex flex-col gap-6">
                        {/* Customer Name & Number */}
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-black border border-black/5">
                                <span className="material-symbols-outlined">badge</span>
                            </div>
                            <div>
                                <h4 className="font-black text-black text-sm">{order.customer?.displayName || 'Customer'}</h4>
                                <p className="font-bold text-black/60 text-xs mt-0.5">{order.customer?.phone}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-5 pt-6 border-t border-black/5">
                            {/* Pickup Address */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-black border border-black/5 flex-shrink-0">
                                    <span className="material-symbols-outlined text-[18px]">home_pin</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Pickup Address</p>
                                    <p className="text-xs font-bold text-black/80 leading-relaxed">
                                        {order.pickupAddress}
                                    </p>
                                </div>
                            </div>

                            {/* Dropoff Address */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-black border border-black/5 flex-shrink-0">
                                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Dropoff Address</p>
                                    <p className="text-xs font-bold text-black/80 leading-relaxed">
                                        {order.dropAddress}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. RIDER LOGISTICS */}
                {order.rider && (
                    <section className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <span className="material-symbols-outlined text-slate-400 text-xl">delivery_dining</span>
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Assigned Rider</h3>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden">
                                    <img src={order.rider.photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rider'} alt="Rider" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900">{order.rider.displayName}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{order.rider.phone}</p>
                                </div>
                            </div>
                            <a href={`tel:${order.rider.phone}`} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined">call</span>
                            </a>
                        </div>
                    </section>
                )}

            </main>

            {/* Fixed Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-slate-100 px-6 pt-4 pb-[100px] flex flex-col items-center">
                {/* Read-Only Statuses */}
                {['PICKUP_ASSIGNED', 'RIDER_ARRIVING'].includes(order.status) && (
                    <div className="bg-slate-900 p-4 rounded-2xl flex items-start gap-3 w-full max-w-xs shadow-lg shadow-slate-900/10">
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5 animate-pulse">info</span>
                        <p className="text-xs font-bold leading-relaxed text-white">
                            Rider is on the way to pick up the clothes from the customer.
                        </p>
                    </div>
                )}
                {order.status === 'OUT_FOR_DELIVERY' && (
                    <div className="bg-emerald-950 p-4 rounded-2xl flex items-start gap-3 w-full max-w-xs shadow-lg shadow-emerald-900/10">
                        <span className="material-symbols-outlined text-emerald-400 text-lg mt-0.5">info</span>
                        <p className="text-xs font-bold leading-relaxed text-emerald-50">
                            Order has been dispatched and handed over to the delivery rider.
                        </p>
                    </div>
                )}

                {/* Actionable Buttons */}
                {['IN_TRANSIT', 'RECEIVED_BY_VENDOR'].includes(order.status) && (
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                            try {
                                await orderApi.updateOrderStatus(order._id, 'PROCESSING');
                                window.location.reload();
                            } catch (err) { alert('Error starting processing'); }
                        }}
                        className="bg-black text-white px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-[0.1em] flex items-center gap-3 shadow-xl shadow-black/20"
                    >
                        Start Processing
                        <span className="material-symbols-outlined text-lg">play_circle</span>
                    </motion.button>
                )}
                {order.status === 'PROCESSING' && (
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                            try {
                                await orderApi.markOrderReady(order._id);
                                window.location.reload();
                            } catch (err) { alert('Error marking as ready'); }
                        }}
                        className="bg-black text-white px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-[0.1em] flex items-center gap-3 shadow-xl shadow-black/20"
                    >
                        Mark Order Ready
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                    </motion.button>
                )}
                {order.status === 'READY_FOR_DISPATCH' && (
                    <div className="w-full max-w-sm flex flex-col items-center">
                        {!isHandshakeModalOpen ? (
                            <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsHandshakeModalOpen(true)}
                                className="bg-black text-white px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-[0.1em] flex items-center gap-3 shadow-xl shadow-black/20"
                            >
                                {order.orderType === 'Walk-In' && !order.riderDropOff ? 'Handover to Customer' : 'Verify & Handover'}
                                <span className="material-symbols-outlined text-lg">
                                    {order.orderType === 'Walk-In' && !order.riderDropOff ? 'handshake' : 'verified_user'}
                                </span>
                            </motion.button>
                        ) : (
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-5 flex flex-col gap-4 shadow-sm">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight text-center">
                                    {order.orderType === 'Walk-In' && !order.riderDropOff ? 'Enter Customer OTP' : 'Enter Rider OTP'}
                                </p>
                                <div className="flex justify-center gap-3">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            value={digit}
                                            autoFocus={index === 0 && !digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            className="w-12 h-16 bg-white border-2 border-slate-100 rounded-xl text-center text-2xl font-black focus:border-slate-900 transition-all outline-none"
                                            maxLength={1}
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-between gap-3 w-full mt-2">
                                    <button 
                                        onClick={() => { setIsHandshakeModalOpen(false); setOtp(['','','','']); }}
                                        className="flex-1 py-4 rounded-full font-black text-[10px] uppercase tracking-widest bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleVerifyHandshake}
                                        disabled={verifying || otp.join('').length < 4}
                                        className={`flex-1 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
                                            verifying || otp.join('').length < 4 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-900/20'
                                        }`}
                                    >
                                        {verifying ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                                Verifying
                                            </span>
                                        ) : 'Complete'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>


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
        </motion.div>
    );
};

export default OrderDetails;
