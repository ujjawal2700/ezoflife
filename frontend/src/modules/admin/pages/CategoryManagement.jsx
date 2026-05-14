import React, { useState, useEffect, useMemo } from 'react';
import { categoryApi } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Edit2, Trash2, X, Folder, LayoutGrid, Tag, Download, Filter, Search, Settings, MoreHorizontal
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        excelCategoryId: '',
        mainCategory: '',
        subCategory: '',
        isActive: true
    });

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await categoryApi.getAll();
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleOpenModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                excelCategoryId: category.excelCategoryId || '',
                mainCategory: category.mainCategory || '',
                subCategory: category.subCategory || '',
                isActive: category.isActive !== undefined ? category.isActive : true
            });
        } else {
            setEditingCategory(null);
            setFormData({
                excelCategoryId: '',
                mainCategory: '',
                subCategory: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                excelCategoryId: formData.excelCategoryId ? Number(formData.excelCategoryId) : undefined
            };
            if (editingCategory) {
                await categoryApi.update(editingCategory._id, payload);
                toast.success('Category updated');
            } else {
                await categoryApi.create(payload);
                toast.success('Category created');
            }
            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            toast.error(error.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this mapping?')) return;
        try {
            await categoryApi.delete(id);
            toast.success('Deleted');
            fetchCategories();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const columns = useMemo(() => [
        {
            header: 'Category ID',
            key: 'excelCategoryId',
            render: (val) => (
                <span className="font-black text-slate-900 tabular-nums bg-slate-50 px-2 py-1 rounded-sm border border-slate-100">
                    {val || '—'}
                </span>
            )
        },
        {
            header: 'Category Name',
            key: 'mainCategory',
            render: (val) => (
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-bold uppercase tracking-tight text-slate-800">{val}</span>
                </div>
            )
        },
        {
            header: 'Sub Category Name',
            key: 'subCategory',
            render: (val) => (
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{val}</span>
            )
        },
        {
            header: 'Status',
            key: 'isActive',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${val ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {val ? 'Active' : 'Hidden'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (val, row) => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleOpenModal(row)} className="p-2 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-slate-900 transition-all">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(row._id)} className="p-2 hover:bg-rose-50 rounded-sm text-slate-400 hover:text-rose-600 transition-all">
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Category Management" 
                actions={[
                    {
                        label: "Bulk Upload",
                        icon: Download,
                        onClick: () => toast.success('Excel Mapping Tool Initiated'),
                        variant: 'secondary'
                    },
                    {
                        label: "Add Category",
                        icon: Plus,
                        onClick: () => handleOpenModal(),
                        variant: 'primary'
                    }
                ]}
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                <DataGrid 
                    title="Service Taxonomy Registry"
                    columns={columns}
                    data={categories}
                    loading={loading}
                />
            </div>

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
                                        <Settings size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">{editingCategory ? 'Update Mapping' : 'New Category'}</h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Registry Synchronization</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {editingCategory && (
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Category ID (Excel Reference)</label>
                                        <div className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-sm text-[11px] font-bold text-slate-400">
                                            {formData.excelCategoryId || 'Auto-generated'}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Category Name</label>
                                    <input 
                                        required
                                        value={formData.mainCategory}
                                        onChange={e => setFormData({...formData, mainCategory: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none"
                                        placeholder="e.g. Dry Cleaning"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Sub Category Name</label>
                                    <input 
                                        required
                                        value={formData.subCategory}
                                        onChange={e => setFormData({...formData, subCategory: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none"
                                        placeholder="e.g. Household"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input 
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                        className="w-4 h-4 rounded-sm border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <label htmlFor="isActive" className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active in Registry</label>
                                </div>
                            </div>

                            <button className="w-full bg-slate-900 text-white py-4 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-black transition-all">
                                {editingCategory ? 'Commit Changes' : 'Register Category'}
                            </button>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CategoryManagement;
