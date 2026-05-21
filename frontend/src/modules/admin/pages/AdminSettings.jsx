import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { authApi } from '../../../lib/api';

const AdminSettings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);

    // Profile Data State with Persistence
    const [profileData, setProfileData] = useState(() => {
        const saved = localStorage.getItem('admin_profile');
        return saved ? JSON.parse(saved) : {
            name: 'Super Admin',
            companyName: 'EzOfLife Corporate',
            email: 'admin@ezoflife.com',
            phone: '9999999994',
            role: 'Master Admin'
        };
    });

    // Address Data State with Persistence
    const [addresses, setAddresses] = useState(() => {
        const saved = localStorage.getItem('admin_addresses');
        return saved ? JSON.parse(saved) : [
            { id: 1, type: 'Headquarters', address: 'Indore, MP, India', isDefault: true },
            { id: 2, type: 'Regional Office', address: 'Mumbai, MH, India', isDefault: false }
        ];
    });

    // Fetch Admin Profile from Database on Mount
    useEffect(() => {
        const fetchAdminProfile = async () => {
            try {
                const adminRaw = localStorage.getItem('adminData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
                const adminData = JSON.parse(adminRaw);
                const adminId = adminData._id || adminData.id || adminData.user?._id || adminData.user?.id;
                
                if (adminId) {
                    const data = await authApi.getProfile(adminId);
                    if (data) {
                        setProfileData(prev => ({
                            ...prev,
                            name: data.displayName || data.name || prev.name,
                            email: data.email || prev.email,
                            phone: data.phone || prev.phone,
                            role: data.role || prev.role
                        }));
                    }
                }
            } catch (error) {
                console.error('Error fetching admin profile:', error);
            }
        };
        fetchAdminProfile();
    }, []);

    useEffect(() => {
        localStorage.setItem('admin_profile', JSON.stringify(profileData));
    }, [profileData]);

    useEffect(() => {
        localStorage.setItem('admin_addresses', JSON.stringify(addresses));
    }, [addresses]);

    const [newAddress, setNewAddress] = useState({ type: 'Office', address: '' });

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const adminRaw = localStorage.getItem('adminData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
            const adminData = JSON.parse(adminRaw);
            const adminId = adminData._id || adminData.id || adminData.user?._id || adminData.user?.id;

            if (adminId) {
                const updatedUser = await authApi.updateProfile(adminId, {
                    displayName: profileData.name,
                    email: profileData.email,
                    phone: profileData.phone
                });
                
                if (updatedUser) {
                    setProfileData(prev => ({
                        ...prev,
                        name: updatedUser.displayName || prev.name,
                        email: updatedUser.email || prev.email,
                        phone: updatedUser.phone || prev.phone
                    }));
                    
                    const newAdminData = {
                        ...adminData,
                        displayName: updatedUser.displayName || adminData.displayName,
                        phone: updatedUser.phone || adminData.phone,
                        email: updatedUser.email || adminData.email
                    };
                    localStorage.setItem('adminData', JSON.stringify(newAdminData));
                }
                toast.success('Profile updated successfully in database!');
            } else {
                localStorage.setItem('admin_profile', JSON.stringify(profileData));
                toast.success('Profile saved locally (offline mode).');
            }
        } catch (error) {
            console.error('Error updating admin profile:', error);
            toast.error(error.message || 'Failed to update profile in database');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAddress = (e) => {
        e.preventDefault();
        if (!newAddress.address) return;
        const address = {
            id: Date.now(),
            ...newAddress,
            isDefault: false
        };
        setAddresses([...addresses, address]);
        setNewAddress({ type: 'Office', address: '' });
        toast.success('Address added successfully!');
    };

    const removeAddress = (id) => {
        setAddresses(addresses.filter(addr => addr.id !== id));
        toast.success('Address removed');
    };

    const tabs = [
        { id: 'profile', label: 'Admin Profile', icon: 'person' },
        { id: 'address', label: 'Company Addresses', icon: 'location_on' }
    ];

    return (
        <div className="p-6 bg-[#F8FAFC] min-h-screen font-body">
            {/* Header */}
            <div className="flex flex-col mb-8">
                <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">System Settings</h1>
                <p className="text-slate-500 text-sm font-medium tracking-wide">Manage your administrative profile and company locations</p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit mb-8 border border-slate-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id 
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="max-w-4xl">
                <AnimatePresence mode="wait">
                    {activeTab === 'profile' ? (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
                        >
                            <div className="flex items-center gap-6 mb-10">
                                <div className="w-24 h-24 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                                    <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase">Profile Information</h2>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Master Control Credentials</p>
                                </div>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Admin Name</label>
                                    <input 
                                        type="text" 
                                        value={profileData.name}
                                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Company Name</label>
                                    <input 
                                        type="text" 
                                        value={profileData.companyName}
                                        onChange={(e) => setProfileData({...profileData, companyName: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={profileData.email}
                                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={profileData.phone}
                                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Administrative Role</label>
                                    <input 
                                        type="text" 
                                        value={profileData.role}
                                        readOnly
                                        className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-400 cursor-not-allowed"
                                    />
                                </div>

                                <div className="md:col-span-2 pt-6">
                                    <button 
                                        disabled={loading}
                                        type="submit"
                                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span className="material-symbols-outlined text-sm">save</span>
                                        )}
                                        Save Profile Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="address"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Existing Addresses */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {addresses.map(addr => (
                                    <div key={addr.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="px-3 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                                                {addr.type}
                                            </div>
                                            <button 
                                                onClick={() => removeAddress(addr.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed pr-6">{addr.address}</p>
                                        <div className="mt-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-300 text-sm">location_on</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified Location</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add New Address */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 mt-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                                        <span className="material-symbols-outlined text-white">add_location_alt</span>
                                    </div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">Add New Branch</h2>
                                </div>

                                <form onSubmit={handleAddAddress} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Location Type</label>
                                            <select 
                                                value={newAddress.type}
                                                onChange={(e) => setNewAddress({...newAddress, type: e.target.value})}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white/10 outline-none transition-all appearance-none"
                                            >
                                                <option className="text-slate-900" value="Office">Office</option>
                                                <option className="text-slate-900" value="Warehouse">Warehouse</option>
                                                <option className="text-slate-900" value="Store">Store</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Complete Address</label>
                                            <input 
                                                type="text" 
                                                placeholder="Enter full street address, city, state"
                                                value={newAddress.address}
                                                onChange={(e) => setNewAddress({...newAddress, address: e.target.value})}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white/10 outline-none transition-all placeholder:text-white/20"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        type="submit"
                                        className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                                    >
                                        Confirm & Add Location
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminSettings;
