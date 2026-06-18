import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { vendorMasterSupplyApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const SupplierMySupplies = () => {
    const navigate = useNavigate();

    const [supplies, setSupplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [selectedSupply, setSelectedSupply] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingSupply, setEditingSupply] = useState(null);
    const [editForm, setEditForm] = useState({
        wholesaleRate: 0,
        bulkDiscount: 0,
        bulkThreshold: 0,
        movFreeDelivery: 0
    });

    const handleOpenEditModal = (supply) => {
        setEditingSupply(supply);
        setEditForm({
            wholesaleRate: supply.wholesaleRate || 0,
            bulkDiscount: supply.bulkDiscount || 0,
            bulkThreshold: supply.bulkThreshold || 0,
            movFreeDelivery: supply.movFreeDelivery || 0
        });
    };

    const handleSaveEdit = async () => {
        try {
            const payload = {
                ...editingSupply,
                wholesaleRate: Number(editForm.wholesaleRate) || 0,
                bulkDiscount: Number(editForm.bulkDiscount) || 0,
                bulkThreshold: Number(editForm.bulkThreshold) || 0,
                movFreeDelivery: Number(editForm.movFreeDelivery) || 0,
                categoryId: editingSupply.categoryId?._id
            };
            
            const response = await vendorMasterSupplyApi.update(editingSupply._id, payload);
            if (response && response._id) {
                toast.success('Supply rates updated successfully!');
                setEditingSupply(null);
                fetchSupplies();
            } else {
                toast.error('Failed to update supply rates');
            }
        } catch (error) {
            console.error('Update supply error:', error);
            toast.error('Failed to update supply rates');
        }
    };

    // Retrieve logged-in supplier user
    const user = useMemo(() => {
        try {
            return JSON.parse(
                localStorage.getItem('supplierData') || 
                localStorage.getItem('userData') || 
                localStorage.getItem('user') || 
                '{}'
            );
        } catch (e) {
            return {};
        }
    }, []);

    // Suffix-based supplier ID generation
    const supplierCode = useMemo(() => {
        const phone = user.phone || '';
        return `SUP-${phone ? phone.slice(-4) : '001'}`;
    }, [user]);

    const fetchSupplies = async () => {
        try {
            setLoading(true);
            const data = await vendorMasterSupplyApi.getAll({ supplierId: supplierCode });
            setSupplies(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch supplies:', err);
            toast.error('Failed to load supplies registry');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (supplierCode) {
            fetchSupplies();
        }
    }, [supplierCode]);

    const filteredSupplies = useMemo(() => {
        return supplies.filter(item => {
            const matchesSearch = 
                (item.materialName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.skuId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.categoryId?.mainCategory || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.categoryId?.subCategory || '').toLowerCase().includes(searchTerm.toLowerCase());

            const isActiveVal = item.isActive || 'y';
            const matchesStatus = 
                statusFilter === 'all' ||
                (statusFilter === 'active' && isActiveVal === 'y') ||
                (statusFilter === 'inactive' && isActiveVal === 'n');

            return matchesSearch && matchesStatus;
        });
    }, [supplies, searchTerm, statusFilter]);

    // Icon selector helper based on main category name
    const getCategoryIcon = (categoryName) => {
        const cat = (categoryName || '').toLowerCase();
        if (cat.includes('chemical') || cat.includes('solvent')) return 'science';
        if (cat.includes('detergent') || cat.includes('soap')) return 'wash';
        if (cat.includes('package') || cat.includes('bag') || cat.includes('box')) return 'inventory_2';
        if (cat.includes('hanger') || cat.includes('tag')) return 'label';
        if (cat.includes('machine') || cat.includes('spare')) return 'settings';
        return 'package';
    };

    const DetailModal = ({ supply, onClose }) => {
        if (!supply) return null;
        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="p-8 border-b border-slate-100 flex justify-between items-start shrink-0">
                        <div>
                            <span className="bg-primary/5 text-primary text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md border border-primary/10">
                                {supply.skuId || 'NO SKU'}
                            </span>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-2 uppercase">{supply.materialName}</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">By {supply.brand || 'Generic'}</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-xs font-bold text-slate-600">
                        {/* Status & Basic details */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-3xl">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${
                                    (supply.isActive || 'y') === 'y' 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                        : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                    {(supply.isActive || 'y') === 'y' ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Category Code</p>
                                <span className="bg-slate-200/50 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                    {supply.categoryId?.excelCategoryId || 'N/A'}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Category Hierarchy</p>
                                <p className="text-slate-800 text-[11px]">
                                    {supply.categoryId?.mainCategory || 'N/A'} <span className="text-slate-300 mx-1">→</span> {supply.categoryId?.subCategory || 'N/A'}
                                </p>
                            </div>
                        </div>

                        {/* Pricing Columns */}
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Pricing & Taxation</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-slate-100 p-4 rounded-2xl flex flex-col justify-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Wholesale Rate</span>
                                    <span className="text-lg font-black text-slate-900">₹{supply.wholesaleRate || 0} <span className="text-[10px] text-slate-400 font-bold uppercase">/ {supply.quantity}</span></span>
                                </div>
                                <div className="border border-slate-100 p-4 rounded-2xl flex flex-col justify-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">GST & HSN</span>
                                    <span className="text-sm font-black text-slate-900">{supply.gst || 18}% <span className="text-[10px] text-slate-400 font-bold">({supply.hsnCode || '2800'})</span></span>
                                </div>
                                <div className="border border-slate-100 p-4 rounded-2xl col-span-2 flex justify-between items-center">
                                    <div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Bulk Discount</span>
                                        <span className="text-sm font-black text-indigo-600">{supply.bulkDiscount || 0}% Off</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Bulk Threshold</span>
                                        <span className="text-xs font-black text-slate-800">{supply.bulkThreshold || 0} Units</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logistics & Delivery */}
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Logistics & Supply Chain</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-slate-100 p-4 rounded-2xl flex flex-col justify-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery Frequency</span>
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{supply.deliveryFrequency || 'Weekly'}</span>
                                </div>
                                <div className="border border-slate-100 p-4 rounded-2xl flex flex-col justify-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">MOV for Free Delivery</span>
                                    <span className="text-xs font-black text-slate-800">₹{supply.movFreeDelivery || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Supplier Info */}
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Assigned Vendor Details</p>
                            <div className="bg-slate-50 p-4 rounded-2xl space-y-2.5">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400">Supplier Code:</span>
                                    <span className="text-slate-900 font-black">{supply.supplierId || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400">Supplier Facility Name:</span>
                                    <span className="text-slate-900 font-black uppercase">{supply.supplierFacilityName || 'Main Facility'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        );
    };

    return (
        <div className="text-slate-900 min-h-screen pb-48 font-sans">
            <AnimatePresence>
                {showDetailModal && (
                    <DetailModal 
                        supply={selectedSupply} 
                        onClose={() => {
                            setShowDetailModal(false);
                            setSelectedSupply(null);
                        }} 
                    />
                )}
            </AnimatePresence>

            {/* Custom Pricing Edit Modal */}
            <AnimatePresence>
                {editingSupply && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                        <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }} 
                          onClick={() => setEditingSupply(null)}
                          className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
                        >
                          <div className="p-8 bg-slate-900 text-white">
                              <h3 className="text-xl font-black uppercase tracking-tighter">Edit Supply Pricing</h3>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Modify your pricing configurations</p>
                          </div>
                          
                          <div className="p-8 space-y-6 text-xs font-bold text-slate-600">
                              <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Name</p>
                                  <p className="font-bold text-slate-900 text-sm">{editingSupply.materialName}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wholesale Rate (₹)</label>
                                      <input 
                                        type="number"
                                        value={editForm.wholesaleRate}
                                        onChange={(e) => setEditForm({...editForm, wholesaleRate: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                      />
                                  </div>

                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bulk Discount (%)</label>
                                      <input 
                                        type="number"
                                        value={editForm.bulkDiscount}
                                        onChange={(e) => setEditForm({...editForm, bulkDiscount: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                      />
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Bulk Qty</label>
                                      <input 
                                        type="number"
                                        value={editForm.bulkThreshold}
                                        onChange={(e) => setEditForm({...editForm, bulkThreshold: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                      />
                                  </div>

                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MOV for Free Delivery (₹)</label>
                                      <input 
                                        type="number"
                                        value={editForm.movFreeDelivery}
                                        onChange={(e) => setEditForm({...editForm, movFreeDelivery: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                      />
                                  </div>
                              </div>

                              <div className="flex gap-3 pt-4">
                                  <button 
                                    onClick={() => setEditingSupply(null)}
                                    className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={handleSaveEdit}
                                    className="flex-1 py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                                  >
                                    Save Rates
                                  </button>
                              </div>
                          </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="px-6 pt-2 flex items-center justify-between mb-6 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-950 shadow-sm transition-all mr-2">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-950 uppercase leading-none">Spinzyt</h1>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 animate-pulse"></div>
                </div>

                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center text-slate-400 shadow-sm relative"
                    >
                        <span className="material-symbols-outlined text-xl">notifications</span>
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>
                    </motion.button>

                    <motion.div 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/supplier/profile')}
                        className="w-10 h-10 rounded-full bg-white border border-black/5 overflow-hidden shadow-sm cursor-pointer"
                    >
                        <img 
                            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100" 
                            alt="Supplier" 
                            className="w-full h-full object-cover" 
                        />
                    </motion.div>
                </div>
            </header>

            <main className="px-6 space-y-8 max-w-md mx-auto">
                {/* 1. OPERATIONS & LOGISTICS */}
                <section className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <motion.div 
                            whileHover={{ scale: 1.01 }}
                            className="bg-slate-900 rounded-[2.5rem] p-7 shadow-2xl shadow-slate-900/20 relative overflow-hidden group cursor-pointer"
                            onClick={() => {
                                toast.success('Aggregated Manifest Generated!');
                            }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] -mr-16 -mt-16"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <h2 className="text-xl font-black text-white tracking-tight uppercase">Aggregated Manifest</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-[200px]">
                                        Consolidated picking list for current batch orders.
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-2xl">download_for_offline</span>
                                </div>
                            </div>
                            <div className="mt-6 pt-5 border-t border-white/5 flex gap-4">
                                {[
                                    { val: '450 KG', label: 'Detergent' },
                                    { val: '1200 Pcs', label: 'Bags' },
                                    { val: '80 Ltr', label: 'Softener' }
                                ].map((stat, i) => (
                                    <div key={i} className="flex-1">
                                        <p className="text-[10px] font-black text-white leading-none">{stat.val}</p>
                                        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* 2. INVENTORY RATE CARD */}
                <section className="space-y-4">
                    {/* SEARCH & FILTERS CONTAINER */}
                    <div className="space-y-3">
                        {/* Search Bar */}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">search</span>
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name, brand, SKU..."
                                className="w-full bg-white pl-11 pr-4 py-4 rounded-2xl text-[12px] font-bold border border-slate-100 focus:border-slate-300 outline-none shadow-sm transition-all"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 material-symbols-outlined text-lg"
                                >
                                    close
                                </button>
                            )}
                        </div>

                        {/* Status Filters */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {['all', 'active', 'inactive'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setStatusFilter(filter)}
                                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                                        statusFilter === filter 
                                            ? 'bg-white text-slate-900 shadow-sm' 
                                            : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SUPPLY ITEMS LIST */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <motion.span 
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                                    className="material-symbols-outlined text-slate-300 text-3xl"
                                >
                                    sync
                                </motion.span>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Supplies...</span>
                            </div>
                        ) : filteredSupplies.length === 0 ? (
                            <div className="text-center py-16 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
                                <span className="material-symbols-outlined text-slate-200 text-4xl mb-3">folder_open</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No supplies found</p>
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Check search query or status filter</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {filteredSupplies.map((item, idx) => {
                                    const isActiveVal = item.isActive || 'y';
                                    return (
                                        <motion.div 
                                            key={item._id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                                            onClick={() => {
                                                setSelectedSupply(item);
                                                setShowDetailModal(true);
                                            }}
                                            className={`bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 relative overflow-hidden group transition-all cursor-pointer hover:border-slate-300 hover:shadow-md ${
                                                isActiveVal !== 'y' ? 'grayscale opacity-60' : ''
                                            }`}
                                        >
                                            {/* Product Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-100 transition-all duration-300 bg-slate-50 text-slate-700 group-hover:bg-slate-950 group-hover:text-white`}>
                                                        <span className="material-symbols-outlined text-xl">
                                                            {getCategoryIcon(item.categoryId?.mainCategory)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[13px] font-black text-slate-900 tracking-tight leading-none uppercase">{item.materialName}</h4>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                            {item.brand || 'Generic'} • {item.categoryId?.subCategory || 'General'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${
                                                    isActiveVal === 'y' 
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                        : 'bg-slate-100 text-slate-400 border-slate-200'
                                                }`}>
                                                    {isActiveVal === 'y' ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>

                                            {/* Pricing & Unit Info */}
                                            <div className="grid grid-cols-2 gap-3 pt-1">
                                                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Wholesale Rate</p>
                                                    <p className="text-sm font-black text-slate-900 tracking-tight">₹{item.wholesaleRate || 0} <span className="text-[8px] text-slate-400 font-bold">/ {item.quantity}</span></p>
                                                </div>
                                                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50 flex flex-col justify-center">
                                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">GST & HSN</p>
                                                    <p className="text-[10px] font-black text-slate-800">{item.gst || 18}% <span className="text-slate-400 font-bold text-[8px]">({item.hsnCode || '2800'})</span></p>
                                                </div>
                                            </div>

                                            {/* Expand Note */}
                                            <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest text-slate-400 pt-1" onClick={(e) => e.stopPropagation()}>
                                                <span>SKU: {item.skuId || 'N/A'}</span>
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEditModal(item); }}
                                                        className="px-3 py-1 bg-slate-900 text-white hover:bg-primary hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                        Edit
                                                    </button>
                                                    <span 
                                                        onClick={() => {
                                                            setSelectedSupply(item);
                                                            setShowDetailModal(true);
                                                        }}
                                                        className="flex items-center gap-0.5 text-primary group-hover:underline cursor-pointer"
                                                    >
                                                        View Details
                                                        <span className="material-symbols-outlined text-[10px]">arrow_right_alt</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Footer Insight */}
                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex gap-4">
                        <div className="w-9 h-9 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <span className="material-symbols-outlined text-lg">info</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-[0.05em] flex-1">
                            This catalog displays all supply items created for you by the admin. To make updates or modify rates/details, please reach out to admin support.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SupplierMySupplies;
