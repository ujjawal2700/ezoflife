import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ShoppingBag, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import useNotificationStore from '../../../shared/stores/notificationStore';
import { useLocationStore } from '../../../shared/stores/locationStore';

const UserHeader = () => {
  const navigate = useNavigate();
  const locationPath = useLocation();
  const isHomePage = locationPath.pathname === '/user/home' || locationPath.pathname === '/';
  
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { location, setPickerOpen } = useLocationStore();
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressType, setAddressType] = useState('HOME');
  
  const [addressData, setAddressData] = useState({
    line1: '',
    line2: '',
    floor: '',
    landmark: '',
    pincode: '',
    city: '',
    state: ''
  });

  const handleProfileClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/user/auth');
    } else {
      navigate('/user/profile');
    }
  };

  const getSafeStorage = (key) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return {};
      return JSON.parse(item);
    } catch (e) {
      return {};
    }
  };

  const userData = getSafeStorage('user');

  const handleSaveAddress = () => {
    const fullAddr = `${addressData.line1}, ${addressData.line2}, ${addressData.city}`;
    localStorage.setItem('detected_address', fullAddr);
    setShowAddressModal(false);
    window.location.reload(); // Refresh to show updated address
  };

  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      try {
        const saved = localStorage.getItem('cart_quantities');
        if (saved) {
          const quantities = JSON.parse(saved);
          const total = Object.values(quantities).reduce((acc, q) => acc + (Number(q) || 0), 0);
          setCartCount(total);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        setCartCount(0);
      }
    };

    updateCount();
    const interval = setInterval(updateCount, 1000); // Simple sync
    window.addEventListener('storage', updateCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur-xl w-full border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-6 lg:px-8 h-14 sm:h-16 gap-2">
          
          {/* Brand Logo & Location Indicator */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <div onClick={() => navigate('/user/home')} className="flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs">
                S
              </div>
              <span className="font-extrabold text-base sm:text-lg lg:text-xl tracking-tight text-slate-900">SPINZYT</span>
            </div>

            <div className="hidden sm:block h-4 sm:h-5 w-px bg-slate-200 shrink-0" />

            {/* Location Pill */}
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 transition-colors text-left cursor-pointer max-w-[105px] xs:max-w-[135px] sm:max-w-[200px] md:max-w-[280px] truncate group border border-slate-200/70 shrink"
            >
              <MapPin size={13} className="text-slate-500 shrink-0 group-hover:text-slate-900 transition-colors" />
              <div className="min-w-0 flex-1 truncate">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-900 mr-1 uppercase tracking-wide truncate inline-block max-w-full">
                  {location?.area || 'Location'}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal truncate hidden md:inline">
                  {location ? (location.city || location.fullAddress) : 'Set Address'}
                </span>
              </div>
              <ChevronDown size={11} className="text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {[
              { label: 'Services', path: '/user/home' },
              { label: 'My Orders', path: '/user/orders' },
              { label: 'Support', path: '/user/support' },
              { label: 'More', path: '/user/more' },
            ].map(link => {
              const isActive = locationPath.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={cn(
                    "px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-slate-100 text-slate-900 font-semibold" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Items: Cart & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Cart Button */}
            {cartCount > 0 ? (
              <button
                onClick={() => navigate('/user/cart')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer"
              >
                <ShoppingBag size={14} className="sm:size-[15px]" />
                <span className="hidden sm:inline">Cart</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] sm:text-[11px] font-bold">
                  {cartCount}
                </span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/user/cart')}
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="View cart"
              >
                <ShoppingBag size={18} className="sm:size-[19px]" />
              </button>
            )}

            {/* Profile Avatar Trigger */}
            <button
              onClick={handleProfileClick}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer border border-slate-200/80 overflow-hidden shrink-0"
              title="Profile"
            >
              {userData?.image ? (
                <img src={userData.image} alt="User" className="w-full h-full object-cover" />
              ) : (
                <User size={15} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* LOCATE ADDRESS MODAL */}
      <AnimatePresence>
        {showAddressModal && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddressModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl flex flex-col gap-6 overflow-y-auto max-h-[90vh] hide-scrollbar"
            >
              {/* Handle Bar */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">ADD FULL <br/>ADDRESS.</h2>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Details for accurate delivery</p>
              </div>

              {/* Type Toggle */}
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                {['HOME', 'OFFICE', 'OTHER'].map(type => (
                  <button
                    key={type}
                    onClick={() => setAddressType(type)}
                    className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${addressType === type ? 'bg-black text-white shadow-lg shadow-black/20' : 'text-slate-400'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-4">Address Line 1</label>
                  <input 
                    type="text"
                    value={addressData.line1}
                    onChange={(e) => setAddressData({...addressData, line1: e.target.value})}
                    placeholder="Flat/House No, Building Name"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-4">Address Line 2</label>
                  <input 
                    type="text"
                    value={addressData.line2}
                    onChange={(e) => setAddressData({...addressData, line2: e.target.value})}
                    placeholder="Street, Area Name"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-4">Floor / Apt</label>
                    <input 
                      type="text"
                      value={addressData.floor}
                      onChange={(e) => setAddressData({...addressData, floor: e.target.value})}
                      placeholder="e.g. 4th Floor"
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-4">Landmark</label>
                    <input 
                      type="text"
                      value={addressData.landmark}
                      onChange={(e) => setAddressData({...addressData, landmark: e.target.value})}
                      placeholder="Near Temple/Gym"
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-4">Pincode</label>
                    <input 
                      type="text"
                      value={addressData.pincode}
                      onChange={(e) => setAddressData({...addressData, pincode: e.target.value})}
                      placeholder="6-digit ZIP"
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-4">City</label>
                    <input 
                      type="text"
                      value={addressData.city}
                      onChange={(e) => setAddressData({...addressData, city: e.target.value})}
                      placeholder="City Name"
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 mb-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-4">State</label>
                  <input 
                    type="text"
                    value={addressData.state}
                    onChange={(e) => setAddressData({...addressData, state: e.target.value})}
                    placeholder="State Name"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                  />
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveAddress}
                className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-black/20 hover:shadow-black/30 transition-all mt-4"
              >
                SAVE ADDRESS
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UserHeader;
