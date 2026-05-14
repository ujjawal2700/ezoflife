import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { masterServiceApi, categoryApi } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { 
    Plus, Edit2, Trash2, X, Download, Filter, Search, Settings, 
    MoreHorizontal, Layers, Tag, Clock, Weight, Percent, Zap
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';

const MasterServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedMain, setSelectedMain] = useState('');

    const [formData, setFormData] = useState({
        itemName: '',
        categoryId: '',
        skuId: '',
        avgWeight: '0.5',
        seasonality: 'All Season',
        estimateTAT: '48 Hours',
        expressMultiplier: 2,
        gst: 5,
        basePrice: 0,
        discountedPrice: 0,
        unit: 'per_item',
        isActive: true,
        serviceType: 'normal'
    });

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
                skuId: service.skuId || '',
                avgWeight: service.avgWeight || '0.5',
                seasonality: service.seasonality || 'All Season',
                estimateTAT: service.estimateTAT || '48 Hours',
                expressMultiplier: service.expressMultiplier || 2,
                gst: service.gst || 5,
                basePrice: service.basePrice,
                discountedPrice: service.discountedPrice,
                unit: service.unit || 'per_item',
                isActive: service.isActive !== undefined ? service.isActive : true,
                serviceType: service.serviceType || 'normal'
            });
        } else {
            setCurrentService(null);
            setSelectedMain('');
            setFormData({
                itemName: '',
                categoryId: '',
                skuId: '',
                avgWeight: '0.5',
                seasonality: 'All Season',
                estimateTAT: '48 Hours',
                expressMultiplier: 2,
                gst: 5,
                basePrice: 0,
                discountedPrice: 0,
                unit: 'per_item',
                isActive: true,
                serviceType: 'normal'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentService) {
                await masterServiceApi.update(currentService._id, formData);
                toast.success('SKU updated');
            } else {
                await masterServiceApi.create(formData);
                toast.success('New SKU created');
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

    const columns = useMemo(() => [
        {
            header: 'SKU ID',
            key: 'skuId',
            render: (val) => (
                <span className="font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-sm border border-slate-100 text-[10px]">
                    {val || '—'}
                </span>
            )
        },
        {
            header: 'Item Name',
            key: 'itemName',
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 uppercase tracking-tight">{val}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{row.categoryId?.mainCategory}</span>
                </div>
            )
        },
        {
            header: 'Weight',
            key: 'avgWeight',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                    <Weight size={10} className="text-slate-300" />
                    <span>{val || '0.5'} KG</span>
                </div>
            )
        },
        {
            header: 'Est. TAT',
            key: 'estimateTAT',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                    <Clock size={10} className="text-slate-300" />
                    <span>{val || '48 Hours'}</span>
                </div>
            )
        },
        {
            header: 'GST',
            key: 'gst',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                    <Percent size={10} className="text-slate-300" />
                    <span>{val || '5'}%</span>
                </div>
            )
        },
        {
            header: 'Express',
            key: 'expressMultiplier',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                    <Zap size={10} className="text-amber-400" />
                    <span>{val || '2'}x</span>
                </div>
            )
        },
        {
            header: 'Base Price',
            key: 'basePrice',
            render: (val) => <span className="font-bold text-slate-400 line-through">₹{val}</span>
        },
        {
            header: 'Discount Price',
            key: 'discountedPrice',
            render: (val) => <span className="font-black text-slate-900">₹{val}</span>
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
                title="Global SKU Registry" 
                actions={[
                    {
                        label: "Bulk Upload",
                        icon: Download,
                        onClick: () => toast.success('SKU Excel Mapping Tool Initiated'),
                        variant: 'secondary'
                    },
                    {
                        label: "Add New SKU",
                        icon: Plus,
                        onClick: () => handleOpenModal(),
                        variant: 'primary'
                    }
                ]}
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                <DataGrid 
                    title="Master Service Catalog"
                    columns={columns}
                    data={services}
                    loading={isLoading}
                />
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                        <motion.form 
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-2xl rounded-sm p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar border border-slate-200"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center rounded-sm">
                                        <Settings size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">{currentService ? 'Edit SKU Configuration' : 'Register New SKU'}</h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Master Catalog Engine</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {/* Left Column: Identification */}
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">SKU ID (Excel PK)</label>
                                        <input 
                                            required
                                            value={formData.skuId}
                                            onChange={e => setFormData({...formData, skuId: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none"
                                            placeholder="e.g. SKU-1001"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Item Name</label>
                                        <input 
                                            required
                                            value={formData.itemName}
                                            onChange={e => setFormData({...formData, itemName: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none"
                                            placeholder="e.g. Cotton Saree"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Main Category</label>
                                            <select 
                                                required
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none appearance-none cursor-pointer"
                                                value={selectedMain}
                                                onChange={e => {
                                                    setSelectedMain(e.target.value);
                                                    setFormData({...formData, categoryId: ''});
                                                }}
                                            >
                                                <option value="">Select</option>
                                                {mainCategoryList.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Sub Category</label>
                                            <select 
                                                required
                                                disabled={!selectedMain}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none appearance-none disabled:opacity-50 cursor-pointer"
                                                value={formData.categoryId}
                                                onChange={e => setFormData({...formData, categoryId: e.target.value})}
                                            >
                                                <option value="">Select</option>
                                                {subCategoryList.map(s => <option key={s._id} value={s._id}>{s.subCategory}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Avg Weight (KG)</label>
                                            <input 
                                                value={formData.avgWeight}
                                                onChange={e => setFormData({...formData, avgWeight: e.target.value})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Estimate TAT</label>
                                            <input 
                                                value={formData.estimateTAT}
                                                onChange={e => setFormData({...formData, estimateTAT: e.target.value})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Pricing & Logistics */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Express Mult.</label>
                                            <input 
                                                type="number" step="0.1"
                                                value={formData.expressMultiplier}
                                                onChange={e => setFormData({...formData, expressMultiplier: parseFloat(e.target.value)})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">GST (%)</label>
                                            <input 
                                                type="number"
                                                value={formData.gst}
                                                onChange={e => setFormData({...formData, gst: parseFloat(e.target.value)})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Global Base Price</label>
                                        <input 
                                            type="number"
                                            required
                                            value={formData.basePrice}
                                            onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-black text-slate-900 outline-none focus:border-slate-900"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block ml-1">Global Discounted Price</label>
                                        <input 
                                            type="number"
                                            required
                                            value={formData.discountedPrice}
                                            onChange={e => setFormData({...formData, discountedPrice: parseFloat(e.target.value)})}
                                            className="w-full px-4 py-3 bg-slate-900 text-white rounded-sm text-[11px] font-black outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Seasonality</label>
                                        <input 
                                            value={formData.seasonality}
                                            onChange={e => setFormData({...formData, seasonality: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 pt-2">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox"
                                                id="isActive"
                                                checked={formData.isActive}
                                                onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                                className="w-4 h-4 rounded-sm border-slate-300 text-slate-900 focus:ring-slate-900"
                                            />
                                            <label htmlFor="isActive" className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-12 pt-8 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 rounded-sm font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-[2] bg-slate-900 text-white py-4 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-black transition-all"
                                >
                                    {currentService ? 'Commit Changes' : 'Register SKU'}
                                </button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MasterServiceManagement;
