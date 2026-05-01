import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { promotionApi } from '../../../lib/api';

const PromotionManagerPage = () => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [promos, setPromos] = useState([]);
    const [editingPromo, setEditingPromo] = useState(null);

    const vendorId = useMemo(() => {
        const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
        const vendorData = JSON.parse(vendorDataRaw);
        const id = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id || localStorage.getItem('vendor_id');
        return id ? String(id) : null;
    }, []);

    const [formData, setFormData] = useState({
        title: '',
        code: '',
        discountType: 'Flat',
        discountValue: 0,
        minOrderValue: 0,
        usageLimit: 100,
        expiryDate: ''
    });

    useEffect(() => {
        if (vendorId) {
            fetchPromos();
        }
    }, [vendorId]);

    const fetchPromos = async () => {
        try {
            setLoading(true);
            const data = await promotionApi.getVendorPromos(vendorId);
            setPromos(data);
        } catch (err) {
            console.error('Fetch promos error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        try {
            if (!formData.title || !formData.code || !formData.discountValue || !formData.expiryDate) {
                alert('Please fill all mandatory fields');
                return;
            }

            const expiryDate = new Date(formData.expiryDate);
            expiryDate.setHours(23, 59, 59, 999);

            const payload = {
                ...formData,
                vendorId,
                expiryDate
            };

            console.log('🚀 Creating Promotion with payload:', payload);

            if (!payload.vendorId) {
                console.error('❌ Vendor ID is missing in promotion payload');
                alert('Session error: Vendor ID not found. Please re-login.');
                return;
            }

            const response = await promotionApi.create(payload);
            console.log('✅ Promotion created successfully:', response);
            setIsCreating(false);
            setFormData({
                title: '',
                code: '',
                discountType: 'Flat',
                discountValue: 0,
                minOrderValue: 0,
                usageLimit: 100,
                expiryDate: ''
            });
            fetchPromos();
        } catch (err) {
            alert('Error saving promotion: ' + err.message);
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await promotionApi.toggleStatus(id);
            fetchPromos();
        } catch (err) {
            console.error('Toggle error:', err);
        }
    };

    const promoStats = useMemo(() => {
        if (!Array.isArray(promos)) return [
            { label: 'Redemptions', value: '0+', icon: 'trending_up', color: 'emerald-400', variant: 'dark' },
            { label: 'Est. Value', value: '₹0k', icon: 'payments', color: 'primary', variant: 'light' }
        ];

        const totalUsage = promos.reduce((sum, p) => sum + (p.currentUsage || 0), 0);
        const totalValue = promos.reduce((sum, p) => {
            if (p.discountType === 'Flat') return sum + (p.discountValue * (p.currentUsage || 0));
            return sum + (p.currentUsage * 50); 
        }, 0);

        return [
            { label: 'Redemptions', value: `${totalUsage}+`, icon: 'trending_up', color: 'emerald-400', variant: 'dark' },
            { label: 'Est. Value', value: `₹${(totalValue / 1000).toFixed(1)}k`, icon: 'payments', color: 'primary', variant: 'light' }
        ];
    }, [promos]);

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-32 flex flex-col overflow-x-hidden font-body">
            <header className="px-6 pt-4 flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface border border-slate-200"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </motion.button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none">Promotions</h1>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] opacity-40 mt-1">Campaign Center</p>
                    </div>
                </div>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setEditingPromo(null); setIsCreating(true); }}
                    className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                </motion.button>
            </header>

            <main className="px-6 space-y-8 flex-1">
                {/* Stats Summary Bento */}
                <section className="grid grid-cols-2 gap-4">
                    {promoStats.map((stat, i) => (
                        <div 
                            key={i} 
                            className={`${stat.variant === 'dark' ? 'bg-slate-900 text-white border border-white/5' : 'bg-white text-on-surface border border-slate-200'} p-6 rounded-[2.5rem] shadow-xl flex flex-col`}
                        >
                            <span className={`material-symbols-outlined text-${stat.color} text-lg mb-2`}>{stat.icon}</span>
                            <p className={`text-2xl font-black tracking-tighter leading-none mb-1 ${stat.variant === 'dark' ? 'text-white' : 'text-primary'}`}>{stat.value}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
                        </div>
                    ))}
                </section>

                {/* Campaign List */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Live Campaigns</h2>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Active Stack ({promos.length})</span>
                    </div>
                    
                    <div className="space-y-4">
                        {loading && (
                            <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest opacity-40 animate-pulse">Synchronizing Data...</div>
                        )}
                        {!loading && promos.length === 0 && (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                    <span className="material-symbols-outlined text-4xl">loyalty</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-slate-400">No Active Campaigns</p>
                            </div>
                        )}
                        {!loading && Array.isArray(promos) && promos.map(promo => (
                            <motion.div
                                key={promo._id}
                                whileHover={{ scale: 1.01 }}
                                className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${promo.status === 'Active' ? 'bg-primary/5 text-primary border border-primary/10' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                                {promo.status}
                                            </div>
                                            <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                {promo.discountType === 'Flat' ? `₹${promo.discountValue} OFF` : `${promo.discountValue}% OFF`}
                                            </div>
                                            {promo.minOrderValue > 0 && (
                                                <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
                                                    MOV: ₹{promo.minOrderValue}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-tight truncate max-w-[200px]">{promo.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-900 px-3 py-1 rounded-xl shadow-lg border border-white/10">
                                                <p className="text-[10px] font-black text-white font-mono tracking-widest uppercase">{promo.code}</p>
                                            </div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">Expires {new Date(promo.expiryDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="w-12 h-12 rounded-full border-2 border-slate-100 flex items-center justify-center relative mb-2">
                                            <span className="text-[9px] font-black text-primary tabular-nums">{Math.round((promo.currentUsage / promo.usageLimit) * 100)}%</span>
                                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                                <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-50" />
                                                <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="132" strokeDashoffset={132 - (132 * (promo.currentUsage || 0) / promo.usageLimit)} className="text-primary transition-all duration-1000" />
                                            </svg>
                                        </div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{promo.currentUsage} / {promo.usageLimit}</p>
                                    </div>
                                </div>

                                {/* Reducer Progress Bar */}
                                <div className="h-1 bg-slate-50 rounded-full overflow-hidden mb-6">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((promo.currentUsage || 0) / promo.usageLimit) * 100}%` }}
                                        className={`h-full ${promo.status === 'Active' ? 'bg-primary' : 'bg-slate-300'}`}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <motion.button 
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleToggleStatus(promo._id)}
                                        className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                            promo.status === 'Active' ? 'bg-slate-50 text-slate-900 border border-slate-200' : 'bg-primary/5 text-primary border border-primary/10'
                                        }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-sm">{promo.status === 'Active' ? 'pause_circle' : 'play_circle'}</span>
                                            {promo.status === 'Active' ? 'Pause Campaign' : 'Resume Campaign'}
                                        </div>
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Modal Logic */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setIsCreating(false); setEditingPromo(null); }}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 40, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-[3rem] p-10 relative z-10 shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto"
                        >
                            <h3 className="text-3xl font-black tracking-tighter leading-none mb-2 text-slate-900">
                                Deploy Coupon
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Campaign Logic Configuration</p>
                            
                            <div className="space-y-5">
                                <div className="space-y-1.5 px-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Internal Title</p>
                                    <input 
                                        type="text" 
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        placeholder="DIWALI DHAMAKA" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all font-body uppercase tracking-tight" 
                                    />
                                </div>
                                <div className="space-y-1.5 px-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Discount Code</p>
                                    <input 
                                        type="text" 
                                        value={formData.code}
                                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                        placeholder="FESTIVE50" 
                                        className="w-full bg-slate-100 border border-slate-200 text-primary rounded-2xl px-5 py-4 text-[11px] font-black font-mono tracking-[0.3em] outline-none placeholder:text-slate-400 focus:bg-white focus:border-primary transition-all uppercase" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1.5 px-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Type</p>
                                        <select 
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all cursor-pointer"
                                        >
                                            <option value="Flat">Flat ₹</option>
                                            <option value="Percentage">Perc %</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Value</p>
                                        <input 
                                            type="number" 
                                            value={formData.discountValue}
                                            onChange={(e) => setFormData({...formData, discountValue: Number(e.target.value)})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all tabular-nums" 
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1.5 px-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Min. Order</p>
                                        <input 
                                            type="number" 
                                            value={formData.minOrderValue}
                                            onChange={(e) => setFormData({...formData, minOrderValue: Number(e.target.value)})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all tabular-nums" 
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Usage Limit</p>
                                        <input 
                                            type="number" 
                                            value={formData.usageLimit}
                                            onChange={(e) => setFormData({...formData, usageLimit: Number(e.target.value)})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all tabular-nums" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 px-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 ml-1">Expiry Date</p>
                                    <input 
                                        type="date" 
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all" 
                                    />
                                </div>

                                <button onClick={handleCreateOrUpdate} className="w-full mt-6 py-5 bg-primary text-on-primary rounded-[1.8rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all">
                                    Activate Campaign
                                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                </button>

                                <button onClick={() => setIsCreating(false)} className="w-full py-4 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-900 transition-colors">
                                    Discard Draft
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PromotionManagerPage;
