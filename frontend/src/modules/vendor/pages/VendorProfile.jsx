import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../../../lib/api';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const VendorProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: ['drawing', 'places']
    });

    const [autocomplete, setAutocomplete] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = storedUser.id || storedUser._id;
                
                if (!userId) {
                    navigate('/auth');
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

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSection, setEditSection] = useState(null); // 'shop' or 'bank'
    const [formData, setFormData] = useState({});

    const handleEditClick = (section) => {
        setEditSection(section);
        if (section === 'shop') {
            const addrParts = (user.shopDetails?.address || '').split(', ').filter(p => p !== 'undefined' && p !== '');
            setFormData({
                shopName: user.shopDetails?.name || '',
                phone: user.phone || '',
                address_shop: addrParts[0] || '',
                address_area: addrParts[1] || '',
                address_landmark: addrParts[2] || '',
                address_city: user.shopDetails?.city || '',
                address_pincode: user.shopDetails?.pincode || '',
                gst: user.shopDetails?.gst || '',
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
            
            if (editSection === 'shop') {
                const fullAddress = [formData.address_shop, formData.address_area, formData.address_landmark]
                    .filter(p => p && p.trim() !== '' && p !== 'undefined')
                    .join(', ');
                payload = {
                    phone: formData.phone,
                    shopDetails: {
                        name: formData.shopName,
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
        navigate('/auth');
        toast.success('Signed out successfully');
    };

    const handleDocumentUpdate = async (type, file) => {
        if (!file) return;
        
        const loadingToast = toast.loading(`Updating ${type}...`);
        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('type', type);

            const userId = user.id || user._id;
            const updatedUser = await authApi.updateDocuments(userId, formData);
            
            setUser(updatedUser);
            toast.success(`${type} updated successfully`, { id: loadingToast });
        } catch (err) {
            console.error('Document update error:', err);
            toast.error(`Failed to update ${type}`, { id: loadingToast });
        }
    };

    useEffect(() => {
        if (isEditModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isEditModalOpen]);

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
                
                {/* PROFILE HEADER - REDESIGNED FOR CUSTOMER LAYOUT */}
                <header className="flex flex-col items-center text-center space-y-6">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-[2.8rem] bg-white border-[6px] border-white shadow-2xl overflow-hidden relative z-10">
                            <img 
                                src={user.image || "https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=200"} 
                                alt="Profile"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-primary/20 to-indigo-500/20 rounded-[3.2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center border-4 border-white shadow-lg z-20">
                            <span className="material-symbols-outlined text-[18px]">{user.status === 'approved' ? 'verified' : 'pending'}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter text-slate-950 leading-tight">
                                {user.shopDetails?.name || user.displayName}
                            </h2>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{user.role || 'Service Partner'}</p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2 pt-2">
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="material-symbols-outlined text-sm text-slate-400">call</span>
                                <span className="text-xs font-black text-slate-900 tracking-widest">{user.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="material-symbols-outlined text-sm text-slate-400">mail</span>
                                <span className="text-xs font-black text-slate-900 tracking-tight lowercase">{user.email || 'partner@ezoflife.in'}</span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <span className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${user.status === 'approved' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-amber-100 text-amber-600 border-amber-200'}`}>
                                Account {user.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </header>

                {/* 1. BUSINESS DETAILS SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Business Details</h3>
                        <button 
                            onClick={() => handleEditClick('shop')}
                            className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 hover:bg-primary hover:text-white transition-all"
                        >
                            EDIT
                        </button>
                    </div>
                    
                    <div className="bg-white p-7 rounded-[2.8rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shop Name</p>
                                <p className="text-[13px] font-black text-slate-900 tracking-tight">{user.shopDetails?.name || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                                <p className="text-[13px] font-black text-slate-900 tracking-tight">{user.phone}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Business Address</p>
                            <p className="text-[13px] font-black text-slate-900 tracking-tight leading-snug">{user.shopDetails?.address || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GST Number</p>
                                <p className="text-[13px] font-black text-slate-900 tracking-tight">{user.shopDetails?.gst || 'Individual'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">MSME Status</p>
                                <p className="text-[13px] font-black text-emerald-600 tracking-tight flex items-center gap-1 uppercase">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span> {user.shopDetails?.msmeStatus || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. FINANCIAL PAYOUT DETAILS SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Bank Details</h3>
                        <button 
                            onClick={() => handleEditClick('bank')}
                            className="text-[10px] font-black text-slate-950 uppercase tracking-widest bg-white px-5 py-2 rounded-full shadow-lg shadow-white/10 hover:bg-slate-200 transition-all relative z-20"
                        >
                            EDIT
                        </button>
                    </div>
                    
                    <div className="bg-slate-950 text-white p-7 rounded-[2.8rem] shadow-2xl shadow-slate-900/20 space-y-6 relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                        
                        <div className="space-y-1 relative z-10">
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Account Holder</p>
                            <p className="text-[15px] font-black text-white tracking-tight">{user.bankDetails?.accountHolderName || 'N/A'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Bank Name</p>
                                <p className="text-[13px] font-black text-white tracking-tight">{user.bankDetails?.bankName || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">IFSC Code</p>
                                <p className="text-[13px] font-black text-white tracking-tight uppercase">{user.bankDetails?.ifscCode || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 relative z-10">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Account Number</p>
                                <p className="text-[13px] font-black text-white tracking-[0.2em]">
                                    {user.bankDetails?.accountNumber ? `**** **** ${user.bankDetails.accountNumber.slice(-4)}` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. DOCUMENTS SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Business Documents</h3>
                        <span className="material-symbols-outlined text-slate-200">folder_shared</span>
                    </div>

                    <div className="bg-white p-7 rounded-[2.8rem] border border-slate-100 shadow-sm space-y-4">
                        {(user.documents && user.documents.length > 0) ? (
                            user.documents.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400">
                                            <span className="material-symbols-outlined">description</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{doc.type}</p>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black text-primary uppercase tracking-widest">View Document</a>
                                        </div>
                                    </div>
                                    <label className="cursor-pointer">
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            onChange={(e) => handleDocumentUpdate(doc.type, e.target.files[0])}
                                        />
                                        <span className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors text-xl">upload_file</span>
                                    </label>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No documents found</p>
                            </div>
                        )}
                        
                        {/* Option to add missing ones if needed or standard set */}
                        {(!user.documents || user.documents.length < 2) && (
                            <div className="pt-2">
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-3 text-center">Add Missing Documents</p>
                                <div className="flex gap-2">
                                    {['GST Document', 'MSME Document'].filter(t => !user.documents?.some(d => d.type === t)).map(type => (
                                        <label key={type} className="flex-1 cursor-pointer">
                                            <input type="file" className="hidden" onChange={(e) => handleDocumentUpdate(type, e.target.files[0])} />
                                            <div className="py-3 px-2 border-2 border-dashed border-slate-100 rounded-2xl text-center hover:border-primary/30 transition-colors">
                                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{type}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Action Footer */}
                <div className="flex flex-col gap-4 pt-4">
                    <button 
                        onClick={handleSignOut}
                        className="w-full py-5 bg-rose-50 border border-rose-100 rounded-[2rem] text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Logout Profile
                    </button>
                </div>

                <div className="text-center pb-12">
                    <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.6em]">EZ OF LIFE PARTNER • v3.0.0</p>
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
                            <h3 className="text-xl font-black text-slate-950 mb-6 uppercase tracking-tighter">Edit {editSection === 'shop' ? 'Business' : 'Bank'} Info</h3>
                            
                            <div className="space-y-5">
                                {editSection === 'shop' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shop Name</label>
                                            <input value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                            <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
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
                                                            
                                                            // Parse components
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
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" 
                                                    />
                                                </Autocomplete>
                                            ) : (
                                                <div className="w-full h-14 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flat/Shop No</label>
                                                <input value={formData.address_shop} onChange={e => setFormData({...formData, address_shop: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Area (Auto-filled)</label>
                                                <input value={formData.address_area} onChange={e => setFormData({...formData, address_area: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none opacity-70" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Landmark</label>
                                            <input value={formData.address_landmark} onChange={e => setFormData({...formData, address_landmark: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                                                <input value={formData.address_city} onChange={e => setFormData({...formData, address_city: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pincode</label>
                                                <input value={formData.address_pincode} onChange={e => setFormData({...formData, address_pincode: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Number</label>
                                            <input value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Holder</label>
                                            <input value={formData.accountHolderName} onChange={e => setFormData({...formData, accountHolderName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                            <input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                                            <input value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                                            <input value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button onClick={() => setIsEditModalOpen(false)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
                                <button onClick={handleSave} className="py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all">Save Changes</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VendorProfile;
;
