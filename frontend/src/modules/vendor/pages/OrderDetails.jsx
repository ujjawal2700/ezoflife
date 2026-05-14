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

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await orderApi.getById(order_Id);
                setOrder(data);
            } catch (err) {
                console.error('Error fetching order details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [order_Id]);

    const orderStages = useMemo(() => {
        if (!order) return [];
        const status = order.status;
        return [
            { id: 1, label: 'Pickup', icon: 'photo_camera', status: ['Assigned', 'Picked Up', 'In Progress', 'Ready', 'Out for Delivery', 'Delivered'].includes(status) ? 'completed' : 'pending' },
            { id: 2, label: 'Intake', icon: 'inventory_2', status: ['Picked Up', 'In Progress', 'Ready', 'Out for Delivery', 'Delivered'].includes(status) ? 'completed' : 'pending' },
            { id: 3, label: 'Processing', icon: 'local_laundry_service', status: status === 'In Progress' ? 'active' : ['Ready', 'Out for Delivery', 'Delivered'].includes(status) ? 'completed' : 'pending' },
            { id: 4, label: 'Handover', icon: 'verified_user', status: status === 'Ready' || status === 'Out for Delivery' ? 'active' : ['Delivered'].includes(status) ? 'completed' : 'pending' },
        ];
    }, [order]);

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
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
            await orderApi.verifyHandshake(order._id, 'Reverse', otpString);
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
            className="bg-[#F8FAFC] font-body text-slate-900 min-h-[100dvh] flex flex-col overflow-x-hidden"
        >
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }} 
                        onClick={() => navigate(-1)} 
                        className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined text-primary">arrow_back</span>
                    </motion.button>
                    <div>
                        <h1 className="font-headline font-black text-xl tracking-tight text-slate-900 leading-none mb-1">Order Details</h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Reference #{order.orderId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                        {order.status}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col px-6 py-6 gap-6 overflow-y-auto pb-40 text-left">
                
                {/* 0. ORDER PROGRESS TIMELINE */}
                <section className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start relative">
                        {/* Progress Line Background */}
                        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-100 -z-0" />
                        
                        {orderStages.map((stage, index) => (
                            <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                                    stage.status === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                                    stage.status === 'active' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' :
                                    'bg-white border-2 border-slate-100 text-slate-300'
                                }`}>
                                    <span className="material-symbols-outlined text-sm">
                                        {stage.status === 'completed' ? 'check' : stage.icon}
                                    </span>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                    stage.status === 'active' ? 'text-primary' : 
                                    stage.status === 'completed' ? 'text-emerald-600' : 
                                    'text-slate-400'
                                }`}>
                                    {stage.label}
                                </span>
                                
                                {/* Connecting line for active/completed */}
                                {index < orderStages.length - 1 && (
                                    <div className={`absolute top-5 left-[50%] w-full h-0.5 -z-10 transition-all duration-1000 ${
                                        stage.status === 'completed' ? 'bg-emerald-500' : 'bg-transparent'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* 1. OPERATIONAL DATA ACCESS (CORE METRICS) */}
                <section className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Slot</p>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                            <span className="text-xs font-black text-slate-900">{order.pickupSlot?.time || 'ASAP'}</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Handover Status</p>
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${order.status === 'Out for Delivery' || order.status === 'Delivered' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {order.status === 'Out for Delivery' || order.status === 'Delivered' ? 'verified' : 'pending_actions'}
                            </span>
                            <span className={`text-xs font-black ${order.status === 'Out for Delivery' || order.status === 'Delivered' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {order.status === 'Out for Delivery' || order.status === 'Delivered' ? 'HANDED OVER' : 'PENDING'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* 2. CLOTHES INVENTORY & NOTE */}
                <section className="space-y-4">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clothes Inventory</h3>
                            <div className="bg-primary text-white px-2.5 py-1 rounded-lg text-[10px] font-black">
                                {order.items?.reduce((acc, item) => acc + (item.clothCount || 0), 0)} ARTICLES
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {order.items?.map((item, i) => (
                                <div key={i} className="flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                            <span className="material-symbols-outlined text-xl">local_laundry_service</span>
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-slate-900">{item.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {item.quantity} {item.unit || 'unit'} • {item.clothCount || 0} Clothes
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900 tracking-tight text-sm">₹{item.price}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Valuation</p>
                                <p className="text-2xl font-black text-primary tracking-tighter">₹{order.totalAmount}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. CUSTOMER LOGISTICS */}
                <section className="bg-slate-900 rounded-[2.5rem] p-6 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white">Logistics Details</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-slate-400">
                                <span className="material-symbols-outlined text-xl">person</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white">{order.customer?.displayName || 'Customer'}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{order.customer?.phone}</p>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-slate-400">
                                <span className="material-symbols-outlined text-xl">home</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-300 leading-relaxed line-clamp-2">{order.pickupAddress}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. RIDER LOGISTICS */}
                {order.rider && (
                    <section className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <span className="material-symbols-outlined text-primary text-xl">delivery_dining</span>
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

            {/* Floating Action Button (Above Bottom Nav) */}
            <div className="fixed bottom-24 left-0 right-0 z-[60] px-6">
                <div className="max-w-md mx-auto bg-white/40 backdrop-blur-2xl p-3 rounded-[2.5rem] border border-white/40 shadow-2xl flex items-center gap-3">
                    {order.status === 'Assigned' && (
                        <div className="flex-1 h-16 rounded-[1.8rem] bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 border border-slate-200">
                            Rider Picking Up from Customer
                            <span className="material-symbols-outlined text-lg animate-pulse">delivery_dining</span>
                        </div>
                    )}
                    {order.status === 'Picked Up' && (
                        <motion.button 
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                                try {
                                    await orderApi.updateOrderStatus(order._id, 'In Progress');
                                    window.location.reload();
                                } catch (err) { alert('Error starting processing'); }
                            }}
                            className="flex-1 h-16 rounded-[1.8rem] bg-slate-950 text-white font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl"
                        >
                            Receive & Start Processing
                            <span className="material-symbols-outlined text-lg">play_circle</span>
                        </motion.button>
                    )}
                    {order.status === 'In Progress' && (
                        <motion.button 
                            whileTap={{ scale: 0.98 }}
                            onClick={async () => {
                                try {
                                    await orderApi.markOrderReady(order._id);
                                    window.location.reload();
                                } catch (err) { alert('Error marking as ready'); }
                            }}
                            className="flex-1 h-16 rounded-[1.8rem] bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
                        >
                            Mark as Ready
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                        </motion.button>
                    )}
                    {order.status === 'Ready' && (
                        <motion.button 
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsHandshakeModalOpen(true)}
                            className="flex-1 h-16 rounded-[1.8rem] bg-slate-950 text-white font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl"
                        >
                            Verify Rider & Handover
                            <span className="material-symbols-outlined text-lg">verified_user</span>
                        </motion.button>
                    )}
                    {order.status === 'Out for Delivery' && (
                        <div className="flex-1 h-16 rounded-[1.8rem] bg-emerald-50 text-emerald-600 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 border border-emerald-100">
                            Handed Over to Rider
                            <span className="material-symbols-outlined text-lg">local_shipping</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Handshake Modal */}
            <AnimatePresence>
                {isHandshakeModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setIsHandshakeModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 pb-32 sm:pb-8 relative z-10 shadow-2xl"
                        >
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden" />
                            
                            <div className="text-center space-y-3 mb-10">
                                <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl">
                                    <span className="material-symbols-outlined text-4xl">vpn_key</span>
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Rider Verification</h2>
                                <p className="text-slate-400 text-sm font-bold">Ask Rider for the 4-digit code to securely handover items</p>
                            </div>

                            <div className="flex justify-center gap-4 mb-10">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        className="w-14 h-20 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-3xl font-black focus:border-primary focus:bg-white transition-all outline-none"
                                        maxLength={1}
                                    />
                                ))}
                            </div>

                            <button 
                                onClick={handleVerifyHandshake}
                                disabled={verifying || otp.join('').length < 4}
                                className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-4 ${
                                    verifying || otp.join('').length < 4 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-950 text-white hover:bg-black'
                                }`}
                            >
                                {verifying ? 'Verifying...' : 'Complete Handover'}
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default OrderDetails;
