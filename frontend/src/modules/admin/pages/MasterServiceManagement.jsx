import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { masterServiceApi, categoryApi } from '../../../lib/api';
import { toast } from 'react-hot-toast';

const MasterServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        itemName: '',
        categoryId: '',
        basePrice: 0,
        discountedPrice: 0,
        unit: 'per_item',
        description: '',
        isActive: true,
        icon: 'local_laundry_service',
        tier: 'Essential',
        skuId: ''
    });

    const [categories, setCategories] = useState([]);
    const [selectedMain, setSelectedMain] = useState('');

    useEffect(() => {
        fetchServices();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await categoryApi.getAll();
            setCategories(data);
        } catch (error) {
            toast.error('Failed to load categories');
        }
    };

    const fetchServices = async () => {
        try {
            setIsLoading(true);
            const data = await masterServiceApi.getAll();
            setServices(data);
        } catch (err) {
            toast.error('Failed to fetch services');
        } finally {
            setIsLoading(false);
        }
    };

    const mainCategoryList = useMemo(() => {
        return Array.from(new Set(categories.map(c => c.mainCategory)));
    }, [categories]);

    const subCategoryList = useMemo(() => {
        return categories.filter(c => c.mainCategory === selectedMain);
    }, [categories, selectedMain]);

    const handleOpenModal = (service = null) => {
        if (service) {
            setCurrentService(service);
            setSelectedMain(service.categoryId?.mainCategory || '');
            setFormData({
                itemName: service.itemName,
                categoryId: service.categoryId?._id || '',
                basePrice: service.basePrice,
                discountedPrice: service.discountedPrice,
                unit: service.unit || 'per_item',
                description: service.description || '',
                isActive: service.isActive !== undefined ? service.isActive : true,
                icon: service.icon || 'local_laundry_service',
                tier: service.tier || 'Essential',
                skuId: service.skuId || ''
            });
        } else {
            setCurrentService(null);
            setSelectedMain('');
            setFormData({
                itemName: '',
                categoryId: '',
                basePrice: 0,
                discountedPrice: 0,
                unit: 'per_item',
                description: '',
                isActive: true,
                icon: 'local_laundry_service',
                tier: 'Essential',
                skuId: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentService) {
                await masterServiceApi.update(currentService._id, formData);
                toast.success('Service updated');
            } else {
                await masterServiceApi.create(formData);
                toast.success('Service created');
            }
            fetchServices();
            setIsModalOpen(false);
        } catch (err) {
            toast.error(err.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this service?')) return;
        try {
            await masterServiceApi.delete(id);
            toast.success('Deleted');
            fetchServices();
        } catch (err) {
            toast.error('Failed');
        }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-body">
            <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 mb-2">Master Services</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage normalized global service catalog</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleOpenModal()}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Service
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Main Category</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub Category</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-primary">Discounted</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {services.map((s) => (
                                    <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5 font-bold text-slate-800">{s.itemName}</td>
                                        <td className="px-6 py-5 text-sm text-slate-500 font-medium">{s.categoryId?.mainCategory || 'N/A'}</td>
                                        <td className="px-6 py-5 text-sm text-slate-500 font-medium">{s.categoryId?.subCategory || 'N/A'}</td>
                                        <td className="px-6 py-5 font-bold text-slate-400 line-through">₹{s.basePrice}</td>
                                        <td className="px-6 py-5 font-black text-slate-900">₹{s.discountedPrice}</td>
                                        <td className="px-6 py-5 uppercase text-[10px] font-black text-slate-400 tracking-wider">{s.unit?.replace('_', ' ')}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(s)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(s._id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
                        >
                            <h2 className="text-2xl font-black text-slate-900 mb-8">{currentService ? 'Edit Service' : 'New Service'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Item Name</label>
                                    <input 
                                        required
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold"
                                        value={formData.itemName}
                                        onChange={e => setFormData({...formData, itemName: e.target.value})}
                                        placeholder="e.g. Silk Saree Wash"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Main Category</label>
                                        <select 
                                            required
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white outline-none font-bold appearance-none"
                                            value={selectedMain}
                                            onChange={e => {
                                                setSelectedMain(e.target.value);
                                                setFormData({...formData, categoryId: ''});
                                            }}
                                        >
                                            <option value="">Select Main</option>
                                            {mainCategoryList.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub Category</label>
                                        <select 
                                            required
                                            disabled={!selectedMain}
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white outline-none font-bold appearance-none disabled:opacity-50"
                                            value={formData.categoryId}
                                            onChange={e => setFormData({...formData, categoryId: e.target.value})}
                                        >
                                            <option value="">Select Sub</option>
                                            {subCategoryList.map(s => <option key={s._id} value={s._id}>{s.subCategory}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Price</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white outline-none font-bold"
                                            value={formData.basePrice}
                                            onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Discounted Price</label>
                                        <input 
                                            type="number"
                                            required
                                            className="w-full bg-primary/5 border border-primary/10 p-4 rounded-2xl focus:bg-white outline-none font-bold text-primary"
                                            value={formData.discountedPrice}
                                            onChange={e => setFormData({...formData, discountedPrice: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                                    <div className="flex gap-2">
                                        {['per_item', 'per_kg'].map(u => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setFormData({...formData, unit: u})}
                                                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.unit === u ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                            >
                                                {u.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] bg-primary text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        {currentService ? 'Save Changes' : 'Create Service'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MasterServiceManagement;
