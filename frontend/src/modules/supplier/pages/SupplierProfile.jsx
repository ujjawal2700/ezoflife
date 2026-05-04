import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../../../lib/api';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const SupplierProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: ['drawing', 'places', 'geometry']
    });

    const [autocomplete, setAutocomplete] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSection, setEditSection] = useState(null); // 'business' or 'bank'
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const storedUser = JSON.parse(localStorage.getItem('user') || localStorage.getItem('supplierData') || '{}');
                const userId = storedUser.id || storedUser._id;
                
                if (!userId) {
                    navigate('/user/auth');
                    return;
                }

                const data = await authApi.getProfile(userId);
                setUser(data);
            } catch (err) {
                console.error('Profile fetch error:', err);
                toast.error('Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleEditClick = (section) => {
        setEditSection(section);
        if (section === 'business') {
            const addrParts = (user.supplierDetails?.address || '').split(', ').filter(p => p !== 'undefined' && p !== '');
            setFormData({
                businessName: user.supplierDetails?.businessName || '',
                phone: user.phone || '',
                address_shop: addrParts[0] || '',
                address_area: addrParts[1] || '',
                address_landmark: addrParts[2] || '',
                address_city: user.supplierDetails?.city || '',
                address_pincode: user.supplierDetails?.pincode || '',
                gst: user.supplierDetails?.gst || '',
                location: user.location || null
            });
        } else if (section === 'bank') {
            setFormData({
                accountHolderName: user.bankDetails?.accountHolderName || '',
                accountNumber: user.bankDetails?.accountNumber || '',
                ifscCode: user.bankDetails?.ifscCode || '',
                bankName: user.bankDetails?.bankName || ''
            });
        }
        setIsEditModalOpen(true);
    };

    const handleSave = async () => {
        const loadingToast = toast.loading('Saving changes...');
        try {
            const userId = user.id || user._id;
            let payload = {};
            
            if (editSection === 'business') {
                const fullAddress = [formData.address_shop, formData.address_area, formData.address_landmark]
                    .filter(p => p && p.trim() !== '' && p !== 'undefined')
                    .join(', ');
                payload = {
                    phone: formData.phone,
                    supplierDetails: {
                        businessName: formData.businessName,
                        address: fullAddress,
                        city: formData.address_city,
                        pincode: formData.address_pincode,
                        gst: formData.gst
                    },
                    location: formData.location, // Save Lat/Lng
                    city: formData.address_city,
                    pincode: formData.address_pincode
                };
            } else {
                payload = {
                    bankDetails: {
                        accountHolderName: formData.accountHolderName,
                        accountNumber: formData.accountNumber,
                        ifscCode: formData.ifscCode,
                        bankName: formData.bankName
                    }
                };
            }

            const updatedUser = await authApi.updateProfile(userId, payload);
            setUser(updatedUser);
            setIsEditModalOpen(false);
            toast.success('Profile updated successfully', { id: loadingToast });
        } catch (err) {
            console.error('Save error:', err);
            toast.error('Failed to save changes', { id: loadingToast });
        }
    };

    const handleSignOut = () => {
        localStorage.clear();
        navigate('/user/auth');
        toast.success('Signed out successfully');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="bg-[#F8FAFC] text-slate-900 min-h-screen pb-40 font-sans">
            <main className="max-w-md mx-auto px-6 pt-10 space-y-10">
                
                {/* PROFILE HEADER */}
                <header className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-[2.2rem] bg-indigo-100 border-4 border-white shadow-xl overflow-hidden">
                            <img 
                                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200" 
                                alt="Supplier"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center border-2 border-white shadow-lg">
                            <span className="material-symbols-outlined text-[14px]">verified</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter text-slate-950 leading-none mb-2">
                            {user.displayName || 'Supplier Partner'}
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            SUPPLIER ID: SZ-SUPP-{(user._id || '42').slice(-6).toUpperCase()}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                                Platinum Partner
                            </span>
                        </div>
                    </div>
                </header>

                {/* 1. BUSINESS DETAILS SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Business Details</h3>
                        <button 
                            onClick={() => handleEditClick('business')}
                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                        >
                            EDIT
                        </button>
                    </div>
                    
                    <div className="bg-white p-7 rounded-[2.8rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Business Name</p>
                                <p className="text-[13px] font-black text-slate-900 tracking-tight">{user.supplierDetails?.businessName || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                                <p className="text-[13px] font-black text-slate-900 tracking-tight">{user.phone}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Registered Address</p>
                            <p className="text-[13px] font-black text-slate-900 tracking-tight leading-snug">
                                {user.supplierDetails?.address || 'N/A'}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GST Number</p>
                                <p className="text-[13px] font-black text-slate-900 tracking-tight">{user.supplierDetails?.gst || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">MSME Status</p>
                                <p className="text-[13px] font-black text-emerald-600 tracking-tight flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">verified</span> Verified
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. FINANCIAL PAYOUT DETAILS SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Financial Payouts</h3>
                        <button 
                            onClick={() => handleEditClick('bank')}
                            className="text-[10px] font-black text-slate-950 uppercase tracking-widest bg-white px-5 py-2 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-all"
                        >
                            EDIT
                        </button>
                    </div>
                    
                    <div className="bg-slate-900 text-white p-7 rounded-[2.8rem] shadow-2xl shadow-slate-900/20 space-y-6 relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                        
                        <div className="space-y-1 relative z-10">
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Linked Bank Account</p>
                            <p className="text-[15px] font-black text-white tracking-tight">
                                {user.bankDetails?.bankName || 'N/A'} • {user.bankDetails?.accountNumber ? `XXXX${user.bankDetails.accountNumber.slice(-4)}` : 'N/A'}
                            </p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 relative z-10">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Settlement Cycle</p>
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">Weekly Aggregator</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Logout Action */}
                <div className="pt-4">
                    <button 
                        onClick={handleSignOut}
                        className="w-full py-5 bg-rose-50 border border-rose-100 rounded-[2rem] text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Logout Profile
                    </button>
                </div>
            </main>

            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[101] flex items-end justify-center px-4 pb-10 sm:items-center">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
                        >
                            <h3 className="text-xl font-black text-slate-950 mb-6 uppercase tracking-tighter">Edit {editSection === 'business' ? 'Business' : 'Bank'} Info</h3>
                            
                            <div className="space-y-5">
                                {editSection === 'business' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                                            <input value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                            <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Full Address (Google Maps)</label>
                                            {isLoaded ? (
                                                <Autocomplete
                                                    onLoad={ac => setAutocomplete(ac)}
                                                    onPlaceChanged={() => {
                                                        const place = autocomplete.getPlace();
                                                        if (place.geometry) {
                                                            const lat = place.geometry.location.lat();
                                                            const lng = place.geometry.location.lng();
                                                            
                                                            let city = '';
                                                            let pincode = '';
                                                            place.address_components.forEach(comp => {
                                                                if (comp.types.includes('locality')) city = comp.long_name;
                                                                if (comp.types.includes('postal_code')) pincode = comp.long_name;
                                                            });

                                                            setFormData({
                                                                ...formData,
                                                                address_area: place.formatted_address,
                                                                address_city: city,
                                                                address_pincode: pincode,
                                                                location: { lat, lng }
                                                            });
                                                            toast.success('Location detected!');
                                                        }
                                                    }}
                                                >
                                                    <input 
                                                        placeholder="Start typing your address..."
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" 
                                                    />
                                                </Autocomplete>
                                            ) : (
                                                <div className="w-full h-14 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flat/Office No</label>
                                                <input value={formData.address_shop} onChange={e => setFormData({...formData, address_shop: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Area (Auto-filled)</label>
                                                <input value={formData.address_area} onChange={e => setFormData({...formData, address_area: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none opacity-70" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Landmark</label>
                                            <input value={formData.address_landmark} onChange={e => setFormData({...formData, address_landmark: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                                                <input value={formData.address_city} onChange={e => setFormData({...formData, address_city: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pincode</label>
                                                <input value={formData.address_pincode} onChange={e => setFormData({...formData, address_pincode: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Number</label>
                                            <input value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Holder</label>
                                            <input value={formData.accountHolderName} onChange={e => setFormData({...formData, accountHolderName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                            <input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                                            <input value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                                            <input value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none" />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button onClick={() => setIsEditModalOpen(false)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
                                <button onClick={handleSave} className="py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Save Changes</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SupplierProfile;
