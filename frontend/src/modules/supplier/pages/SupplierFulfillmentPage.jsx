import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { b2bOrderApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const SupplierFulfillmentPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Processing');
    const [isDownloading, setIsDownloading] = useState(false);
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const stages = useMemo(() => ['Processing', 'Dispatched', 'Delivered'], []);

    useEffect(() => {
        if (!id) { setIsLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const data = await b2bOrderApi.getById(id);
                const o = data?.order || data;
                if (cancelled || !o) return;
                setOrder(o);
                if (o.status) setStatus(o.status);
            } catch (err) {
                console.error('Failed to load fulfillment order:', err);
                if (!cancelled) toast.error('Could not load this batch');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    // The manifest is the order's line items.
    const manifestItems = useMemo(() => {
        const items = order?.items || [];
        return items.map((it, idx) => ({
            id: it.skuId || it.sku || `LINE-${idx + 1}`,
            vendor: order?.vendor?.shopDetails?.name || order?.vendor?.displayName || 'Vendor',
            qty: it.quantity ? `${it.quantity} ${it.unit || ''}`.trim() : '—',
            location: order?.vendor?.shopDetails?.city || order?.deliveryAddress || '—'
        }));
    }, [order]);

    const handleDownload = () => {
        setIsDownloading(true);
        setTimeout(() => {
            setIsDownloading(false);
        }, 2000);
    };

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 10, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }), []);

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32">
            <header className="px-6 pt-16 mb-8 relative bg-white border-b border-outline-variant/10 shadow-sm">
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface mb-8 border border-outline-variant/10"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                </motion.button>
                
                <h1 className="text-3xl font-black tracking-tighter italic uppercase">Order #{id}</h1>
                <p className="text-[10px] font-black text-on-surface/40 uppercase tracking-widest mt-1 opacity-60 italic">Aggregated Batch Fulfillment</p>
            </header>

            <main className="px-6 max-w-md mx-auto space-y-10">
                {/* Fulfillment Pipeline */}
                <section>
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface/40">Current Phase</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none underline underline-offset-4">Stage {stages.indexOf(status) + 1} of 3</p>
                    </div>
                    <div className="flex bg-white/50 p-1 rounded-2xl border border-outline-variant/10 backdrop-blur-sm">
                        {stages.map(s => (
                            <button 
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    status === s ? 'bg-primary shadow-lg text-white' : 'text-on-surface/40 opacity-40 hover:opacity-100 hover:bg-white/50'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Manifest Summary */}
                <section>
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface/40">Batch Manifest</h3>
                        <button 
                            onClick={handleDownload}
                            className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${isDownloading ? 'text-primary' : 'text-on-surface/40 hover:text-on-surface'}`}
                        >
                            <span className={`material-symbols-outlined text-[14px] ${isDownloading ? 'animate-bounce' : ''}`}>download</span>
                            {isDownloading ? 'Generating...' : 'Download PDF'}
                        </button>
                    </div>
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3 bg-white/60 rounded-[2.5rem] p-6 border border-outline-variant/10 backdrop-blur-sm"
                    >
                        {manifestItems.map(item => (
                            <motion.div 
                                key={item.id}
                                variants={itemVariants}
                                className="flex justify-between items-center py-4 border-b border-outline-variant/10 last:border-0"
                            >
                                <div>
                                    <h4 className="font-headline font-black text-on-surface text-sm leading-tight">{item.vendor}</h4>
                                    <p className="text-[10px] text-on-surface/40 font-bold uppercase tracking-widest leading-none mt-2 opacity-60">{item.location}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-on-surface tracking-tight leading-none">{item.qty}</span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </section>

                {/* Action Footer - Elevated above global nav */}
                <div className="fixed bottom-24 left-0 right-0 p-6 z-10 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <motion.button 
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-5.5 bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-2xl shadow-black/20 flex items-center justify-center gap-3 active:scale-95 transition-all border border-white/10"
                        >
                            Notify Logistics Team
                            <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        </motion.button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SupplierFulfillmentPage;
