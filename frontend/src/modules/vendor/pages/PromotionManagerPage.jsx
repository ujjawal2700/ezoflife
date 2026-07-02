import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { promotionApi, serviceApi, authApi, BASE_URL } from '../../../lib/api';

const PromotionManagerPage = () => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [promos, setPromos] = useState([]);
    const [editingPromo, setEditingPromo] = useState(null);
    const [services, setServices] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState('active');

    const filteredPromos = useMemo(() => {
        if (!Array.isArray(promos)) return [];
        return promos.filter(promo => {
            const status = promo.approval_status || 'APPROVED';
            if (activeTab === 'active') {
                return status === 'APPROVED';
            } else {
                return status === 'PENDING' || status === 'REJECTED';
            }
        });
    }, [promos, activeTab]);

    const vendorId = useMemo(() => {
        const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
        const vendorData = JSON.parse(vendorDataRaw);
        const id = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id || localStorage.getItem('vendor_id');
        return id ? String(id) : null;
    }, []);

    const [formData, setFormData] = useState({
        title: '',
        code: '',
        discountType: 'Percentage',
        discountValue: 0,
        minOrderValue: 0,
        usageLimit: 100,
        expiryDate: '',
        start_date: new Date().toISOString().split('T')[0],
        scope_type: 'GLOBAL_ORDER',
        selected_services: [],
        is_exclusive_window_eligible: true
    });

    useEffect(() => {
        if (vendorId) {
            fetchPromos();
            fetchServices();
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

    const fetchServices = async () => {
        try {
            const data = await serviceApi.getAll({ vendorId });
            setServices(data || []);
        } catch (e) {
            console.error('Fetch services error:', e);
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

            // Fetch vendor geofence dynamically
            let geofence_id = null;
            try {
                const profileRes = await authApi.getProfile(vendorId);
                const lat = profileRes?.location?.lat;
                const lng = profileRes?.location?.lng;
                if (lat && lng && lat !== 0 && lng !== 0) {
                    const geoRes = await fetch(`${BASE_URL}/geofence/check-availability?lat=${lat}&lng=${lng}`);
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        if (geoData.available && geoData.areaId) {
                            geofence_id = geoData.areaId;
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching geofence for promotion:', err);
            }

            const payload = {
                ...formData,
                title: formData.code,
                vendorId,
                expiryDate,
                geofence_id,
                discount_type: formData.discountType === 'Flat' ? 'FLAT_AMOUNT' : 'PERCENTAGE',
                discount_value: Number(formData.discountValue),
                min_order_value: Number(formData.minOrderValue),
                scope_type: formData.scope_type,
                selected_services: formData.scope_type === 'SELECTED_SERVICES' ? formData.selected_services : [],
                is_exclusive_window_eligible: formData.is_exclusive_window_eligible
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
                discountType: 'Percentage',
                discountValue: 0,
                minOrderValue: 0,
                usageLimit: 100,
                expiryDate: '',
                start_date: new Date().toISOString().split('T')[0],
                scope_type: 'GLOBAL_ORDER',
                selected_services: [],
                is_exclusive_window_eligible: true
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

    return (
        <div className="bg-transparent text-on-surface min-h-[100dvh] pb-32 flex flex-col overflow-x-hidden font-body">
            <header className="flex items-center justify-between px-6 pt-4 mb-6">
                <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 shadow-sm transition-all">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </button>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { setEditingPromo(null); setIsCreating(true); }}
                        className="px-4 py-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-center min-w-[80px] shadow-md shadow-slate-900/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        Create
                    </button>
                    <button 
                        onClick={() => setEditMode(!editMode)}
                        className="px-4 py-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-center min-w-[80px] shadow-md shadow-slate-900/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        {editMode ? 'Done' : 'Edit'}
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-100 pb-0.5 mt-2 px-6">
                <button
                    onClick={() => {
                        setActiveTab('active');
                        setEditMode(false);
                    }}
                    className={`text-xs font-black uppercase tracking-widest pb-3 px-1 relative transition-colors ${
                        activeTab === 'active' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-800'
                    }`}
                >
                    Active Promotion
                    {activeTab === 'active' && (
                        <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                    )}
                </button>
                <button
                    onClick={() => {
                        setActiveTab('pending');
                        setEditMode(false);
                    }}
                    className={`text-xs font-black uppercase tracking-widest pb-3 px-1 relative transition-colors ${
                        activeTab === 'pending' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-800'
                    }`}
                >
                    Pending Promotion
                    {activeTab === 'pending' && (
                        <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                    )}
                </button>
            </div>

            <main className="px-6 space-y-8 flex-1 mt-6">
                {/* Campaign List */}
                <section className="space-y-6">
                    <div className="space-y-4">
                        {loading && (
                            <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest opacity-40 animate-pulse">Synchronizing Data...</div>
                        )}
                        {!loading && filteredPromos.length === 0 && (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                    <span className="material-symbols-outlined text-4xl">loyalty</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-slate-400">
                                    {activeTab === 'active' ? 'No Active Promotions' : 'No Pending Promotions'}
                                </p>
                            </div>
                        )}
                        {!loading && Array.isArray(filteredPromos) && filteredPromos.map(promo => (
                            <motion.div
                                key={promo._id}
                                whileHover={{ scale: 1.01 }}
                                className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                                                promo.approval_status === 'APPROVED' 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                    : promo.approval_status === 'REJECTED'
                                                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                                Approval: {promo.approval_status || 'PENDING'}
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${promo.status === 'Active' ? 'bg-primary/5 text-primary border border-primary/10' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                                {promo.status}
                                            </div>
                                            <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                {((promo.discountType === 'Flat' || promo.discount_type === 'FLAT_AMOUNT') ? `₹${promo.discountValue || promo.discount_value} OFF` : `${promo.discountValue || promo.discount_value}% OFF`)}
                                            </div>
                                            {(promo.minOrderValue > 0 || promo.min_order_value > 0) && (
                                                <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
                                                    MOV: ₹{promo.minOrderValue || promo.min_order_value}
                                                </div>
                                            )}
                                            {promo.is_exclusive_window_eligible && (
                                                <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                                                    Priority (120s)
                                                </div>
                                            )}
                                            <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                                                {promo.scope_type === 'SELECTED_SERVICES' ? `Services (${promo.selected_services?.length || 0})` : 'Global'}
                                            </div>
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

                                {promo.approval_status === 'REJECTED' && promo.rejection_reason && (
                                    <div className="mt-2 mb-6 p-4 bg-rose-50 border border-rose-100 rounded-3xl flex items-start gap-2.5">
                                        <span className="material-symbols-outlined text-rose-600 text-sm mt-0.5">error</span>
                                        <div>
                                            <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Rejection Reason</p>
                                            <p className="text-[10px] font-bold text-rose-700 mt-0.5 leading-relaxed">{promo.rejection_reason}</p>
                                        </div>
                                    </div>
                                )}

                                {editMode && (
                                    <div className="flex gap-3 mt-4">
                                        <motion.button 
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleToggleStatus(promo._id)}
                                            className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                                promo.status === 'Active' ? 'bg-slate-50 text-slate-900 border border-slate-200' : 'bg-primary/5 text-primary border border-primary/10'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-sm">{promo.status === 'Active' ? 'pause_circle' : 'play_circle'}</span>
                                                {promo.status === 'Active' ? 'Pause' : 'Resume'}
                                            </div>
                                        </motion.button>
                                        <motion.button 
                                            whileTap={{ scale: 0.95 }}
                                            onClick={async () => {
                                                if (window.confirm('Are you sure you want to delete this promotion?')) {
                                                    try {
                                                        const res = await fetch(`${BASE_URL}/promotion/${promo._id}`, { method: 'DELETE' });
                                                        if (res.ok) {
                                                            fetchPromos();
                                                        } else {
                                                            alert('Failed to delete promotion');
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }
                                            }}
                                            className="px-4 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 animate-fade-in"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                Delete
                                            </div>
                                        </motion.button>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Modal Logic */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white text-slate-900 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col space-y-6 overflow-y-auto max-h-[90vh] relative"
                        >
                            {/* Close Button */}
                            <button 
                                onClick={() => { setIsCreating(false); setEditingPromo(null); }}
                                className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors hover:scale-105 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-950 leading-none">Create Promotion</h3>
                            </div>

                            <div className="space-y-4 text-left">

                                {/* Discount Code */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Discount Code</label>
                                    <input 
                                        type="text" 
                                        value={formData.code}
                                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                        placeholder="e.g. FESTIVE50" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300 font-mono tracking-[0.1em]" 
                                    />
                                </div>

                                {/* Type & Value Row */}
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1.5 text-left">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</label>
                                        <select 
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300 cursor-pointer"
                                        >
                                            <option value="Percentage">Percentage</option>
                                            <option value="Flat">Flat ₹</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Value</label>
                                        <input 
                                            type="number" 
                                            value={formData.discountValue}
                                            onChange={(e) => setFormData({...formData, discountValue: Number(e.target.value)})}
                                            placeholder="0"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300" 
                                        />
                                    </div>
                                </div>
                                
                                {/* Min Order Row */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Min. Order (₹)</label>
                                    <input 
                                        type="number" 
                                        value={formData.minOrderValue}
                                        onChange={(e) => setFormData({...formData, minOrderValue: Number(e.target.value)})}
                                        placeholder="0"
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300" 
                                    />
                                </div>

                                {/* Start & Expiry Date Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</label>
                                        <input 
                                            type="date" 
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300" 
                                        />
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Expiry Date</label>
                                        <input 
                                            type="date" 
                                            value={formData.expiryDate}
                                            onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300" 
                                        />
                                    </div>
                                </div>

                                {/* Scope selector */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Scope</label>
                                    <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-2xl gap-1 h-[48px]">
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({ ...formData, scope_type: 'GLOBAL_ORDER' })}
                                            className={`flex-1 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${formData.scope_type === 'GLOBAL_ORDER' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}
                                        >
                                            Global (All)
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({ ...formData, scope_type: 'SELECTED_SERVICES' })}
                                            className={`flex-1 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${formData.scope_type === 'SELECTED_SERVICES' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}
                                        >
                                            Selected Services
                                        </button>
                                    </div>
                                </div>

                                {/* Selected Services Checklist */}
                                {formData.scope_type === 'SELECTED_SERVICES' && (
                                    <div className="space-y-1.5 px-1 border border-slate-100 rounded-2xl p-4 bg-slate-50 max-h-[150px] overflow-y-auto text-left">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Select Target Services</p>
                                        {services.map(s => {
                                            const id = s._id || s.id;
                                            const isChecked = formData.selected_services.includes(id);
                                            return (
                                                <label key={id} className="flex items-center gap-2 py-1.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900">
                                                    <input 
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            const nextSelected = isChecked
                                                                ? formData.selected_services.filter(sid => sid !== id)
                                                                : [...formData.selected_services, id];
                                                            setFormData({ ...formData, selected_services: nextSelected });
                                                        }}
                                                        className="rounded text-primary focus:ring-primary/20 border-slate-300"
                                                    />
                                                    {s.name || s.itemName}
                                                </label>
                                            );
                                        })}
                                        {services.length === 0 && (
                                            <p className="text-[10px] text-slate-400 italic">No services available</p>
                                        )}
                                    </div>
                                )}

                                {/* Priority Early-Access Checkbox */}
                                <label className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={formData.is_exclusive_window_eligible}
                                        onChange={(e) => setFormData({ ...formData, is_exclusive_window_eligible: e.target.checked })}
                                        className="rounded text-primary focus:ring-primary/20 border-slate-300"
                                    />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{formData.is_exclusive_window_eligible ? 'ON' : 'OFF'}</p>
                                    </div>
                                </label>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button 
                                        onClick={handleCreateOrUpdate}
                                        className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-950/15 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                                        <span>Activate Campaign</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PromotionManagerPage;
