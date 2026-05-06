import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import socket from '../../../lib/socket';

const UserProfilePage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // App Settings State
  const [notifications, setNotifications] = useState(true);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-slate-900 min-h-screen pb-40 font-sans"
    >
      <main className="max-w-md mx-auto px-6 pt-12 space-y-10">
        
        {/* 1. USER INFO SECTION */}
        <section className="flex flex-col items-center text-center space-y-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="relative"
          >
            <div className="w-28 h-28 rounded-[2.5rem] bg-slate-200 border-4 border-white shadow-xl overflow-hidden">
              <img 
                src={user.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <button 
                onClick={() => navigate('/user/profile/edit')}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-950 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
          </motion.div>
          
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-slate-950 leading-tight">{user.displayName || 'Set your Name'}</h2>
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <span className="material-symbols-outlined text-[14px] text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">+91 {user.phone}</span>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{user.email || 'No email added'}</p>
            </div>
          </div>
        </section>

        {/* 2. ADDRESS BOOK SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Address Book</h3>
            <button onClick={() => navigate('/user/profile/addresses')} className="text-[10px] font-black text-slate-950 uppercase tracking-widest bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">Edit</button>
          </div>
          
          <div className="space-y-3">
            {(user.addresses && user.addresses.length > 0) ? (
              user.addresses.map((addr, i) => (
                <motion.div 
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-slate-300 transition-all"
                >
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-slate-950 group-hover:text-white transition-all">
                    <span className="material-symbols-outlined">
                        {addr.type === 'Home' ? 'home' : addr.type === 'Office' ? 'work' : 'location_on'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1.5">{addr.type}</h4>
                    <p className="text-[13px] font-black text-slate-900 tracking-tight leading-snug">{addr.address}</p>
                  </div>
                </motion.div>
              ))
            ) : (
                <div 
                    onClick={() => navigate('/user/profile/addresses')}
                    className="bg-white p-8 rounded-[2.2rem] border-2 border-dashed border-slate-100 text-center cursor-pointer hover:border-primary/30 transition-all"
                >
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No addresses saved yet</p>
                </div>
            )}
          </div>
        </section>

        {/* 3. PAYMENT METHODS SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Payment Methods</h3>
            <span className="material-symbols-outlined text-slate-200">payments</span>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
            {[
              { label: 'UPI ID', val: user.paymentDetails?.upi || 'Not Added', icon: 'account_balance_wallet' },
              { label: 'Credit Card', val: user.paymentDetails?.card || 'Not Added', icon: 'credit_card' },
              { label: 'Cash on Delivery', val: 'Default Method', icon: 'payments', isDefault: true }
            ].map((method, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-slate-400 text-xl">{method.icon}</span>
                  <div>
                    <h4 className="text-[12px] font-black text-slate-900 leading-none">{method.label}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{method.val}</p>
                  </div>
                </div>
                {method.isDefault && (
                  <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter border border-emerald-100">Primary</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 4. APP SETTINGS SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">App Settings</h3>
            <span className="material-symbols-outlined text-slate-200">settings</span>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">

            {[
              { label: 'Privacy Policy', icon: 'security', path: '/user/privacy?role=customer' },
              { label: 'Terms & Conditions', icon: 'description', path: '/user/terms?role=customer' }
            ].map((link, i) => (
              <div 
                key={i}
                onClick={() => navigate(link.path)}
                className="flex items-center justify-between px-6 py-6 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-950 transition-colors">{link.icon}</span>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">{link.label}</span>
                </div>
                <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
              </div>
            ))}

          </div>
        </section>

        {/* Action Footer */}
        <div className="flex flex-col gap-4 pt-4">
            <button 
              onClick={() => {
                localStorage.clear();
                navigate('/user/auth');
                toast.success('Logged out successfully');
              }}
              className="w-full py-5 bg-rose-50 border border-rose-100 rounded-[2rem] text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Logout Profile
            </button>
        </div>

        {/* Footer Info */}
        <div className="text-center pt-8 pb-12">
          <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.6em]">SPINZYT • VERSION 2.4.0</p>
        </div>
      </main>
    </motion.div>
  );
};

export default UserProfilePage;
