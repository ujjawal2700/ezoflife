import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi, serviceApi, promotionApi, BASE_URL } from '../../../lib/api';
import VendorHeader from '../components/VendorHeader';
import Lottie from 'lottie-react';
import spinLogoAnimation from '../../../assets/spin_logo_text.json';

const VendorMyServices = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newService, setNewService] = useState({
        name: '',
        category: '',
        subCategory: '',
        price: '',
        description: '',
        unit: 'Per Kg'
    });

    const getVendorId = () => {
        const keys = ['user', 'vendorData', 'userData', 'auth_user', 'vendor'];
        for (const key of keys) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const data = JSON.parse(raw);
                const id = data?._id || data?.id || data?.user?._id || data?.user?.id || data?.uid;
                if (id) return id;
            } catch (e) { continue; }
        }
        return null;
    };

    const vendorId = getVendorId();

    const fetchConfig = async () => {
        if (!vendorId) return;
        try {
            setLoading(true);
            const masterRes = await serviceApi.getAll({ vendorId });
            const profileRes = await authApi.getProfile(vendorId);
            const registrationServices = profileRes.shopDetails?.services || [];
            
            const approvedRegistrationServices = registrationServices.filter(s => s.status === 'approved');
            
            // 1. Fetch all Master Services to map names, categories, and subcategories
            let masterServicesMap = {};
            try {
                const masterServicesRes = await fetch(`${BASE_URL}/master-services`);
                if (masterServicesRes.ok) {
                    const masterServicesList = await masterServicesRes.json();
                    masterServicesList.forEach(ms => {
                        masterServicesMap[ms._id] = {
                            itemName: ms.itemName,
                            category: ms.categoryId?.mainCategory || 'Laundry',
                            subCategory: ms.categoryId?.subCategory || 'General',
                            icon: ms.icon || 'local_laundry_service'
                        };
                    });
                }
            } catch (err) {
                console.error('Error fetching master services for fallback:', err);
            }

            const lat = profileRes?.location?.lat;
            const lng = profileRes?.location?.lng;
            let pricingMap = {};
            
            if (lat && lng && lat !== 0 && lng !== 0) {
                try {
                    const geoRes = await fetch(`${BASE_URL}/geofence/check-availability?lat=${lat}&lng=${lng}`);
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        if (geoData.available && geoData.areaId) {
                            const pricingRes = await fetch(`${BASE_URL}/master-pricing?fenceId=${geoData.areaId}&limit=10000`);
                            if (pricingRes.ok) {
                                const pricingData = await pricingRes.json();
                                (pricingData.data || []).forEach(item => {
                                    if (item.serviceId) {
                                        pricingMap[item.serviceId._id] = {
                                            areaMultiplier: item.areaMultiplier !== undefined ? item.areaMultiplier : 1,
                                            surgeMultiplier: item.surgeMultiplier !== undefined ? item.surgeMultiplier : 1,
                                            heritageMultiplier: item.heritageMultiplier !== undefined ? item.heritageMultiplier : 1,
                                            category: item.categoryId?.mainCategory || '',
                                            subCategory: item.categoryId?.subCategory || '',
                                            itemName: item.serviceId.itemName,
                                            skuId: item.serviceId.skuId,
                                            icon: item.serviceId.icon
                                        };
                                    }
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching regional pricing configurations:', err);
                }
            }

            const mergedMap = new Map();

            approvedRegistrationServices.forEach(s => {
                const id = s.id || s._id;
                const pricingInfo = pricingMap[id] || {};
                const msInfo = masterServicesMap[id] || {};

                const resolvedName = msInfo.itemName || pricingInfo.itemName || s.name || `Service ${id.slice(-4)}`;
                const resolvedCategory = msInfo.category || pricingInfo.category || 'Laundry';
                const resolvedSubCategory = msInfo.subCategory || pricingInfo.subCategory || 'General';
                const resolvedIcon = s.icon || msInfo.icon || pricingInfo.icon || 'local_laundry_service';

                mergedMap.set(id, {
                    ...s,
                    id: id,
                    _id: id,
                    isFromRegistration: true,
                    approvalStatus: 'Approved',
                    active: s.active ?? true,
                    basePrice: s.basePrice || s.vendorRate || 0,
                    name: resolvedName,
                    category: resolvedCategory,
                    subCategory: resolvedSubCategory,
                    icon: resolvedIcon,
                    pricingInfo
                });
            });

            masterRes.forEach(s => {
                const id = s._id || s.id;
                const pricingInfo = pricingMap[id] || {};
                const msInfo = masterServicesMap[id] || {};

                const resolvedName = s.name || msInfo.itemName || pricingInfo.itemName || `Service ${id.slice(-4)}`;
                const resolvedCategory = s.category || msInfo.category || pricingInfo.category || 'Laundry';
                const resolvedSubCategory = s.subCategory || msInfo.subCategory || pricingInfo.subCategory || 'General';
                const resolvedIcon = s.icon || msInfo.icon || pricingInfo.icon || 'local_laundry_service';

                mergedMap.set(id, {
                    ...s,
                    id: id,
                    _id: id,
                    isFromRegistration: false,
                    approvalStatus: s.approvalStatus || 'Pending',
                    adminMessage: s.adminMessage || '',
                    active: s.status === 'Active',
                    basePrice: s.basePrice || 0,
                    name: resolvedName,
                    category: resolvedCategory,
                    subCategory: resolvedSubCategory,
                    icon: resolvedIcon,
                    pricingInfo
                });
            });
            
            setServices(Array.from(mergedMap.values()));
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 5000);
        }
    };

    useEffect(() => {
        document.title = 'Manage My Services | Spinzyt';
        if (vendorId) {
            fetchConfig();
        }
    }, [vendorId]);

    const toggleService = async (idx) => {
        if (!editMode) return;
        const newServices = [...services];
        const target = newServices[idx];
        
        if (target.approvalStatus !== 'Approved') {
            alert(target.approvalStatus === 'Rejected' ? 'This service was rejected by the Admin.' : 'This service is waiting for Admin approval. You cannot activate it yet.');
            return;
        }

        const newStatus = !target.active;
        target.active = newStatus;
        setServices(newServices);

        if (newStatus === false) {
            toast('If you make this service inactive, you will not receive notifications for this service from the customer side.', {
                icon: '⚠️',
                duration: 6000
            });
        }

        const sId = target._id || target.id;
        try {
            if (!target.isFromRegistration) {
                await serviceApi.update(sId, { 
                    status: newStatus ? 'Active' : 'Inactive'
                });
            }
        } catch (err) {
            console.error(`Failed to sync ${target.name}:`, err);
        }
    };

    const handleCreateService = async (e) => {
        e.preventDefault();
        if (!newService.name || !newService.category || !newService.subCategory || !newService.price) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            setCreating(true);
            await serviceApi.create({
                name: newService.name,
                category: newService.category,
                subCategory: newService.subCategory,
                basePrice: Number(newService.price),
                description: newService.description,
                unit: newService.unit,
                vendorId: vendorId,
                status: 'Inactive',
                approvalStatus: 'Pending',
                isMaster: false
            });

            toast.success('Custom service created and submitted to Admin for approval!');
            setShowAddModal(false);
            setNewService({
                name: '',
                category: '',
                subCategory: '',
                price: '',
                description: '',
                unit: 'Per Kg'
            });
            fetchConfig(); // Refresh services
        } catch (err) {
            console.error('Failed to create custom service:', err);
            toast.error('Error creating custom service');
        } finally {
            setCreating(false);
        }
    };

    const updatePrice = (idx, price) => {
        const newServices = [...services];
        newServices[idx].basePrice = Number(price);
        setServices(newServices);
    };

    const handleSaveSingleRow = async (idx) => {
        if (!vendorId) return;
        const targetService = services[idx];

        try {
            setLoading(true);
            const profile = await authApi.getProfile(vendorId);
            
            let currentServices = profile.shopDetails?.services || [];
            const sId = targetService._id || targetService.id;
            const existingIdx = currentServices.findIndex(s => (s.id === sId || s._id === sId));
            
            const updatedServiceForProfile = {
                id: sId,
                name: targetService.name,
                vendorRate: Number(targetService.basePrice),
                adminRate: Number(targetService.basePrice),
                status: targetService.approvalStatus === 'Approved' ? 'approved' : 'pending',
                icon: targetService.icon,
                active: targetService.active,
                normalTime: targetService.normalTime || '',
                expressTime: targetService.expressTime || ''
            };

            if (existingIdx !== -1) {
                currentServices[existingIdx] = updatedServiceForProfile;
            } else {
                currentServices.push(updatedServiceForProfile);
            }

            const updatedShopDetails = {
                ...(profile.shopDetails || {}),
                services: currentServices
            };

            await authApi.updateProfile(vendorId, { shopDetails: updatedShopDetails });

            if (targetService.vendorId || targetService.isMaster === false) {
                await serviceApi.update(sId, { 
                    status: targetService.active ? 'Active' : 'Inactive',
                    basePrice: Number(targetService.basePrice)
                });
            }

            toast.success(`${targetService.name} updated successfully!`);
            fetchConfig();
        } catch (error) {
            console.error('Update Single Service Error:', error);
            toast.error('Failed to update service');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-900 min-h-screen pb-40 font-sans"
        >
            <main className="max-w-6xl mx-auto px-6 pt-2 space-y-6">
                {loading ? (
                    <>
                        <header className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
                            <div className="flex items-center gap-3">
                                <div className="w-[80px] h-10 rounded-xl bg-slate-200 animate-pulse"></div>
                                <div className="w-[80px] h-10 rounded-xl bg-slate-200 animate-pulse"></div>
                            </div>
                        </header>
                        <section className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[950px]">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="p-4 w-28"><div className="h-3 w-16 bg-slate-200 rounded mx-auto"></div></th>
                                                <th className="p-4"><div className="h-3 w-24 bg-slate-200 rounded"></div></th>
                                                <th className="p-4"><div className="h-3 w-20 bg-slate-200 rounded"></div></th>
                                                <th className="p-4"><div className="h-3 w-20 bg-slate-200 rounded"></div></th>
                                                <th className="p-4 w-28"><div className="h-3 w-20 bg-slate-200 rounded"></div></th>
                                                <th className="p-4"><div className="h-3 w-24 bg-slate-200 rounded ml-auto"></div></th>
                                                <th className="p-4"><div className="h-3 w-24 bg-slate-200 rounded ml-auto"></div></th>
                                                <th className="p-4"><div className="h-3 w-24 bg-slate-200 rounded ml-auto"></div></th>
                                                <th className="p-4"><div className="h-3 w-24 bg-slate-200 rounded ml-auto"></div></th>
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
                                                        <div className="w-24 h-3 bg-slate-100 rounded"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-24 h-3 bg-slate-100 rounded"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-full h-8 bg-slate-100 rounded-xl"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-12 h-3 bg-slate-100 rounded ml-auto"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-12 h-3 bg-slate-100 rounded ml-auto"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-12 h-3 bg-slate-100 rounded ml-auto"></div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="w-12 h-3 bg-slate-100 rounded ml-auto"></div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </>
                ) : (
                    <>
                        <header className="flex items-center justify-between">
                            <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 shadow-sm transition-all">
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            </button>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setShowAddModal(true)}
                                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-center min-w-[80px] shadow-md shadow-slate-900/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest"
                                >
                                    Create
                                </button>
                                <button 
                                    onClick={() => setEditMode(!editMode)}
                                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-center min-w-[80px] shadow-md shadow-slate-900/20 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest"
                                >
                                    {editMode ? 'Cancel Edit' : 'Edit'}
                                </button>
                            </div>
                        </header>

                        <section className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[950px]">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center w-28">Status</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Service Name</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Category</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Sub Category</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">Base Price (₹)</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Essential Normal</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Essential Express</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Heritage Normal</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Heritage Express</th>
                                                {editMode && (
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center w-28">Action</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {services.map((service, idx) => {
                                                const pricingInfo = service.pricingInfo || {};
                                                const areaMultiplier = pricingInfo.areaMultiplier !== undefined ? pricingInfo.areaMultiplier : 1;
                                                const surgeMultiplier = pricingInfo.surgeMultiplier !== undefined ? pricingInfo.surgeMultiplier : 1;
                                                const heritageMultiplier = pricingInfo.heritageMultiplier !== undefined ? pricingInfo.heritageMultiplier : 1;

                                                const basePrice = service.basePrice || 0;
                                                const baseNormal = Math.round(basePrice * areaMultiplier);
                                                const baseExpress = Math.round(basePrice * areaMultiplier * surgeMultiplier);
                                                const heritageNormal = Math.round(basePrice * areaMultiplier * heritageMultiplier);
                                                const heritageExpress = Math.round(basePrice * areaMultiplier * heritageMultiplier * surgeMultiplier);
                                                
                                                const isPending = service.approvalStatus === 'Pending';
                                                const isRejected = service.approvalStatus === 'Rejected';

                                                return (
                                                    <tr key={service.id || service._id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {isPending ? (
                                                                    <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded uppercase tracking-wider">Awaiting Approval</span>
                                                                ) : isRejected ? (
                                                                    <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded uppercase tracking-wider border border-rose-100">Rejected</span>
                                                                ) : (
                                                                    <div 
                                                                        onClick={() => toggleService(idx)}
                                                                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${!editMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${service.active ? 'bg-slate-900' : 'bg-slate-200'}`}
                                                                    >
                                                                        <motion.div 
                                                                            animate={{ x: service.active ? 22 : 2 }}
                                                                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{service.name}</span>
                                                                </div>
                                                                {service.adminMessage && (
                                                                    <div className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm w-fit mt-1 border ${
                                                                        isRejected 
                                                                            ? 'bg-rose-50 text-rose-500 border-rose-100' 
                                                                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                    }`}>
                                                                        Msg: {service.adminMessage}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                            {service.category}
                                                        </td>
                                                        <td className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                            {service.subCategory}
                                                        </td>
                                                        <td className="p-4">
                                                            <input 
                                                                type="number"
                                                                value={service.basePrice || 0}
                                                                onChange={(e) => updatePrice(idx, e.target.value)}
                                                                disabled={!editMode}
                                                                className={`w-full px-3 py-2 rounded-xl text-xs font-black text-slate-900 border outline-none transition-all ${!editMode ? 'bg-transparent border-transparent' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-300'}`}
                                                            />
                                                        </td>
                                                        <td className="p-4 text-xs font-bold text-slate-700 text-right">₹{baseNormal}</td>
                                                        <td className="p-4 text-xs font-bold text-slate-700 text-right">₹{baseExpress}</td>
                                                        <td className="p-4 text-xs font-bold text-slate-700 text-right">₹{heritageNormal}</td>
                                                        <td className="p-4 text-xs font-bold text-slate-700 text-right">₹{heritageExpress}</td>
                                                        {editMode && (
                                                            <td className="p-4 text-center">
                                                                <button 
                                                                    onClick={() => handleSaveSingleRow(idx)}
                                                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md shadow-slate-900/10 active:scale-95"
                                                                >
                                                                    Save
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </>
                )}

            </main>

            <AnimatePresence>
                {showAddModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white text-slate-900 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col space-y-6 overflow-hidden relative"
                        >
                            {/* Close Button */}
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors hover:scale-105 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-950 leading-none">Add Service</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submit custom service for admin approval</p>
                            </div>

                            <form onSubmit={handleCreateService} className="space-y-4 text-left">
                                {/* Item Name */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Name</label>
                                    <input 
                                        type="text"
                                        required
                                        value={newService.name}
                                        onChange={e => setNewService({ ...newService, name: e.target.value })}
                                        placeholder="e.g. Premium Silk Coat"
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                {/* Category & Subcategory Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                                        <input 
                                            type="text"
                                            required
                                            value={newService.category}
                                            onChange={e => setNewService({ ...newService, category: e.target.value })}
                                            placeholder="e.g. Dry Cleaning"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Sub Category</label>
                                        <input 
                                            type="text"
                                            required
                                            value={newService.subCategory}
                                            onChange={e => setNewService({ ...newService, subCategory: e.target.value })}
                                            placeholder="e.g. Winter Wear"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                {/* Price & Unit Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Price (₹)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">₹</span>
                                            <input 
                                                type="number"
                                                required
                                                min="0"
                                                value={newService.price}
                                                onChange={e => setNewService({ ...newService, price: e.target.value })}
                                                placeholder="0.00"
                                                className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Unit</label>
                                        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-2xl gap-1 h-[48px]">
                                            <button 
                                                type="button"
                                                onClick={() => setNewService({ ...newService, unit: 'Per Kg' })}
                                                className={`flex-1 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${newService.unit === 'Per Kg' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}
                                            >
                                                Per Kg
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setNewService({ ...newService, unit: 'Per Piece' })}
                                                className={`flex-1 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${newService.unit === 'Per Piece' ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}
                                            >
                                                Per Piece
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                                    <textarea 
                                        rows="2"
                                        value={newService.description}
                                        onChange={e => setNewService({ ...newService, description: e.target.value })}
                                        placeholder="Enter service details, care instructions, etc."
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300 resize-none"
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button 
                                        type="submit"
                                        disabled={creating}
                                        className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-950/15 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                                    >
                                        {creating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[16px]">add</span>
                                                <span>Create & Submit Service</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default VendorMyServices;
