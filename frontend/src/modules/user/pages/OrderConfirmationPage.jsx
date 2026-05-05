import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import useNotificationStore from '../../../shared/stores/notificationStore';

const OrderConfirmationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order;
  const bgRef = useRef(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Redirect if no order in state
  useEffect(() => {
    if (!order) {
      navigate('/user/cart');
      return;
    }

    // AUTOMATIC REDIRECT TO TRACKING AFTER 60 SECONDS
    const timer = setTimeout(() => {
        navigate(`/user/tracking/${order._id || order.id}`);
    }, 60000);

    return () => clearTimeout(timer);
  }, [order, navigate]);

  useEffect(() => {
    const blobs = bgRef.current?.querySelectorAll('.blob');
    if (blobs) {
      blobs.forEach((blob) => {
        gsap.to(blob, {
          x: 'random(-30, 30)',
          y: 'random(-30, 30)',
          duration: 'random(6, 12)',
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      });
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
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }), []);

  const serviceSummary = useMemo(() => order?.items || [], [order]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background text-on-background min-h-[100dvh] flex flex-col"
    >
      <main className="flex-grow pt-28 pb-32 px-6 max-w-5xl mx-auto w-full relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div ref={bgRef} className="absolute inset-0 pointer-events-none -z-10">
          <div className="blob absolute top-20 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px]"></div>
          <div className="blob absolute bottom-20 left-0 w-64 h-64 bg-tertiary/5 rounded-full blur-3xl"></div>
        </div>

        {/* Header Section */}
        <motion.header 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="mb-12 flex items-center gap-6"
        >
          <button 
            onClick={() => window.history.back()}
            className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-black shadow-sm transition-all active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <p className="font-label text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-2 opacity-80">Final Review</p>
            <h2 className="font-headline text-4xl md:text-5xl font-black text-on-background tracking-tighter leading-none">
              Review Your<br/><span className="text-primary opacity-90">Fresh Start.</span>
            </h2>
          </div>
        </motion.header>

        {/* Content Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Left Column: Logistics & Summary */}
          <div className="lg:col-span-7 space-y-8">
            {/* Delivery Details Card */}
            <motion.div 
              variants={itemVariants}
              className="bg-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-sm border border-outline-variant/10 group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-9xl">location_on</span>
              </div>
              <h3 className="font-headline text-xl font-black mb-8 text-primary tracking-tight">Pickup & Delivery</h3>
              <div className="flex gap-6 items-start">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-primary shadow-lg shadow-primary/30"></div>
                  <div className="w-[2px] h-20 bg-gradient-to-b from-primary/30 to-tertiary/30"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-tertiary shadow-lg shadow-tertiary/30"></div>
                </div>
                <div className="space-y-10">
                  <div className="group/item cursor-default">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 opacity-60">Pickup Address</p>
                    <p className="text-lg font-black leading-snug text-on-surface">{order?.address || 'Address not found'}</p>
                    <p className="text-primary font-bold text-xs mt-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {order?.pickupSlot?.date}, {order?.pickupSlot?.time}
                    </p>
                  </div>
                  <div className="group/item cursor-default">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 opacity-60">Return Delivery</p>
                    <p className="text-lg font-black leading-snug text-on-surface">Same as Pickup</p>
                    <p className="text-tertiary font-bold text-xs mt-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">local_shipping</span>
                      {order?.deliverySlot?.date}, {order?.deliverySlot?.time}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Service Summary List */}
            <motion.div variants={itemVariants} className="bg-surface-container-low p-8 rounded-[2.5rem] shadow-sm">
              <h3 className="font-headline text-xl font-black mb-8 tracking-tight">Service Summary</h3>
              <div className="space-y-4">
                {serviceSummary.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    className="flex flex-col gap-4 p-5 bg-white rounded-3xl shadow-xs border border-outline-variant/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl bg-primary-container/40 flex items-center justify-center text-primary overflow-hidden`}>
                          {item.image ? (
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_laundry_service</span>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-on-surface text-[15px]">{item.name}</p>
                          <p className="text-xs text-on-surface-variant font-bold opacity-60">{item.quantity} {item.unit || 'pcs'}</p>
                        </div>
                      </div>
                      <p className="font-headline font-black text-primary">₹{(item.finalUnitPrice * item.quantity).toFixed(2)}</p>
                    </div>

                    {item.photos?.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{item.photos.length} Garment Photos</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                          {item.photos.map((photo, pIdx) => (
                            <div key={pIdx} className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                              <img src={photo} className="w-full h-full object-cover" alt="" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Checkout Persistence */}
          <aside className="lg:col-span-5">
            <motion.div 
              variants={itemVariants}
              className="bg-white p-8 md:p-10 rounded-[3rem] sticky top-28 shadow-xl shadow-primary/5 border border-outline-variant/10"
            >
              <h3 className="font-headline text-2xl font-black mb-10 tracking-tighter">Summary</h3>
              
              <div className="space-y-5 mb-10">
                <div className="flex justify-between text-sm md:text-md">
                  <span className="text-on-surface-variant font-bold opacity-60">Total Order Value</span>
                  <span className="font-black text-on-surface">₹{(order?.totalAmount || 0).toFixed(2)}</span>
                </div>
                
                <div className="pt-8 mt-6 border-t border-outline-variant/10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">Payable Now (5%)</p>
                    <p className="text-4xl md:text-5xl font-black text-primary leading-none tracking-tighter">₹{(order?.totalAmount * 0.05).toFixed(2)}</p>
                  </div>
                  <span className="material-symbols-outlined text-primary-container text-5xl mb-1 opacity-50">payments</span>
                </div>
              </div>

              <div className="space-y-6">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="p-5 bg-surface-container-low rounded-3xl flex items-center gap-4 cursor-pointer group"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-2xl">credit_card</span>
                  <div className="flex-grow">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Payment Mode</p>
                    <p className="font-black text-on-surface text-sm">Cash on Pickup / COD</p>
                  </div>
                </motion.div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (order?.orderId || order?._id) {
                      const displayId = order.orderId || order._id;
                      addNotification('order_placed', 'Order Confirmed', `Your laundry request ${displayId} has been successfully queued.`, 'user');
                      addNotification('order_placed', `New Order ${displayId}`, 'A new laundry request is available for pickup.', 'rider');
                    }
                    navigate('/user/success', { state: { order } });

                  }}
                  className="w-full py-6 rounded-2xl bg-primary-gradient text-on-primary font-headline font-black text-xl shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 uppercase tracking-widest"
                >
                  Confirm Order
                  <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                </motion.button>


                <p className="text-center text-[10px] text-on-surface-variant font-bold leading-relaxed opacity-50 px-6">
                  By confirming, you agree to Spinzyt's <span className="underline decoration-primary/30">Terms of Service</span> and professional handling guidelines.
                </p>
              </div>
            </motion.div>

            {/* Map Removed per user request */}
          </aside>
        </motion.div>
      </main>

      {/* Simplified Mobile Footer */}
      <footer className="pb-12 text-center text-on-surface-variant/30 font-black text-[10px] uppercase tracking-widest px-6">
        © 2026 Spinzyt Inc. • Your garments, handled with editorial care.
      </footer>
    </motion.div>
  );
};

export default OrderConfirmationPage;

