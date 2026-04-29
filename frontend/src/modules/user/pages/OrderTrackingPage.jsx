import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { orderApi, logisticsApi } from '../../../lib/api';
import socket from '../../../lib/socket';
import { toast } from 'react-hot-toast';

const OrderTrackingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isHandshakeModalOpen, setIsHandshakeModalOpen] = useState(false);
  const [handshakeOtp, setHandshakeOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const mapRef = useRef(null);

  const fetchOrder = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const data = await orderApi.getById(id);
      if (data) setOrder(data);
    } catch (err) {
      console.error('Error tracking order:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRequestHandshake = async () => {
    try {
        const phase = order.status === 'Assigned' ? 'Collection' : 'Completion';
        toast.loading(`Requesting ${phase} Handshake...`, { id: 'handshake' });
        await logisticsApi.requestHandshake(id, phase);
        toast.success('Rider received OTP on SMS!', { id: 'handshake' });
        setIsHandshakeModalOpen(true);
    } catch (error) {
        toast.error('Failed to request handshake', { id: 'handshake' });
    }
  };

  const handleVerifyHandshake = async () => {
    if (handshakeOtp.length !== 4) return toast.error('Enter 4-digit OTP');
    try {
        setVerifying(true);
        const phase = order.status === 'Assigned' ? 'Collection' : 'Completion';
        const res = await logisticsApi.verifyHandshake(id, phase, handshakeOtp);
        toast.success(res.message);
        setIsHandshakeModalOpen(false);
        setHandshakeOtp('');
        fetchOrder();
    } catch (error) {
        toast.error('Invalid OTP. Please check with Rider.');
    } finally {
        setVerifying(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchOrder();

    // Socket.io Real-time Setup
    // Join a specific room for this order
    socket.emit('join_room', `order_${id}`);

    const handleStatusUpdate = (updatedOrder) => {
      console.log('⚡ Real-time status update received:', updatedOrder.status);
      setOrder(updatedOrder);
    };

    socket.on('order_status_update', handleStatusUpdate);

    return () => {
      socket.off('order_status_update', handleStatusUpdate);
    };
  }, [id]);

  useEffect(() => {
    // Subtle map pan effect on mount
    if (mapRef.current) {
      gsap.fromTo(mapRef.current, 
        { scale: 1.1, x: -20 }, 
        { scale: 1, x: 0, duration: 20, repeat: -1, yoyo: true, ease: "sine.inOut" }
      );
    }
  }, []);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
  }), []);

  const timelineSteps = useMemo(() => {
    const status = order?.status || 'Pending';
    const steps = [
      { label: 'Confirmed', time: 'Received', icon: 'check_circle', status: 'pending', stepNum: 'Step 1 of 5' },
      { label: 'Pickup', time: 'In Route', icon: 'electric_moped', status: 'pending', stepNum: 'Step 2 of 5' },
      { label: 'Processing', time: 'In Shop', icon: 'local_laundry_service', status: 'pending', stepNum: 'Step 3 of 5' },
      { label: 'Ready', time: 'Packing', icon: 'verified_user', status: 'pending', stepNum: 'Step 4 of 5' },
      { label: 'Delivering', time: 'Final Leg', icon: 'handshake', status: 'pending', stepNum: 'Step 5 of 5' }
    ];

    if (['Pending', 'Assigned'].includes(status)) {
      steps[0].status = 'active'; 
    }
    
    if (status === 'Assigned') steps[1].status = 'active';
    if (status === 'Picked Up') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'active';
    }
    if (status === 'In Progress') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'active';
    }
    if (status === 'Ready') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'active';
    }
    if (status === 'Out for Delivery') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'completed';
      steps[4].status = 'active';
    }

    if (status === 'Payment Pending' || status === 'Delivered') {
      steps.forEach(s => s.status = 'completed');
    }

    return steps;
  }, [order]);


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background text-on-background min-h-[100dvh] flex flex-col"
    >
      {/* Header */}
      <header className="fixed top-0 z-50 bg-white/70 backdrop-blur-xl w-full flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/user/home')}
            className="material-symbols-outlined text-on-surface-variant"
          >
            arrow_back
          </motion.button>
          <h1 className="font-headline font-black text-xl text-primary tracking-tighter">Order {order?.orderId || `#${id?.slice(-6) || '......'}`}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchOrder(true)}
            className={`material-symbols-outlined p-2.5 bg-surface-container-low rounded-full text-primary transition-all ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            refresh
          </button>
          <button 
            onClick={() => navigate('/user/notifications')}
            className="material-symbols-outlined p-2.5 bg-surface-container-low rounded-full text-primary"
          >
            notifications
          </button>
          <div className="w-10 h-10 rounded-full bg-primary-container overflow-hidden border-2 border-white shadow-sm">
            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1p7APs6JFSwjyHDasWjzWEXhUFLgeNDv9tSakP3bwMduoW7-t8RPNtifrzxcmh8EfjGiQsfovNBz_iB5f5OS2M24dCfKfqL-sBNd3JyZygtbUox3v3CrFSWlP9VmaGLix217O80RYzeb2b_boPw-VnuXF_nJON0ipIhT9zqDEHZlK_wWiTgoysxNeCyr67hOeQLpN5ArZMYDyqq_l35IqBHW6Y4Ylp1j_EBoNRyBLnB0PJsdJBRbyjppfuJwFaov3DW4laxdkOsg" alt="User" />
          </div>
        </div>
      </header>

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-grow pt-24 pb-36 px-6 max-w-5xl mx-auto w-full space-y-8"
      >
        {/* Map Section */}
        <motion.section 
          variants={itemVariants}
          className="relative w-full h-[380px] md:h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/5 bg-surface-container-high group"
        >
          <div ref={mapRef} className="w-full h-full">
            <img 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDF7e8jeY2LD4d2hKiUogAbVuYWLcVpG7wZrf3GKLK5s3M0QB7kMbs6rcWZ6eeQ9x0wLAL9apbjAXddI6jx0pEbibzP6BtwgSf0UUW-zo8d919_y5iNbXE0e38_GSZ0ScKtAxV-Ctu47Vg2KbYmpABWbgFSD31steTynOyYgwobtwmAczqUD5nCXyb7lFwSO1H0R9s6NJ6c3yH_lJaQUsVkd4nTROLWIku9gmw_LEtB406W2MF5zGxp4C3t9RbCbgpIHv57SLdZXDM" 
              alt="Map" 
            />
          </div>
          
          {/* Rider Overlay Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-6 left-6 right-6 glass-effect p-5 rounded-[2rem] flex items-center justify-between border border-white/40 shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img className="w-14 h-14 rounded-full border-2 border-primary-container object-cover shadow-lg" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrN5YW63I8izRD-Niwm8BJbeJytTIKirCpOi_nLy2ou1CUdHPCydM0EBXMx6X4qMhr33uet0O9nb00EJm_bjZQAUDGLEfRgQxC4S4s8_SeRw41Q_gRimQXYU-zieqyxXBRSEiUvwC4JmXDoYatZT2oJTXrvvxrncJiLkzbW_pPRnOXI6l24gBrSYo2rvw8tGXvnye4L2Jd-Lymp0NLDDWtelTfo6WK2oBe0xXInzcuLBZ4tGnlgy3zrgXstf-H3ThZc5RFMOsuFfs" alt="Rider" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 bg-primary text-on-primary rounded-full p-1 shadow-lg"
                >
                  <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>electric_moped</span>
                </motion.div>
              </div>
              <div>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-black opacity-60">Fleet Partner</p>
                <h3 className="font-black text-md text-on-surface">{order?.rider?.displayName || 'Assigning Rider...'}</h3>
                <div className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="text-xs font-black">4.9 • Nearby Zone</span>
                </div>
              </div>
            </div>
            {/* Action buttons removed as per user request */}
          </motion.div>
        </motion.section>

        {/* Status Timeline */}
        <motion.section variants={itemVariants} className="bg-white rounded-[2.5rem] p-8 border border-outline-variant/10 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-headline font-black text-2xl text-primary tracking-tighter leading-none mb-2">Live Updates</h2>
              <p className="text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-widest">Estimated delivery: 12:45 PM</p>
            </div>
            <button 
              onClick={() => navigate('/user/chat/SZ-8821')}
              className="text-primary font-black text-[10px] uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-primary/10 transition-colors"
            >
              Help
              <span className="material-symbols-outlined text-xs">support_agent</span>
            </button>
          </div>

          {/* Timeline Wrapper */}
          <div className="relative flex justify-between items-start px-2">
            {/* Base Progress Line */}
            <div className="absolute h-[2px] left-10 right-10 bg-surface-container-highest top-6 -translate-y-1/2 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(() => {
                    const completedSteps = timelineSteps.filter(s => s.status === 'completed').length;
                    if (completedSteps === 0) return 0;
                    if (completedSteps === 5) return 100;
                    return (completedSteps / 4) * 100; // 4 gaps for 5 steps
                  })()}%` 
                }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 1.2 }}
                className="h-full bg-primary relative"
              >
                <motion.div 
                   animate={{ x: ['-100%', '100%'] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-0 bg-white/30 skew-x-12"
                />
              </motion.div>
            </div>

            {/* Steps */}
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center gap-4 z-10 w-16">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 * idx, type: "spring" }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors border-2 ${
                    step.status === 'completed' ? 'bg-primary text-on-primary border-primary' : 
                    step.status === 'active' ? 'bg-white text-primary border-primary animate-pulse' : 
                    'bg-surface-container-low text-on-surface-variant border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: step.status !== 'pending' ? "'FILL' 1" : "'FILL' 0" }}>
                    {step.icon}
                  </span>
                </motion.div>
                <div className="text-center">
                  <p className="text-[7px] font-black text-primary uppercase tracking-widest opacity-50 block mb-1">{step.stepNum}</p>
                  <p className={`font-black text-[10px] uppercase tracking-tighter leading-tight ${step.status === 'pending' ? 'text-on-surface-variant opacity-40' : 'text-on-surface'}`}>
                    {step.label}
                  </p>
                  <p className="text-[9px] font-bold text-on-surface-variant opacity-60 mt-0.5">{step.time}</p>
                </div>

              </div>
            ))}
          </div>
        </motion.section>

        {/* Pickup Verification (Phase 1: Customer enters OTP from Rider) */}
        {order?.status === 'Assigned' && (
          <motion.section 
            variants={itemVariants}
            className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 blur-3xl -mr-24 -mt-24"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <span className="material-symbols-outlined text-amber-400 animate-pulse">lock</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Secure Handover</p>
                </div>
                <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Confirm Pickup</h2>
                <p className="text-xs font-bold opacity-60 leading-relaxed max-w-md">
                   The rider has arrived. Please ask them for the 4-digit verification code and enter it here to start the processing.
                </p>
              </div>
              
              <button 
                onClick={handleRequestHandshake}
                className="w-full md:w-auto bg-primary text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all border border-white/10"
              >
                Verify Pickup
              </button>
            </div>
          </motion.section>
        )}

        {/* Delivery Verification (Phase 3: Customer enters OTP from Rider) */}
        {order?.status === 'Out for Delivery' && (
          <motion.section 
            variants={itemVariants}
            className="space-y-6"
          >
            {/* Final Verification Card */}
            <div className="bg-primary rounded-[2.5rem] p-8 text-on-primary relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl -mr-24 -mt-24"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                      <span className="material-symbols-outlined text-amber-300 animate-pulse">verified_user</span>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Final Handshake Protocol</p>
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Confirm Delivery</h2>
                  <p className="text-xs font-bold opacity-80 leading-relaxed max-w-md">
                     Rider is arriving. Please verify your items and enter the 4-digit code provided by the rider.
                  </p>
                </div>
                
                <button 
                    onClick={handleRequestHandshake}
                    className="w-full md:w-auto bg-white text-primary px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all"
                >
                    Verify Delivery
                </button>
              </div>
            </div>

            {/* Verification Photos Card */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-outline-variant/10 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-headline font-black text-xl text-primary tracking-tighter uppercase">Verify Returned Articles</h3>
                    <span className="material-symbols-outlined text-primary">photo_library</span>
                </div>
                <p className="text-xs font-bold text-on-surface-variant opacity-60 leading-relaxed">
                    Compare your items against the original photos taken during pickup.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative group cursor-pointer">
                            <img 
                                src={`https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?q=80&w=200&auto=format&fit=crop&sig=${i}`} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                alt="Pickup Verification"
                            />
                        </div>
                    ))}
                </div>
            </div>
          </motion.section>
        )}

        {/* Info Cards Bento */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between group">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Order Status</span>
              <h3 className="font-headline font-black text-2xl text-primary tracking-tighter mt-2 leading-none uppercase">{order?.status}</h3>
            </div>
            <div className="mt-10 flex gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-on-surface-variant opacity-50 uppercase tracking-widest">Articles</span>
                <span className="font-headline font-black text-xl text-on-surface leading-none mt-1">{order?.items?.length || 0} Items</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-on-surface-variant opacity-50 uppercase tracking-widest">Total</span>
                <span className="font-headline font-black text-xl text-on-surface leading-none mt-1">₹{order?.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-primary p-8 rounded-[2.5rem] text-on-primary flex flex-col justify-between relative overflow-hidden shadow-xl shadow-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Logistics Address</span>
              <h3 className="font-headline font-black text-xl mt-3 leading-tight tracking-tight">{order?.pickupAddress || order?.address || 'Searching location...'}</h3>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-10 relative z-10 cursor-pointer">
              <button className="w-full bg-white text-primary py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-black/10">
                Modify Drop-off
              </button>
            </motion.div>
          </div>
        </motion.section>
      </motion.main>

      {/* Handshake Verification Modal */}
      <AnimatePresence>
        {isHandshakeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !verifying && setIsHandshakeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-primary animate-bounce">lock_open</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">Secure Handover</h3>
              <p className="text-sm font-bold text-slate-500 mb-8">Enter the 4-digit code provided by the rider to verify.</p>
              
              <div className="flex justify-center gap-3 mb-10">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength="1"
                    value={handshakeOtp[i] || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val && !/^\d+$/.test(val)) return;
                        const newOtp = handshakeOtp.split('');
                        newOtp[i] = val;
                        setHandshakeOtp(newOtp.join(''));
                        // Auto focus next
                        if (val && i < 3) {
                            const next = e.target.nextElementSibling;
                            if (next) next.focus();
                        }
                    }}
                    className="w-12 h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl font-black text-slate-900 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleVerifyHandshake}
                  disabled={handshakeOtp.length !== 4 || verifying}
                  className="w-full bg-primary text-on-primary py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {verifying ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Verify & Continue'}
                </button>
                <button 
                   onClick={() => !verifying && setIsHandshakeModalOpen(false)}
                   className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-2"
                >
                    Cancel Handshake
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OrderTrackingPage;

