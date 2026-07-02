import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import { Tag, Plus, Edit2, X } from 'lucide-react';
import { promotionApi, BASE_URL } from '../../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const AdminCreatePromotion = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        code: '',
        status: 'Active' // 'Active' | 'Paused'
    });

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const data = await promotionApi.adminList();
            // Filter only platform owner type promotions
            const platformPromos = (data || []).filter(p => p.owner_type === 'PLATFORM');
            setPromotions(platformPromos);
        } catch (error) {
            console.error('Fetch Platform Promotions Error:', error);
            toast.error('Failed to load promotions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const handleOpenModal = (promo = null) => {
        if (promo) {
            setEditingPromo(promo);
            setFormData({
                code: promo.code || '',
                status: promo.status === 'Active' ? 'Active' : 'Paused'
            });
        } else {
            setEditingPromo(null);
            setFormData({
                code: '',
                status: 'Active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.code) {
                toast.error('Please enter a promotion code');
                return;
            }

            setSubmitting(true);
            const farDate = new Date();
            farDate.setFullYear(farDate.getFullYear() + 10);

            const existing = promotions.find(p => p.code === formData.code.toUpperCase().trim());

            const payload = {
                title: existing ? existing.title : formData.code,
                code: formData.code.toUpperCase().trim(),
                discountType: existing ? (existing.discountType || existing.discount_type) : 'Percentage',
                discountValue: existing ? (existing.discountValue || existing.discount_value) : 0,
                minOrderValue: existing ? (existing.minOrderValue || existing.min_order_value) : 0,
                usageLimit: existing ? (existing.usageLimit || 999999) : 999999,
                start_date: existing ? (existing.start_date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
                expiryDate: existing ? (existing.expiryDate || farDate.toISOString().split('T')[0]) : farDate.toISOString().split('T')[0],
                geofence_id: existing ? (existing.geofence_id?._id || existing.geofence_id) : null,
                is_exclusive_window_eligible: existing ? existing.is_exclusive_window_eligible : false,
                owner_type: 'PLATFORM',
                status: formData.status
            };

            const targetId = editingPromo?._id || existing?._id;
            if (targetId) {
                // Delete previous and recreate
                await fetch(`${BASE_URL}/promotions/${targetId}`, {
                    method: 'DELETE'
                });
                await promotionApi.create(payload);
                toast.success('Promotion updated successfully');
            } else {
                await promotionApi.create(payload);
                toast.success('Platform promotion created successfully!');
            }

            setIsModalOpen(false);
            fetchPromotions();
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const paginatedPromotions = useMemo(() => {
        return promotions.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [promotions, page]);

    const columns = useMemo(() => [
        {
            header: 'Promotion ID',
            key: '_id',
            render: (val) => (
                <span className="font-black text-slate-900 tabular-nums bg-slate-50 px-2 py-1 rounded-sm border border-slate-100">
                    {val}
                </span>
            )
        },
        {
            header: 'Promotion Code',
            key: 'code',
            render: (val) => (
                <span className="text-[10px] text-slate-900 font-mono font-black uppercase tracking-widest bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                    {val}
                </span>
            )
        },
        {
            header: 'Status',
            key: 'status',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    val === 'Active' ? 'bg-slate-900 text-white border border-slate-900' : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                    {val === 'Active' ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, row) => (
                <div className="flex items-center justify-end gap-2">
                    <button 
                        onClick={() => handleOpenModal(row)}
                        title="Edit Details"
                        className="p-2 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-slate-900 transition-all"
                    >
                        <Edit2 size={14} />
                    </button>
                </div>
            )
        }
    ], [promotions]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Create Promotion" 
                actions={[
                    {
                        label: "Add Promotion",
                        icon: Plus,
                        onClick: () => handleOpenModal(),
                        variant: 'primary'
                    }
                ]}
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                <DataGrid 
                    title=""
                    showFilter={false}
                    showSearch={false}
                    columns={columns}
                    data={paginatedPromotions}
                    loading={loading}
                    pagination={{
                        page,
                        totalPages: Math.ceil(promotions.length / itemsPerPage) || 1,
                        total: promotions.length
                    }}
                    onPageChange={setPage}
                />
            </div>

            {/* ─── Single Promotion Modal (Category Management style) ───────── */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.form 
                            onSubmit={handleSubmit}
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-sm p-10 shadow-2xl space-y-6 border border-slate-200"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center rounded-sm">
                                        <Tag size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">
                                            {editingPromo ? 'Edit Promotion' : 'New Promotion'}
                                        </h3>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Code */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Promotion Code *</label>
                                    <input 
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none uppercase font-mono tracking-widest"
                                        placeholder="e.g. MONSOON50"
                                    />
                                </div>

                                {/* Status */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Status *</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none cursor-pointer uppercase tracking-wider"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Paused">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-slate-900 text-white py-4 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-black transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : 'Save Promotion'}
                            </button>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminCreatePromotion;
