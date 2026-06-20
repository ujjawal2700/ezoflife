import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { vendorMasterSupplyApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const SupplierMySupplies = () => {
    const navigate = useNavigate();

    const [supplies, setSupplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [originalSupplies, setOriginalSupplies] = useState([]);
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

    const toggleSupplyStatusLocal = (id) => {
        if (!editMode) return;
        setSupplies(prev => prev.map(item => {
            if (item._id === id) {
                const currentActive = item.isActive || 'y';
                const nextActive = currentActive === 'y' ? 'n' : 'y';
                return { ...item, isActive: nextActive };
            }
            return item;
        }));
    };

    const handleGlobalSave = async () => {
        try {
            setLoading(true);
            const updates = [];
            for (const item of supplies) {
                const original = originalSupplies.find(o => o._id === item._id);
                if (original && original.isActive !== item.isActive) {
                    const payload = {
                        ...item,
                        categoryId: item.categoryId?._id
                    };
                    updates.push(vendorMasterSupplyApi.update(item._id, payload));
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
                toast.success('Supply statuses updated successfully!');
            } else {
                toast('No changes to save.', { icon: 'ℹ️' });
            }
            setEditMode(false);
            fetchSupplies();
        } catch (error) {
            console.error('Global save error:', error);
            toast.error('Failed to save changes');
        } finally {
            setLoading(false);
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
            const list = Array.isArray(data) ? data : [];
            setSupplies(list);
            setOriginalSupplies(JSON.parse(JSON.stringify(list)));
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
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    onClose();
                                    handleOpenEditModal(supply);
                                }} 
                                className="w-10 h-10 rounded-2xl bg-slate-900 text-white hover:bg-primary flex items-center justify-center transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
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
            <header className="px-6 pt-2 flex items-center justify-between mb-6 max-w-5xl mx-auto">
                <div className="flex items-center gap-2">
                    <h1 className="font-headline font-black text-xl text-primary tracking-tighter leading-none uppercase">SPINZYT</h1>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 animate-pulse"></div>
                </div>

                {/* Profile Icon */}
                <motion.div 
                    onClick={() => navigate('/supplier/profile')}
                    whileHover={{ scale: 1.05 }}
                    className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer border border-slate-200"
                >
                    {user.avatar ? (
                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-slate-500 text-[20px]">person</span>
                    )}
                </motion.div>
            </header>

            <main className="px-6 space-y-8 max-w-5xl mx-auto">
                {/* Action Row */}
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 shadow-sm transition-all">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => toast('Coming soon!', { icon: '🚀' })}
                            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-center min-w-[80px] shadow-md shadow-slate-900/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            Create
                        </button>
                        <button 
                            onClick={() => editMode ? handleGlobalSave() : setEditMode(true)}
                            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-center min-w-[80px] shadow-md shadow-slate-900/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            {editMode ? 'Save' : 'Edit'}
                        </button>
                    </div>
                </div>
                {/* 2. INVENTORY RATE CARD */}
                <section className="space-y-4">
                    {/* SUPPLY ITEMS LIST */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[850px]">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="p-4 w-28"><div className="h-3 w-16 bg-slate-200 rounded mx-auto"></div></th>
                                                <th className="p-4"><div className="h-3 w-24 bg-slate-200 rounded"></div></th>
                                                <th className="p-4"><div className="h-3 w-20 bg-slate-200 rounded"></div></th>
                                                <th className="p-4"><div className="h-3 w-20 bg-slate-200 rounded"></div></th>
                                                <th className="p-4"><div className="h-3 w-20 bg-slate-200 rounded"></div></th>
                                                <th className="p-4 w-32"><div className="h-3 w-20 bg-slate-200 rounded"></div></th>
                                                <th className="p-4 w-28"><div className="h-3 w-16 bg-slate-200 rounded"></div></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {[...Array(6)].map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td className="p-4">
                                                        <div className="w-10 h-5 rounded-full bg-slate-200 mx-auto"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="w-32 h-3 bg-slate-200 rounded"></div>
                                                            <div className="w-20 h-2 bg-slate-100 rounded"></div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-20 h-3 bg-slate-100 rounded"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-24 h-3 bg-slate-100 rounded"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-24 h-3 bg-slate-100 rounded"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-24 h-8 bg-slate-100 rounded-xl"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-16 h-3 bg-slate-100 rounded"></div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : filteredSupplies.length === 0 ? (
                            <div className="text-center py-16 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
                                <span className="material-symbols-outlined text-slate-200 text-4xl mb-3">folder_open</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No supplies found</p>
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Check search query or status filter</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[850px]">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center w-28">Status</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Product Name</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Brand</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Category</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Sub Category</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 w-32">Wholesale Rate</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">GST</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredSupplies.map((item) => {
                                                const isActiveVal = item.isActive || 'y';
                                                const isActive = isActiveVal === 'y';
                                                return (
                                                    <tr 
                                                        key={item._id} 
                                                        onClick={() => {
                                                            if (editMode) return;
                                                            setSelectedSupply(item);
                                                            setShowDetailModal(true);
                                                        }}
                                                        className={`hover:bg-slate-50/50 transition-colors ${editMode ? 'cursor-default' : 'cursor-pointer'}`}
                                                    >
                                                        <td className="p-4">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (!editMode) return;
                                                                        toggleSupplyStatusLocal(item._id);
                                                                    }}
                                                                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${!editMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isActive ? 'bg-slate-900' : 'bg-slate-200'}`}
                                                                >
                                                                    <motion.div 
                                                                        animate={{ x: isActive ? 22 : 2 }}
                                                                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.materialName}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                            {item.brand || 'Generic'}
                                                        </td>
                                                        <td className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                            {item.categoryId?.mainCategory || 'Generic'}
                                                        </td>
                                                        <td className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                            {item.categoryId?.subCategory || 'General'}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="text-xs font-black text-slate-900 bg-slate-50 px-3 py-2 rounded-xl inline-block border border-slate-100">
                                                                ₹{item.wholesaleRate || 0}
                                                                <span className="text-[9px] text-slate-400 font-bold ml-1">/ {item.quantity}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs font-bold text-slate-700">
                                                            {item.gst || 18}%
                                                            <span className="text-[10px] text-slate-400 font-bold ml-1">({item.hsnCode || '-'})</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SupplierMySupplies;
