import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../../../lib/api';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const VendorProfile = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: '3.64',
        libraries: ['drawing', 'places', 'geometry']
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

            // Sync updatedUser back to local storage cache to keep it fresh across pages
            const rawStored = localStorage.getItem('user') || localStorage.getItem('vendorData') || localStorage.getItem('userData');
            if (rawStored) {
                try {
                    const parsed = JSON.parse(rawStored);
                    let merged;
                    if (parsed.user) {
                        merged = { ...parsed, user: { ...parsed.user, ...updatedUser } };
                    } else {
                        merged = { ...parsed, ...updatedUser };
                    }
                    localStorage.setItem('user', JSON.stringify(merged));
                    localStorage.setItem('vendorData', JSON.stringify(merged));
                    localStorage.setItem('userData', JSON.stringify(merged));
                } catch (e) {
                    console.error('LocalStorage sync error:', e);
                }
            }

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

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const loadingToast = toast.loading('Updating profile image...');
        try {
            const formData = new FormData();
            formData.append('image', file);

            const userId = user.id || user._id;
            const updatedUser = await authApi.updateProfileImage(userId, formData);

            setUser(updatedUser);
            toast.success('Profile image updated', { id: loadingToast });
        } catch (err) {
            console.error('Image upload error:', err);
            toast.error('Failed to update image', { id: loadingToast });
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
        <div className="text-slate-900 min-h-screen pb-40 font-sans">
            <main className="max-w-md mx-auto px-6 pt-2 space-y-6">

                {/* UNIFIED PROFILE BOX - everything in one card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative">

                    {/* Manage button top-right */}
                    <div className="absolute top-5 right-5 z-10 flex gap-2">
                        <button
                            onClick={() => handleEditClick('shop')}
                            className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[12px]">settings</span>
                            Manage
                        </button>
                    </div>

                    {/* TOP SECTION: Image + Name + Email + Phone */}
                    <section className="p-7 border-b border-slate-50">
                        {/* Profile Image */}
                        <div className="relative group w-fit mb-5">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-[1.8rem] bg-slate-100 border-2 border-white shadow-lg overflow-hidden cursor-pointer relative"
                            >
                                <img
                                    src={user.image || "https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=200"}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-900 text-white rounded-xl flex items-center justify-center border-2 border-white shadow-lg z-20">
                                <span className="material-symbols-outlined text-[12px]">{user.status === 'approved' ? 'verified' : 'pending'}</span>
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-1 mb-4">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shop / Partner Name</p>
                            <h2 className="text-xl font-black tracking-tight text-slate-950 leading-tight">
                                {user.shopDetails?.name || user.displayName || 'Partner'}
                            </h2>
                            <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${user.status === 'approved' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-amber-100 text-amber-600 border-amber-200'}`}>
                                {user.status}
                            </span>
                        </div>

                        {/* Email */}
                        <div className="space-y-1 mb-4">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                            <p className="text-[11px] font-black text-slate-950 lowercase">{user.email || 'partner@ezoflife.in'}</p>
                        </div>

                        {/* Phone */}
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</p>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[14px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                <p className="text-[11px] font-black text-slate-950">{user.phone}</p>
                            </div>
                        </div>
                    </section>

                    {/* BUSINESS DETAILS */}
                    <section className="p-7 border-b border-slate-50 space-y-5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">store</span>
                            Business Details
                        </p>
                        <div className="grid grid-cols-1 gap-4 pl-1">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shop Name</p>
                                <p className="text-sm font-black text-slate-900 tracking-tight">{user.shopDetails?.name || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shop Address</p>
                                <p className="text-xs font-bold text-slate-600 leading-relaxed">{user.shopDetails?.address || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GST Number</p>
                                    <p className="text-xs font-black text-slate-900 tracking-tight">{user.shopDetails?.gst || 'Individual'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">MSME Status</p>
                                    <p className="text-xs font-black text-emerald-600 tracking-tight flex items-center gap-1 uppercase">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span> {user.shopDetails?.msmeStatus || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* BANK DETAILS */}
                    <section className="p-7 bg-slate-50/40 space-y-5">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[14px]">account_balance</span>
                                Bank Details
                            </p>
                            <button
                                onClick={() => handleEditClick('bank')}
                                className="text-[8px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[12px]">edit</span>
                                Update
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 pl-1">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Account Holder</p>
                                <p className="text-sm font-black text-slate-900 tracking-tight">{user.bankDetails?.accountHolderName || 'N/A'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bank Name</p>
                                    <p className="text-xs font-black text-slate-900 tracking-tight">{user.bankDetails?.bankName || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">IFSC Code</p>
                                    <p className="text-xs font-black text-slate-900 tracking-tight uppercase">{user.bankDetails?.ifscCode || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Account Number</p>
                                <p className="text-xs font-black text-slate-900 tracking-[0.15em]">
                                    {user.bankDetails?.accountNumber ? `**** **** ${user.bankDetails.accountNumber.slice(-4)}` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* DOCUMENTS SECTION */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Verification Documents</h3>
                        <span className="material-symbols-outlined text-slate-200 text-lg">folder_shared</span>
                    </div>

                    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
                        {(user.documents && user.documents.length > 0) ? (
                            user.documents.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400">
                                            <span className="material-symbols-outlined text-lg">description</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{doc.type}</p>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[7px] font-black text-primary uppercase tracking-widest">View File</a>
                                        </div>
                                    </div>
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => handleDocumentUpdate(doc.type, e.target.files[0])}
                                        />
                                        <span className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors text-lg">upload_file</span>
                                    </label>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No documents uploaded</p>
                            </div>
                        )}

                        {(!user.documents || user.documents.length < 2) && (
                            <div className="pt-2 border-t border-slate-50 mt-2">
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

                {/* LEGAL & POLICIES SECTION */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Legal & Policies</h3>
                        <span className="material-symbols-outlined text-slate-200 text-lg">policy</span>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                        <button
                            onClick={() => navigate('/user/terms?role=vendor')}
                            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-lg">gavel</span>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 leading-none mb-1">Terms of Service</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Rules & Regulations</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-200 group-hover:text-slate-400 transition-colors text-lg">chevron_right</span>
                        </button>

                        <button
                            onClick={() => navigate('/user/privacy?role=vendor')}
                            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-lg">verified_user</span>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 leading-none mb-1">Privacy Policy</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Data Protection Protocol</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-200 group-hover:text-slate-400 transition-colors text-lg">chevron_right</span>
                        </button>
                    </div>
                </section>

                {/* Action Footer */}
                <div className="flex flex-col gap-4 pt-4">
                    <button
                        onClick={handleSignOut}
                        className="w-full py-5 bg-rose-50 border border-rose-100 rounded-[2rem] text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Logout
                    </button>
                </div>

                <div className="text-center pb-12">
                    <p className="text-[8px] font-black text-slate-200 uppercase tracking-[0.6em]">EZ OF LIFE PARTNER • v3.0.0</p>
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
                                            <input value={formData.shopName} onChange={e => setFormData({ ...formData, shopName: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
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
                                                <input value={formData.address_shop} onChange={e => setFormData({ ...formData, address_shop: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Area (Auto-filled)</label>
                                                <input value={formData.address_area} onChange={e => setFormData({ ...formData, address_area: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none opacity-70" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Landmark</label>
                                            <input value={formData.address_landmark} onChange={e => setFormData({ ...formData, address_landmark: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                                                <input value={formData.address_city} onChange={e => setFormData({ ...formData, address_city: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pincode</label>
                                                <input value={formData.address_pincode} onChange={e => setFormData({ ...formData, address_pincode: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Number</label>
                                            <input value={formData.gst} onChange={e => setFormData({ ...formData, gst: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Holder</label>
                                            <input value={formData.accountHolderName} onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                            <input value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                                            <input value={formData.ifscCode} onChange={e => setFormData({ ...formData, ifscCode: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                                            <input value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
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
