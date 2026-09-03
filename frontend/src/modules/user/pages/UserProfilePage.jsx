import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, MapPin, CheckCircle2, Shield, FileText, LogOut, Camera, Home, Briefcase, Plus, ChevronRight, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { authApi, geofenceApi } from '../../../lib/api';
import { useLocationStore } from '../../../shared/stores/locationStore';
import { locationService } from '../../../lib/locationService';

const defaultCenter = { lat: 22.7196, lng: 75.8577 }; // Indore as default

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = user._id || user.id;
        if (userId) {
          const freshUser = await authApi.getProfile(userId);
          if (freshUser && (freshUser._id || freshUser.id)) {
            localStorage.setItem('user', JSON.stringify(freshUser));
            setUser(freshUser);
            setFormData(prev => ({
              ...prev,
              displayName: freshUser.displayName || prev.displayName,
              email: freshUser.email || prev.email,
              phone: freshUser.phone || prev.phone,
              image: freshUser.image || prev.image,
              paymentDetails: {
                upi: freshUser.paymentDetails?.upi || prev.paymentDetails?.upi || '',
                card: freshUser.paymentDetails?.card || prev.paymentDetails?.card || ''
              }
            }));
          }
        }
      } catch (err) {
        console.error('Failed to sync profile on mount:', err);
      }
    };
    fetchProfile();
  }, []);

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

  const handleSetDefault = async (addrId) => {
    try {
      setLoading(true);
      const userId = user._id || user.id;
      if (!userId) throw new Error('User not found');

      const targetAddress = user.addresses?.find(a => (a._id || a.id) === addrId);
      if (!targetAddress) {
        toast.error('Address not found');
        return;
      }

      const updatedList = (user.addresses || []).map(a => ({
        ...a,
        isDefault: (a._id || a.id) === addrId
      }));

      const updatedUser = await authApi.updateProfile(userId, {
        addresses: updatedList,
        address: targetAddress.address,
        city: targetAddress.city || '',
        pincode: targetAddress.pincode || '',
        location: (targetAddress.location && targetAddress.location.lat !== 0) ? targetAddress.location : defaultCenter
      });

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Sync default address to useLocationStore and check geofence
      let finalLat = targetAddress.location?.lat || 0;
      let finalLng = targetAddress.location?.lng || 0;
      
      if (!finalLat && !finalLng && targetAddress.address) {
        try {
          const coords = await locationService.geocodeAddress(targetAddress.address);
          if (coords) {
            finalLat = coords.lat;
            finalLng = coords.lng;
          }
        } catch (e) {
          console.error('[Geocoding] Error during default address change:', e);
        }
      }

      if (!finalLat && !finalLng && targetAddress.pincode) {
        try {
          const coords = await locationService.geocodeAddress(targetAddress.pincode + ", India");
          if (coords) {
            finalLat = coords.lat;
            finalLng = coords.lng;
          }
        } catch (e) {
          console.error('[Geocoding] Pincode sync failed:', e);
        }
      }

      if (!finalLat && !finalLng) {
        finalLat = defaultCenter.lat;
        finalLng = defaultCenter.lng;
      }

      useLocationStore.getState().setLocation({
        fullAddress: targetAddress.address,
        city: targetAddress.city || '',
        area: targetAddress.type || 'HOME',
        lat: finalLat,
        lng: finalLng
      });

      // Update pickup_address in localStorage for order/checkout flow consistency
      const pickupAddressObj = {
        id: targetAddress._id || targetAddress.id,
        type: (targetAddress.type || 'HOME').toUpperCase(),
        address: targetAddress.address,
        location: { lat: finalLat, lng: finalLng },
        isDefault: true
      };
      localStorage.setItem('pickup_address', JSON.stringify(pickupAddressObj));

      if (finalLat && finalLng) {
        try {
          const zoneInfo = await geofenceApi.checkAvailability(finalLat, finalLng);
          if (zoneInfo.available) {
            useLocationStore.getState().setZoneData({
              name: zoneInfo.name,
              pricingFactor: zoneInfo.pricingFactor,
              platformMultiplier: zoneInfo.platformMultiplier,
              minPlatformFee: zoneInfo.minPlatformFee,
              maxPlatformFee: zoneInfo.maxPlatformFee,
              expressMultiplier: zoneInfo.expressMultiplier,
              heritageMultiplier: zoneInfo.heritageMultiplier
            });
          } else {
            useLocationStore.getState().setZoneData({ name: null, pricingFactor: 1, allowDiscount: false, platformMultiplier: 0, minPlatformFee: 0, maxPlatformFee: null, expressMultiplier: 1, heritageMultiplier: 1 });
          }
        } catch (zoneErr) {
          console.error('[Geofence] Error checking availability during default set:', zoneErr);
        }
      } else {
        useLocationStore.getState().setZoneData({ name: null, pricingFactor: 1, allowDiscount: false, platformMultiplier: 0, expressMultiplier: 1, heritageMultiplier: 1 });
      }

      toast.success('Default address updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to set default address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col font-['Poppins',sans-serif] text-slate-900 bg-[#f8fafc]">
      <main className="flex-1 pb-44 sm:pb-36 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-row items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">Account Settings</h1>
            <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 truncate sm:overflow-visible sm:whitespace-normal">Manage your profile details and delivery locations.</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Edit3 size={13} className="sm:size-[14px]" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button 
                onClick={() => setIsEditing(false)} 
                className="px-2.5 sm:px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={loading} 
                className="px-3 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Responsive Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* Left Column: Identity & Legal */}
          <div className="md:col-span-5 space-y-5 sm:space-y-6">
            {/* Identity Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden">
                    <img
                      src={formData.image || user.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isEditing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                      <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                      <Camera size={18} className="text-white" />
                    </label>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {user.displayName || 'Customer'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span>Verified Customer</span>
                  </div>
                </div>
              </div>

              {/* Editable or Display Fields */}
              {isEditing ? (
                <div className="space-y-3.5 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.displayName} 
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Phone Number</label>
                    <input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs sm:text-sm">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-normal">Phone</span>
                    <span className="font-medium text-slate-800">+91 {user.phone}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 font-normal">Email</span>
                    <span className="font-medium text-slate-800 truncate max-w-[170px]">{user.email || 'No email added'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Legal & Policy Links */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs divide-y divide-slate-100">
              {[
                { label: 'Privacy Policy', icon: Shield, path: '/user/privacy?role=customer' },
                { label: 'Terms & Conditions', icon: FileText, path: '/user/terms?role=customer' }
              ].map((link, i) => {
                const IconComponent = link.icon;
                return (
                  <button 
                    key={i} 
                    onClick={() => navigate(link.path)} 
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent size={16} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                      <span className="text-xs sm:text-sm font-medium text-slate-800">{link.label}</span>
                    </div>
                    <ChevronRight size={15} className="text-slate-400" />
                  </button>
                );
              })}
            </div>

            {/* Logout Button */}
            <button
              onClick={() => { 
                localStorage.clear();
                navigate('/user/auth'); 
                toast.success('Logged out successfully'); 
              }}
              className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-xs sm:text-sm font-medium text-rose-600 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>

          {/* Right Column: Saved Addresses */}
          <div className="md:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin size={17} className="text-slate-700" />
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">Saved Addresses</h3>
                </div>
                <button 
                  onClick={() => navigate('/user/profile/addresses')} 
                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80"
                >
                  Manage
                </button>
              </div>

              {/* Address List */}
              <div className="space-y-3">
                {(user.addresses && user.addresses.length > 0) ? (
                  user.addresses.map((addr, i) => {
                    const isDefault = addr.isDefault;
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl border transition-all",
                          isDefault ? "bg-slate-50/90 border-slate-300" : "bg-white border-slate-200/80 hover:bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                            {addr.type === 'Home' ? <Home size={15} /> : addr.type === 'Office' ? <Briefcase size={15} /> : <MapPin size={15} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 uppercase">
                                {addr.type}
                              </span>
                              {isDefault && (
                                <span className="bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 font-normal leading-relaxed mt-1 break-words">
                              {addr.address}
                              {addr.city && !addr.address.includes(addr.city) ? `, ${addr.city}` : ''}
                              {addr.pincode && !addr.address.includes(addr.pincode) ? ` - ${addr.pincode}` : ''}
                            </p>
                          </div>
                        </div>

                        {!isDefault && (
                          <button
                            onClick={() => handleSetDefault(addr._id || addr.id)}
                            disabled={loading}
                            className="text-xs font-medium text-slate-700 hover:text-slate-950 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <MapPin size={24} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-medium text-slate-600">No saved addresses</p>
                    <button
                      onClick={() => navigate('/user/profile/addresses')}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Add New Address
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Version Info */}
        <div className="text-center pt-4">
          <p className="text-xs text-slate-400 font-normal">SPINZYT • Version 2.4.0</p>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
