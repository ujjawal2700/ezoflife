import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi, serviceApi } from '../../../lib/api';
import VendorHeader from '../components/VendorHeader';

const VendorMyServices = () => {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

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
            
            const mergedMap = new Map();

            approvedRegistrationServices.forEach(s => {
                const id = s.id || s._id;
                mergedMap.set(id, {
                    ...s,
                    id: id,
                    _id: id,
                    isFromRegistration: true,
                    approvalStatus: 'Approved',
                    active: s.active ?? true,
                    basePrice: s.basePrice || s.vendorRate || 0
                });
            });

            masterRes.forEach(s => {
                const id = s._id || s.id;
                mergedMap.set(id, {
                    ...s,
                    id: id,
                    _id: id,
                    isFromRegistration: false,
                    approvalStatus: s.approvalStatus || 'Pending',
                    active: s.status === 'Active',
                    basePrice: s.basePrice || 0
                });
            });
            
            setServices(Array.from(mergedMap.values()));
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'Manage My Services | Spinzyt';
        if (vendorId) {
            fetchConfig();
        }
    }, [vendorId]);

    const toggleService = async (idx) => {
        const newServices = [...services];
        const target = newServices[idx];
        
        if (target.approvalStatus !== 'Approved') {
            alert('This service is waiting for Admin approval. You cannot activate it yet.');
            return;
        }

        const newStatus = !target.active;
        target.active = newStatus;
        setServices(newServices);

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

    const updatePrice = (idx, price) => {
        const newServices = [...services];
        newServices[idx].basePrice = Number(price);
        setServices(newServices);
    };

    const handleUpdate = async () => {
        if (!vendorId) return;

        try {
            setLoading(true);
            const profile = await authApi.getProfile(vendorId);
            
            const mappedServicesForProfile = services.map(s => ({
                id: s._id || s.id,
                name: s.name,
                vendorRate: Number(s.basePrice),
                adminRate: Number(s.basePrice),
                status: s.approvalStatus === 'Approved' ? 'approved' : 'pending',
                icon: s.icon,
                normalTime: s.normalTime || '',
                expressTime: s.expressTime || ''
            }));

            const updatedShopDetails = {
                ...(profile.shopDetails || {}),
                services: mappedServicesForProfile
            };
            await authApi.updateProfile(vendorId, { shopDetails: updatedShopDetails });

            const syncPromises = services.map(service => {
                const sId = service._id || service.id;
                if (service.vendorId || service.isMaster === false) {
                    return serviceApi.update(sId, { 
                        status: service.active ? 'Active' : 'Inactive',
                        basePrice: Number(service.basePrice)
                    });
                }
                return null;
            }).filter(p => p !== null);

            if (syncPromises.length > 0) {
                await Promise.all(syncPromises);
            }

            alert('Services updated successfully!');
            fetchConfig();
        } catch (error) {
            console.error('Update Services Error:', error);
            alert('Failed to update services');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-50 text-slate-900 min-h-screen pb-40 font-sans"
        >
            <main className="max-w-xl mx-auto px-6 pt-10 space-y-10">
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-4">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                        </button>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-950 uppercase leading-none">My Services.</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Rate Card Management</p>
                    </div>
                    <button 
                        onClick={() => navigate('/vendor/services/add')}
                        className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </header>

                <section className="space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Catalog...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {services.map((service, idx) => {
                                const aggregatorFee = Math.round(service.basePrice * 0.15);
                                const netEarnings = service.basePrice - aggregatorFee;
                                const isPending = service.approvalStatus === 'Pending';

                                return (
                                    <div key={service.id || service._id} className="bg-white p-7 rounded-[2.8rem] border border-slate-100 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${service.active && !isPending ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-300'}`}>
                                                    <span className="material-symbols-outlined text-2xl">{service.icon || 'local_laundry_service'}</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 tracking-tight">{service.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {isPending ? (
                                                            <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Awaiting Admin</p>
                                                        ) : (
                                                            <p className={`text-[9px] font-black uppercase tracking-widest ${service.active ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                                {service.active ? 'Active' : 'Hidden'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div 
                                                onClick={() => !isPending && toggleService(idx)}
                                                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isPending ? 'bg-slate-100' : (service.active ? 'bg-slate-900' : 'bg-slate-200 cursor-pointer')}`}
                                            >
                                                <motion.div 
                                                    animate={{ x: (service.active && !isPending) ? 26 : 4 }}
                                                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Price Per Unit (₹)</p>
                                                <input 
                                                    type="number"
                                                    value={service.basePrice || 0}
                                                    onChange={(e) => updatePrice(idx, e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-black text-slate-900 focus:bg-white border-2 border-transparent focus:border-slate-100 transition-all outline-none"
                                                />
                                            </div>
                                            <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-center border border-slate-100">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">You Earn (85%)</p>
                                                <p className="text-xl font-black text-emerald-600 tracking-tighter mt-1">₹{netEarnings}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!loading && services.length > 0 && (
                        <button 
                            onClick={handleUpdate}
                            className="w-full py-5 rounded-[2.5rem] bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all"
                        >
                            Save Rate Card Changes
                        </button>
                    )}
                </section>
            </main>
        </motion.div>
    );
};

export default VendorMyServices;
