import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { orderApi } from '../../../lib/api';

const DeliveryVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderId = location.state?.orderId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      orderApi.getById(orderId).then(res => {
        setOrder(res);
        setLoading(false);
      }).catch(err => {
        console.error('Error fetching order:', err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [orderId]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-background text-on-background min-h-[100dvh] flex flex-col font-body"
    >
      <main className="flex-1 pt-28 pb-32 px-6 max-w-5xl mx-auto w-full">
        {/* Editorial Header Section */}
        <motion.section 
          variants={itemVariants}
          className="py-8 ml-2"
        >
          <p className="font-label text-xs uppercase tracking-[0.3em] text-primary font-black mb-2 opacity-60">Order {order?.orderId}</p>
          <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tighter text-on-background leading-none">
            My <span className="text-primary">Articles</span>
          </h2>
          <p className="text-[11px] font-bold text-on-surface-variant opacity-60 mt-4 uppercase tracking-widest leading-relaxed">
            Photos uploaded during order placement
          </p>
        </motion.section>

        {/* Photos Grid */}
        <section className="space-y-6">
          {order?.customerPhotos && order.customerPhotos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {order.customerPhotos.map((url, i) => (
                <motion.div 
                  key={i}
                  variants={itemVariants}
                  className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 group bg-white"
                >
                  <img 
                    alt={`Article ${i + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    src={url} 
                  />
                  <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                    Image {i + 1}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              variants={itemVariants}
              className="py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100"
            >
              <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">no_photography</span>
              <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">No photos were uploaded for this order</p>
            </motion.div>
          )}
        </section>

        {/* Simple Footer Action */}
        <motion.div variants={itemVariants} className="mt-12 flex justify-center">
            <button 
                onClick={() => navigate(-1)}
                className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
            >
                Go Back
            </button>
        </motion.div>
      </main>
    </motion.div>
  );
};

export default DeliveryVerificationPage;

