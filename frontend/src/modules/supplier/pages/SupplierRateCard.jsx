import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { vendorMasterSupplyApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const SupplierRateCard = () => {
    const navigate = useNavigate();

    const [rates, setRates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const ADMIN_FEE = useMemo(() => 1.15, []); // 15% Platform fee

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await vendorMasterSupplyApi.getAll();
                const list = Array.isArray(data) ? data : (data?.supplies || data?.data || []);
                if (cancelled) return;
                setRates(list.map(s => ({
                    id: s._id,
                    name: s.materialName,
                    unit: s.quantity || 'unit',
                    baseRate: Number(s.wholesaleRate) || 0,
                    inStock: s.isActive !== 'n'
                })));
            } catch (err) {
                console.error('Failed to load rate card:', err);
                if (!cancelled) toast.error('Could not load rate card');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleRateChange = (id, newRate) => {
        setRates(prev => prev.map(item => item.id === id ? { ...item, baseRate: parseFloat(newRate) || 0 } : item));
    };

    const toggleStock = (id) => {
        setRates(prev => prev.map(item => item.id === id ? { ...item, inStock: !item.inStock } : item));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            // Persist each edited row. The API updates one supply at a time.
            await Promise.all(rates.map(r =>
                vendorMasterSupplyApi.update(r.id, {
                    wholesaleRate: r.baseRate,
                    isActive: r.inStock ? 'y' : 'n'
                })
            ));
            toast.success('Rate card saved');
        } catch (err) {
            console.error('Failed to save rate card:', err);
            toast.error(err.message || 'Could not save rate card');
        } finally {
            setIsSaving(false);
        }
    };

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }), []);

    return (
        <div className="text-on-surface min-h-screen pb-40">
            <header className="px-6 pt-2 mb-4 z-20 pb-4">
                <h1 className="text-2xl font-black tracking-tighter italic uppercase leading-none">Batch Rate Card</h1>
                <p className="text-[10px] font-black text-on-surface/40 uppercase tracking-widest mt-1 opacity-60">Set Your Base Rates ( $R_b$ )</p>
            </header>

            <main className="px-6 pb-40 max-w-md mx-auto">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    {rates.map(item => (
                        <motion.div 
                            key={item.id}
                            variants={itemVariants}
                            className={`bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] border border-outline-variant/10 transition-all shadow-sm ${!item.inStock ? 'opacity-50 grayscale' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="font-headline font-black text-on-surface text-lg leading-tight">{item.name}</h4>
                                    <p className="text-[10px] text-on-surface/40 font-bold uppercase tracking-widest mt-1">Billed Per {item.unit}</p>
                                </div>
                                <button 
                                    onClick={() => toggleStock(item.id)}
                                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                        item.inStock ? 'bg-primary border-primary text-white' : 'bg-surface-container-high border-outline-variant/10 text-on-surface/40'
                                    }`}
                                >
                                    {item.inStock ? 'In Stock' : 'Out OF Stock'}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-on-surface/40 uppercase tracking-widest ml-1">Supplier Base ( $R_b$ )</p>
                                    <div className="bg-surface-container-low rounded-2xl p-3 border border-slate-300 flex items-center">
                                        <span className="text-on-surface/40 text-xs font-bold mr-2">₹</span>
                                        <input 
                                            type="number"
                                            value={item.baseRate}
                                            onChange={(e) => handleRateChange(item.id, e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-md font-black text-on-surface"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-on-surface/40 uppercase tracking-widest ml-1">Vendor Final Price</p>
                                    <div className="bg-primary/5 rounded-2xl p-3 border border-primary/20 flex items-center">
                                        <span className="text-primary text-xs font-bold mr-2">₹</span>
                                        <span className="text-md font-black text-primary">{(item.baseRate * ADMIN_FEE).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </main>

            {/* Sticky Save Bar - Elevated to sit above global nav */}
            <div className="fixed bottom-24 left-0 right-0 p-6 z-30 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <motion.button 
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-5.5 bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-2xl shadow-black/20 flex items-center justify-center gap-3 active:scale-95 transition-all border border-white/10"
                    >
                        {isSaving ? (
                            <>
                                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                Propagating Rates...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-sm">publish</span>
                                Sync New Rate Table
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default SupplierRateCard;
