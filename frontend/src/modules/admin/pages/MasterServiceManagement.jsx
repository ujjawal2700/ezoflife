import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { masterServiceApi, categoryApi, BASE_URL } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

const MasterServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState(null);
    const [vendorRates, setVendorRates] = useState([]);
    const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
    const [isLoadingRates, setIsLoadingRates] = useState(false);

    const autocompleteRef = useRef(null);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries
    });

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        icon: 'local_laundry_service',
        basePrice: 0,
        category: '',
        subCategory: '',
        targetAudience: 'both',
        tier: 'Essential',
        description: '',
        address: '',
        location: { lat: 0, lng: 0 },
        tags: ''
    });

    const [mainCategories, setMainCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);

    useEffect(() => {
        fetchServices();
        fetchInitialCategories();
    }, []);

    const fetchInitialCategories = async () => {
        try {
            const data = await categoryApi.getMain();
            setMainCategories(data);
        } catch (error) {
            console.error('Error fetching categories');
        }
    };

    const fetchSubCategories = async (parentId) => {
        if (!parentId) return;
        try {
            const data = await categoryApi.getSub(parentId);
            setSubCategories(data);
        } catch (error) {
            console.error('Error fetching sub-categories');
        }
    };

    const fetchServices = async () => {
        try {
            const masterData = await masterServiceApi.getAll();
            setServices(masterData.map(s => ({ ...s, isMaster: true })));
        } catch (err) {
            toast.error('Failed to fetch services');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (service = null) => {
        if (service) {
            setCurrentService(service);
            setFormData({
                name: service.name,
                icon: service.icon,
                basePrice: service.basePrice,
                category: service.category?._id || service.category || '',
                subCategory: service.subCategory?._id || service.subCategory || '',
                targetAudience: service.targetAudience || 'both',
                tier: service.tier || 'Essential',
                description: service.description || '',
                address: service.address || '',
                location: service.location || { lat: 0, lng: 0 },
                tags: (service.tags || []).join(', ')
            });
        } else {
            setCurrentService(null);
            setFormData({
                name: '',
                icon: 'local_laundry_service',
                basePrice: 0,
                category: '',
                subCategory: '',
                targetAudience: 'both',
                tier: 'Essential',
                description: '',
                address: '',
                location: { lat: 0, lng: 0 },
                tags: ''
            });
        }
        setIsModalOpen(true);
    };

    const onPlaceSelected = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry) {
                const newPos = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                setFormData(prev => ({
                    ...prev,
                    address: place.formatted_address,
                    location: newPos
                }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            };

            if (currentService) {
                await masterServiceApi.update(currentService._id, payload);
                toast.success('Service updated successfully');
            } else {
                await masterServiceApi.create(payload);
                toast.success('Service created successfully');
            }
            fetchServices();
            setIsModalOpen(false);
        } catch (err) {
            toast.error(err.message || 'Operation failed');
        }
    };

    const handleViewRates = async (service) => {
        setCurrentService(service);
        setIsLoadingRates(true);
        setIsRatesModalOpen(true);
        try {
            const data = await masterServiceApi.getVendorRates(service._id);
            setVendorRates(data);
        } catch (err) {
            toast.error('Failed to load vendor rates');
        } finally {
            setIsLoadingRates(false);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('CRITICAL: This will delete ALL master services. Are you sure?')) return;
        try {
            const response = await fetch(`${BASE_URL}/master-services/clear-all`, {
                method: 'DELETE'
            });
            if (response.ok) {
                toast.success('All services cleared');
                fetchServices();
            }
        } catch (err) {
            toast.error('Clear failed');
        }
    };

    const icons = ['local_laundry_service', 'dry_cleaning', 'iron', 'checkroom', 'eco', 'sanitizer'];
    const categories = ['General', 'Premium', 'Express', 'Industrial'];

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-body">
            <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 mb-2">Service Control</h1>
                    <p className="text-slate-500 text-sm font-medium">Manage global master service catalog</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={handleClearAll}
                        className="flex-1 md:flex-none bg-white border border-rose-100 text-rose-500 px-4 md:px-8 py-4 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm font-black">delete_sweep</span>
                        Clear All
                    </button>
                    <button 
                        className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 px-4 md:px-8 py-4 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm font-black">upload_file</span>
                        Upload
                    </button>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="w-full md:w-auto bg-primary text-white px-6 md:px-8 py-4 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm font-black">add</span>
                        Create Service
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service) => (
                        <motion.div 
                            layout
                            key={service._id}
                            className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-16 h-16 bg-primary/5 text-primary rounded-[1.5rem] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl">{service.icon}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                        onClick={() => handleOpenModal(service)}
                                        className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(service._id)}
                                        className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/10">
                                        {service.category?.name || 'General'}
                                    </span>
                                    {service.subCategory && (
                                        <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                                            {service.subCategory?.name}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">{service.name}</h3>
                                <p className="text-slate-400 text-[13px] font-bold line-clamp-2">{service.description || 'Professional laundry service template.'}</p>
                            </div>

                            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Admin Base Rate</span>
                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{service.basePrice}<span className="text-sm font-bold text-slate-300 ml-1">/{service.unit || 'kg'}</span></span>
                                </div>
                                <button 
                                    onClick={() => handleViewRates(service)}
                                    className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-all shadow-xl shadow-slate-900/10"
                                >
                                    Pricing Analytics
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Vendor Rates Modal */}
            <AnimatePresence>
                {isRatesModalOpen && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative"
                        >
                            <button 
                                onClick={() => setIsRatesModalOpen(false)}
                                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-2xl">{currentService?.icon}</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter text-slate-900">Vendor Pricing Analysis</h2>
                                    <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Service: {currentService?.name}</p>
                                </div>
                            </div>

                            {isLoadingRates ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Analyzing Market Rates...</p>
                                </div>
                            ) : vendorRates.length === 0 ? (
                                <div className="py-20 text-center space-y-3">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                        <span className="material-symbols-outlined text-[40px]">inventory_2</span>
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm">No vendors offering this service yet.</p>
                                </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto pr-4 space-y-4 no-scrollbar">
                                    {vendorRates.map((rate, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-primary/20 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                                                    <span className="material-symbols-outlined text-xl">storefront</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-sm">{rate.vendorName}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 tracking-wider whitespace-nowrap">{rate.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8 text-right">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Admin Base</span>
                                                    <span className="font-bold text-slate-500 line-through text-xs">₹{rate.adminRate}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Vendor Rate</span>
                                                    <span className="text-xl font-black text-slate-900 leading-none">₹{rate.vendorRate}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">Market Rate Intelligence System</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
                        >
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <h2 className="text-3xl font-black tracking-tighter text-slate-900 mb-8">
                                {currentService ? 'Edit Master Service' : 'New Master Service'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Name</label>
                                        <input 
                                            required
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-800"
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            placeholder="e.g. Wash & Steam Iron"
                                        />
                                    </div>

                                    {/* Google Maps Autocomplete */}
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Area / Hub Address</label>
                                        {isLoaded ? (
                                            <Autocomplete
                                                onLoad={(ref) => (autocompleteRef.current = ref)}
                                                onPlaceChanged={onPlaceSelected}
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Enter hub or service area address..."
                                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-800"
                                                    value={formData.address}
                                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                />
                                            </Autocomplete>
                                        ) : (
                                            <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl animate-pulse text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Loading Maps Engine...
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Base Rate</label>
                                        <input 
                                            required
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-800"
                                            value={formData.basePrice}
                                            onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})}
                                            placeholder="50"
                                        />
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                        <CustomDropdown 
                                            options={Array.from(new Map(mainCategories.map(c => [c.name, c])).values()).map(c => ({ label: c.name, value: c._id }))}
                                            value={formData.category}
                                            onChange={(val) => {
                                                setFormData({...formData, category: val, subCategory: ''});
                                                fetchSubCategories(val);
                                            }}
                                            placeholder="Select Category"
                                        />
                                    </div>
                                    <div className="space-y-2 relative">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub Category</label>
                                        <CustomDropdown 
                                            options={Array.from(new Map(subCategories.map(c => [c.name, c])).values()).map(c => ({ label: c.name, value: c._id }))}
                                            value={formData.subCategory}
                                            onChange={(val) => setFormData({...formData, subCategory: val})}
                                            placeholder="Select Sub Category"
                                            disabled={!formData.category}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Audience</label>
                                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                                            {['individual', 'retail', 'both'].map(target => (
                                                <button
                                                    key={target}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, targetAudience: target }))}
                                                    className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${formData.targetAudience === target ? 'bg-white text-primary shadow-md' : 'text-slate-400 opacity-60 hover:opacity-100'}`}
                                                >
                                                    {target}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Service Tier</label>
                                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                                            {['Essential', 'Heritage'].map(tier => (
                                                <button
                                                    key={tier}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, tier }))}
                                                    className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${formData.tier === tier ? 'bg-white text-primary shadow-md' : 'text-slate-400 opacity-60 hover:opacity-100'}`}
                                                >
                                                    {tier}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Icon Representation</label>
                                        <div className="flex flex-wrap gap-2">
                                            {icons.map(icon => (
                                                <button
                                                    key={icon}
                                                    type="button"
                                                    onClick={() => setFormData({...formData, icon})}
                                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formData.icon === icon ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                >
                                                    <span className="material-symbols-outlined">{icon}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                        <textarea 
                                            rows="3"
                                            className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-800 resize-none text-sm"
                                            value={formData.description}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                            placeholder="A brief explanation of the service scope..."
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                                >
                                    {currentService ? 'Save Changes' : 'Create Service'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CustomDropdown = ({ options, value, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white transition-all"
            >
                <span className={`font-bold text-sm ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className={`material-symbols-outlined text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[1050]" onClick={() => setIsOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[1100] max-h-60 overflow-y-auto no-scrollbar"
                        >
                            {options.map((opt) => (
                                <div 
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`p-4 text-sm font-bold cursor-pointer transition-all hover:bg-slate-50 ${value === opt.value ? 'bg-primary/5 text-primary' : 'text-slate-600'}`}
                                >
                                    {opt.label}
                                </div>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MasterServiceManagement;
