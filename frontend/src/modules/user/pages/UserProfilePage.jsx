import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../../../lib/api';

const UserProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    email: user.email || '',
    phone: user.phone || '',
    image: user.image || '',
    paymentDetails: {
      upi: user.paymentDetails?.upi || '',
      card: user.paymentDetails?.card || ''
    }
  });
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const userId = user._id || user.id;
      if (!userId) throw new Error('User not found');

      const updatedUser = await authApi.updateProfile(userId, formData);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-slate-900 min-h-screen pb-20 font-sans bg-slate-50/50"
    >
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        
        {/* UNIFIED PROFILE BOX */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative">
          {!isEditing ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 bg-slate-950 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg z-10"
            >
              MANAGE PROFILE
            </motion.button>
          ) : (
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
               <button onClick={() => setIsEditing(false)} className="text-[8px] font-black text-slate-400 uppercase">Cancel</button>
               <button onClick={handleSave} disabled={loading} className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">{loading ? '...' : 'SAVE'}</button>
            </div>
          )}
          
          {/* 1. USER INFO SECTION (TOP OF BOX) */}
          <section className="p-6 border-b border-slate-50 flex flex-col items-start space-y-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-[1.8rem] bg-slate-100 border-2 border-white shadow-lg overflow-hidden">
                <img
                  src={formData.image || user.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              {isEditing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[1.8rem] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                  <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                </label>
              )}
            </div>

            <div className="w-full space-y-5">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</p>
                    <input type="text" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black text-slate-900 outline-none focus:bg-white focus:border-slate-950 transition-all" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</p>
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black text-slate-900 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</p>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black text-slate-900 outline-none" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</p>
                    <h2 className="text-xl font-black tracking-tight text-slate-950 ml-1">{user.displayName || 'Guest User'}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 pt-1">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</p>
                      <div className="flex items-center gap-2 text-slate-950 font-black text-[11px] ml-1">
                        <span className="material-symbols-outlined text-[14px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        <span>+91 {user.phone}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</p>
                      <p className="text-[11px] font-black text-slate-950 ml-1 lowercase">{user.email || 'No email added'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. ADDRESS BOOK SECTION */}
          <section className="p-5 border-b border-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">location_on</span>
                <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Saved Addresses</h3>
              </div>
              <button onClick={() => navigate('/user/profile/addresses')} className="text-[8px] font-black text-slate-400 uppercase border border-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all">MANAGE ADDRESS</button>
            </div>
            <div className="space-y-2.5">
              {(user.addresses && user.addresses.length > 0) ? (
                user.addresses.slice(0, 2).map((addr, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/50">
                    <span className="material-symbols-outlined text-slate-400 text-base mt-0.5">
                      {addr.type === 'Home' ? 'home' : addr.type === 'Office' ? 'work' : 'push_pin'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{addr.type}</p>
                      <p className="text-[11px] font-bold text-slate-900 truncate leading-tight">{addr.address}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center py-2">No addresses saved</p>
              )}
            </div>
          </section>

          {/* 3. PAYMENT METHODS SECTION */}
          <section className="p-5 border-b border-slate-50 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-lg">payments</span>
                <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Payment Methods</h3>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { label: 'UPI ID', key: 'upi', icon: 'account_balance_wallet', color: 'text-indigo-500' },
                { label: 'Saved Card', key: 'card', icon: 'credit_card', color: 'text-amber-500' }
              ].map((method, i) => (
                <div key={i} className="flex flex-col space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{method.label}</p>
                  <div className="flex items-center gap-3 ml-1 transition-all">
                    <div className={`w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center ${method.color}`}>
                      <span className="material-symbols-outlined text-base">{method.icon}</span>
                    </div>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={formData.paymentDetails[method.key]} 
                        onChange={(e) => setFormData({
                          ...formData, 
                          paymentDetails: { ...formData.paymentDetails, [method.key]: e.target.value }
                        })}
                        placeholder={`Enter ${method.label}`}
                        className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-black text-slate-900 outline-none w-full"
                      />
                    ) : (
                      <p className="text-[10px] font-black text-slate-950">{user.paymentDetails?.[method.key] || 'Not Added'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. APP SETTINGS SECTION */}
          <section className="divide-y divide-slate-50 bg-slate-50/20">
            {[
              { label: 'Privacy Policy', icon: 'security', path: '/user/privacy?role=customer' },
              { label: 'Terms & Conditions', icon: 'description', path: '/user/terms?role=customer' }
            ].map((link, i) => (
              <div key={i} onClick={() => navigate(link.path)} className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-lg group-hover:text-slate-950 transition-colors">{link.icon}</span>
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{link.label}</span>
                </div>
                <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward_ios</span>
              </div>
            ))}
          </section>
        </div>

        {/* LOGOUT ACTION */}
        <div className="px-2">
          <button
            onClick={() => { 
              const keysToRemove = [
                'token', 'user', 'userData', 'userId', 'last_visited_vendor_id', 'userType',
                'cart_quantities', 'pickup_date', 'pickup_time', 'delivery_date', 'delivery_time',
                'pickup_address', 'drop_address', 'order_notes', 'item_photos', 'selected_tier', 'is_express'
              ];
              keysToRemove.forEach(k => localStorage.removeItem(k));
              navigate('/user/auth'); 
              toast.success('Logged out successfully'); 
            }}
            className="w-full py-4 bg-rose-50 border border-rose-100 rounded-[1.8rem] text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Logout
          </button>
        </div>

        {/* VERSION INFO */}
        <div className="text-center pb-6">
          <p className="text-[8px] font-black text-slate-200 uppercase tracking-[0.6em]">SPINZYT • VERSION 2.4.0</p>
        </div>
      </main>
    </motion.div>
  );
};

export default UserProfilePage;
