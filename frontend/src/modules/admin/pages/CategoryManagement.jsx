import React, { useState, useEffect, useMemo } from 'react';
import { categoryApi } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Edit2, Trash2, X, Folder, LayoutGrid, Tag
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
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
                mainCategory: category.mainCategory || '',
                subCategory: category.subCategory || '',
                isActive: category.isActive !== undefined ? category.isActive : true
            });
        } else {
            setEditingCategory(null);
            setFormData({
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
            if (editingCategory) {
                await categoryApi.update(editingCategory._id, formData);
                toast.success('Category updated');
            } else {
                await categoryApi.create(formData);
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

    const groupedCategories = useMemo(() => {
        const groups = {};
        categories.forEach(cat => {
            if (!groups[cat.mainCategory]) groups[cat.mainCategory] = [];
            groups[cat.mainCategory].push(cat);
        });
        return groups;
    }, [categories]);

    return (
        <div className="space-y-8 p-6 bg-slate-50 min-h-screen">
            <PageHeader 
                title="Service Taxonomy" 
                actions={[
                    {
                        label: "Add Mapping",
                        icon: Plus,
                        onClick: () => handleOpenModal(),
                        variant: 'primary'
                    }
                ]}
            />

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(groupedCategories).map(([main, subs]) => (
                        <div key={main} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                        <Folder size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{main}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Group</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {subs.map(sub => (
                                        <div key={sub._id} className="group flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
                                            <div className="flex items-center gap-3">
                                                <Tag size={14} className="text-primary/40" />
                                                <span className="text-sm font-bold text-slate-700">{sub.subCategory}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleOpenModal(sub)} className="p-2 text-slate-400 hover:text-primary">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(sub._id)} className="p-2 text-slate-400 hover:text-rose-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-6"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black text-slate-900">
                                    {editingCategory ? 'Edit Mapping' : 'New Mapping'}
                                </h3>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Main Category</label>
                                    <input 
                                        required
                                        value={formData.mainCategory}
                                        onChange={e => setFormData({...formData, mainCategory: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white outline-none"
                                        placeholder="e.g. Dry Cleaning"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub Category</label>
                                    <input 
                                        required
                                        value={formData.subCategory}
                                        onChange={e => setFormData({...formData, subCategory: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white outline-none"
                                        placeholder="e.g. Household"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input 
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="isActive" className="text-xs font-bold text-slate-600">Active and Visible</label>
                                </div>
                            </div>

                            <button className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                {editingCategory ? 'Save Changes' : 'Create Mapping'}
                            </button>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CategoryManagement;
