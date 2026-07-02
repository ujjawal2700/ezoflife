import React, { useState, useEffect, useMemo } from 'react';
import { promotionApi, BASE_URL } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, X, PlusCircle } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';

const AdminGeofencePromotion = () => {
    const [allPromotions, setAllPromotions] = useState([]);
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingAreas, setLoadingAreas] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        code: '',
        geofence_id: '',
        status: 'Active'
    });

    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const fetchAreas = async () => {
        try {
            setLoadingAreas(true);
            const res = await fetch(`${BASE_URL}/geofence/areas`);
            if (res.ok) {
                const data = await res.json();
                setAreas(data || []);
            }
        } catch (err) {
            console.error('Failed to load geofence areas', err);
        } finally {
            setLoadingAreas(false);
        }
    };

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const data = await promotionApi.adminList();
            const platformPromos = (data || []).filter(p => p.owner_type === 'PLATFORM');
            setAllPromotions(platformPromos);
        } catch (error) {
            console.error('Failed to fetch promotions:', error);
            toast.error('Failed to load promotions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAreas();
        fetchPromotions();
    }, []);

    // Filter displayed table to only promotions that have geofence assigned
    const targetedPromotions = useMemo(() => {
        return allPromotions.filter(p => p.geofence_id !== null && p.geofence_id !== undefined);
    }, [allPromotions]);

    const paginatedPromotions = useMemo(() => {
        return targetedPromotions.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [targetedPromotions, page]);

    const handleOpenModal = (promo = null) => {
        if (promo) {
            setEditingPromo(promo);
            setFormData({
                code: promo.code || '',
                geofence_id: promo.geofence_id?._id || promo.geofence_id || '',
                status: promo.status === 'Active' ? 'Active' : 'Paused'
            });
        } else {
            setEditingPromo(null);
            setFormData({
                code: allPromotions[0]?.code || '',
                geofence_id: areas[0]?._id || '',
                status: 'Active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.code || !formData.geofence_id) {
                toast.error('Please select both Promotion Code and Geofence Area');
                return;
            }

            setSubmitting(true);
            const matchedPromo = allPromotions.find(p => p.code === formData.code);

            const payload = {
                title: matchedPromo ? matchedPromo.title : formData.code,
                code: formData.code.toUpperCase().trim(),
                geofence_id: formData.geofence_id,
                discountType: matchedPromo ? (matchedPromo.discountType || matchedPromo.discount_type) : 'Percentage',
                discountValue: matchedPromo ? (matchedPromo.discountValue || matchedPromo.discount_value) : 0,
                minOrderValue: matchedPromo ? (matchedPromo.minOrderValue || matchedPromo.min_order_value) : 0,
                usageLimit: matchedPromo ? matchedPromo.usageLimit : 999999,
                start_date: matchedPromo ? matchedPromo.start_date : new Date().toISOString().split('T')[0],
                expiryDate: matchedPromo ? matchedPromo.expiryDate : new Date(Date.now() + 10*365*24*60*60*1000).toISOString().split('T')[0],
                is_exclusive_window_eligible: matchedPromo ? matchedPromo.is_exclusive_window_eligible : false,
                owner_type: 'PLATFORM',
                status: formData.status
            };

            // Delete original first to avoid unique constraint violations
            const duplicatePromo = allPromotions.find(p => p.code === payload.code);
            if (duplicatePromo) {
                await fetch(`${BASE_URL}/promotions/${duplicatePromo._id}`, {
                    method: 'DELETE'
                });
            }

            await promotionApi.create(payload);
            toast.success('Geofence targeting updated successfully');

            setIsModalOpen(false);
            fetchPromotions();
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const columns = useMemo(() => [
        {
            header: 'Zone Name',
            key: 'geofence_id',
            render: (val) => (
                <span className="font-bold uppercase tracking-tight text-slate-800">
                    {val?.areaName || '—'}
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
                    <button onClick={() => handleOpenModal(row)} className="p-2 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-slate-900 transition-all" title="Edit Target">
                        <Edit2 size={13} />
                    </button>
                </div>
            )
        }
    ], [allPromotions]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Geofence Promotion" 
                actions={[
                    {
                        label: "Connect Zone to Promotion",
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
                        totalPages: Math.ceil(targetedPromotions.length / itemsPerPage) || 1,
                        total: targetedPromotions.length
                    }}
                    onPageChange={setPage}
                />
            </div>

            {/* ─── Single Promotion Modal ─── */}
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
                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center rounded-sm">
                                        <PlusCircle size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">
                                            {editingPromo ? 'Update Geofence Target' : 'New Geofence Target'}
                                        </h3>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Zone Name (Dropdown) */}
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone Name *</label>
                                    <select 
                                        required
                                        value={formData.geofence_id}
                                        onChange={(e) => setFormData({ ...formData, geofence_id: e.target.value })}
                                        disabled={loadingAreas}
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-900 transition-all outline-none cursor-pointer uppercase tracking-wider"
                                    >
                                        <option value="">Select Zone Name</option>
                                        {areas.map(area => (
                                            <option key={area._id} value={area._id}>{area.areaName}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Promotion Code (Dropdown) */}
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Promotion Code *</label>
                                    <select
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-900 transition-all outline-none cursor-pointer uppercase font-mono tracking-widest"
                                    >
                                        <option value="">Select Promotion Code</option>
                                        {allPromotions.map(promo => (
                                            <option key={promo._id} value={promo.code}>{promo.code}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status */}
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Status *</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-900 transition-all outline-none cursor-pointer uppercase tracking-wider"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Paused">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 border-t border-slate-100 pt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border border-slate-200 text-slate-400 hover:text-slate-950 font-black text-[10px] uppercase tracking-widest hover:border-slate-950 transition-all rounded-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-95 transition-all rounded-sm">
                                    {submitting ? 'Saving...' : 'Save Target'}
                                </button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminGeofencePromotion;
