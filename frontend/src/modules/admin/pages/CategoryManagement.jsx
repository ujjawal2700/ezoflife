import React, { useState, useEffect } from 'react';
import { categoryApi } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Edit2, Trash2, ChevronRight, 
    Layers, Image as ImageIcon, Folder, 
    X, Save, AlertCircle, FileUp, FileDown
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';

const XLSX = window.XLSX;

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        image: '',
        parentCategory: '',
        description: ''
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
            if (category.parentCategory && typeof category.parentCategory === 'object') {
                // If it's a subcategory being edited
                setEditingCategory(category);
                setFormData({
                    name: category.name,
                    image: category.image || '',
                    parentCategory: category.parentCategory._id || '',
                    description: category.description || ''
                });
            } else if (category._id) {
                // If it's a main category being edited
                setEditingCategory(category);
                setFormData({
                    name: category.name,
                    image: category.image || '',
                    parentCategory: '',
                    description: category.description || ''
                });
            } else {
                // If it's adding a subcategory to a specific parent
                setEditingCategory(null);
                setFormData({
                    name: '',
                    image: '',
                    parentCategory: category.parentCategory?._id || '',
                    description: ''
                });
            }
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                image: '',
                parentCategory: '',
                description: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                parentCategory: formData.parentCategory === '' ? null : formData.parentCategory
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
        if (!window.confirm('Are you sure? This will delete the category.')) return;
        try {
            const res = await categoryApi.delete(id);
            if (res.message && !res.message.includes('Cannot delete')) {
                toast.success(res.message);
                fetchCategories();
            } else {
                toast.error(res.message || 'Delete failed');
            }
        } catch (error) {
            toast.error('Failed to delete category');
        }
    };

    const handleClearAll = async () => {
        const confirmed = window.confirm('WARNING: This will permanently delete ALL categories and sub-categories. Do you want to proceed?');
        if (!confirmed) return;
        
        try {
            console.log('Attempting to clear all categories...');
            const res = await categoryApi.clearAll();
            console.log('Clear all response:', res);
            
            if (res.message) {
                toast.success(res.message);
                fetchCategories();
            } else {
                toast.error('Unexpected response from server');
            }
        } catch (error) {
            console.error('Clear All Error:', error);
            toast.error('Failed to clear categories: ' + error.message);
        }
    };

    const handleForceSeed = async () => {
        const seedData = [
            { name: "Dry Cleaning", subs: ["Household", "Woolen", "Daily", "Ethnic"] },
            { name: "Organic DryCleaning", subs: ["Daily", "Ethnic", "Woolen", "Household"] },
            { name: "Leather Jacket Cleaning", subs: [] },
            { name: "Shoes", subs: [] },
            { name: "Bags", subs: [] },
            { name: "MISC", subs: ["Misc"] },
            { name: "Sofa", subs: [] },
            { name: "Carpet", subs: [] },
            { name: "Wash", subs: ["Regular Wash", "Organic Wash", "Woolen"] },
            { name: "Wash + Iron", subs: ["Regular Wash+Iron Service", "Organic Wash+Iron Service", "Curtain Wash Service (Wash And Iron)"] },
            { name: "Wash + Iron + Collar & Cuff Cleaning", subs: ["Premium Laundry Service"] },
            { name: "Steam IRON", subs: ["Daily", "Ethnic", "Woolen", "Household"] }
        ];

        try {
            toast.loading('Seeding data...');
            const formattedForBulk = [];
            
            // First pass: Main categories
            for (const item of seedData) {
                formattedForBulk.push({ name: item.name, parentName: null });
                // Second pass: Sub categories
                for (const sub of item.subs) {
                    formattedForBulk.push({ name: sub, parentName: item.name });
                }
            }

            const res = await categoryApi.bulkUpload(formattedForBulk);
            toast.dismiss();
            toast.success('System seeded successfully!');
            fetchCategories();
        } catch (error) {
            toast.dismiss();
            toast.error('Seeding failed');
        }
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                
                // Flexible Header Matching
                const formattedData = data.map(item => {
                    // Find name from possible keys
                    const nameKey = Object.keys(item).find(k => k.toLowerCase().replace(/[\s_]/g, '') === 'subcategory' || k.toLowerCase() === 'name');
                    const parentKey = Object.keys(item).find(k => k.toLowerCase().replace(/[\s_]/g, '') === 'maincategory' || k.toLowerCase().includes('parent'));

                    return {
                        name: item[nameKey] || '',
                        parentName: item[parentKey] || null,
                        image: '',
                        description: ''
                    };
                }).filter(item => item.name); // Filter out empty rows

                const res = await categoryApi.bulkUpload(formattedData);
                toast.success(res.message);
                fetchCategories();
            } catch (error) {
                toast.error('Error parsing Excel file');
                console.error(error);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null; // Reset input
    };

    const downloadTemplate = () => {
        const templateData = [
            { Name: 'Dry Cleaning', Image: 'https://example.com/img1.jpg', ParentName: '', Description: 'Professional dry cleaning' },
            { Name: 'Shirt Cleaning', Image: 'https://example.com/img2.jpg', ParentName: 'Dry Cleaning', Description: 'Cotton shirts special' }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Category_Upload_Template.xlsx");
    };

    const mainCategories = categories.filter(c => !c.parentCategory);

    return (
        <div className="space-y-8 p-6">
            <PageHeader 
                title="Category Management" 
                actions={[
                    {
                        label: "Force Seed Data",
                        icon: Save,
                        onClick: handleForceSeed,
                        variant: 'white'
                    },
                    {
                        label: "Clear All",
                        icon: Trash2,
                        onClick: handleClearAll,
                        variant: 'rose'
                    },
                    {
                        label: "Template",
                        icon: FileDown,
                        onClick: downloadTemplate,
                        variant: 'white'
                    },
                    {
                        label: "Excel Upload",
                        icon: FileUp,
                        onClick: () => document.getElementById('excel-upload').click(),
                        variant: 'white'
                    },
                    {
                        label: "Add Category",
                        icon: Plus,
                        onClick: () => handleOpenModal(),
                        variant: 'primary'
                    }
                ]}
            />

            <input 
                id="excel-upload"
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                onChange={handleExcelUpload} 
            />

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mainCategories.map(category => (
                        <div key={category._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                            {category.image ? (
                                                <img src={category.image} className="w-full h-full object-cover rounded-2xl" alt="" />
                                            ) : (
                                                <Folder className="w-6 h-6 text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900">{category.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Category</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(category)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-black transition-all">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(category._id)} className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-slate-50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Sub Categories</p>
                                    {categories.filter(sub => sub.parentCategory?._id === category._id).map(sub => (
                                        <div key={sub._id} className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <ChevronRight size={14} className="text-slate-300" />
                                                <span className="text-xs font-bold text-slate-700">{sub.name}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleOpenModal(sub)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-black">
                                                    <Edit2 size={12} />
                                                </button>
                                                <button onClick={() => handleDelete(sub._id)} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => handleOpenModal({ parentCategory: category })}
                                        className="w-full py-3 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-black hover:text-black transition-all"
                                    >
                                        + Add Sub Category
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.form 
                            onSubmit={handleSubmit}
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[3rem] p-8 shadow-2xl space-y-6"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black tracking-tighter uppercase italic">
                                    {editingCategory ? 'Edit Category' : 'Add Category'}
                                </h3>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Category Name</label>
                                    <input 
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none"
                                        placeholder="e.g. Dry Cleaning"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Image URL</label>
                                    <input 
                                        value={formData.image}
                                        onChange={e => setFormData({...formData, image: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-black outline-none"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Parent Category (Optional)</label>
                                    <select 
                                        value={formData.parentCategory}
                                        onChange={e => setFormData({...formData, parentCategory: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-black"
                                    >
                                        <option value="">Main Category (No Parent)</option>
                                        {mainCategories.filter(c => c._id !== editingCategory?._id).map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description</label>
                                    <textarea 
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold h-24 outline-none focus:ring-2 focus:ring-black resize-none"
                                        placeholder="Brief details..."
                                    />
                                </div>
                            </div>

                            <button className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-black/20 transition-all">
                                {editingCategory ? 'UPDATE CATEGORY' : 'CREATE CATEGORY'}
                            </button>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CategoryManagement;
