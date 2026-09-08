import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  Camera, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Mail, 
  UploadCloud, 
  ExternalLink, 
  LogOut, 
  ChevronRight,
  Shield,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../../lib/api';

const formatSupplierAddress = (address) => {
  if (!address) return 'N/A';
  const pincodeRegex = /^(\d{6})(?:\s*\(Pincode\))?\s*,\s*(.*)$/i;
  const match = address.match(pincodeRegex);
  if (match) {
    const pincode = match[1];
    const restOfAddress = match[2];
    return `${restOfAddress} - ${pincode}`;
  }
  return address;
};

const SupplierProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedUser = JSON.parse(
          localStorage.getItem('user') || 
          localStorage.getItem('supplierData') || 
          localStorage.getItem('userData') || 
          '{}'
        );
        const userId = storedUser.id || storedUser._id;

        if (!userId) {
          navigate('/user/auth');
          return;
        }

        const data = await authApi.getProfile(userId);
        setUser(data);
        localStorage.setItem('user', JSON.stringify({ ...storedUser, ...data }));
        localStorage.setItem('supplierData', JSON.stringify({ ...storedUser, ...data }));
        setFormData({
          businessName: data.supplierDetails?.businessName || '',
          email: data.email || '',
          phone: data.phone || '',
          accountHolderName: data.bankDetails?.accountHolderName || '',
          accountNumber: data.bankDetails?.accountNumber || '',
          ifscCode: data.bankDetails?.ifscCode || '',
          bankName: data.bankDetails?.bankName || ''
        });
      } catch (err) {
        console.error('Profile fetch error:', err);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleSave = async () => {
    const loadingToast = toast.loading('Saving changes...');
    try {
      const userId = user.id || user._id;
      const payload = {
        phone: formData.phone,
        email: formData.email,
        supplierDetails: {
          ...(user.supplierDetails || {}),
          businessName: formData.businessName
        },
        bankDetails: {
          accountHolderName: formData.accountHolderName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          bankName: formData.bankName
        }
      };

      const updatedUser = await authApi.updateProfile(userId, payload);
      setUser(updatedUser);

      // Sync updatedUser back to local storage cache
      const rawStored = localStorage.getItem('user') || localStorage.getItem('supplierData') || localStorage.getItem('userData');
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
          localStorage.setItem('supplierData', JSON.stringify(merged));
          localStorage.setItem('userData', JSON.stringify(merged));
        } catch (e) {
          console.error('LocalStorage sync error:', e);
        }
      }

      setIsEditing(false);
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

  const handleDocumentUpdate = async (type, file) => {
    if (!file) return;

    const loadingToast = toast.loading(`Updating ${type}...`);
    try {
      const formDataObj = new FormData();
      formDataObj.append('document', file);
      formDataObj.append('type', type);

      const userId = user.id || user._id;
      const updatedUser = await authApi.updateDocuments(userId, formDataObj);

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
      const formDataObj = new FormData();
      formDataObj.append('image', file);

      const userId = user.id || user._id;
      const updatedUser = await authApi.updateProfileImage(userId, formDataObj);

      setUser(updatedUser);
      toast.success('Profile image updated', { id: loadingToast });
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error('Failed to update image', { id: loadingToast });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Supplier Profile...</p>
      </div>
    );
  }

  if (!user) return null;

  const isApproved = user.status === 'approved';

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-36">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8">

        {/* Top Header & Overview Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Avatar & Identity Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative group w-fit">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-100 border-4 border-white shadow-md overflow-hidden relative cursor-pointer group"
                  title="Click to update business photo"
                >
                  <img
                    src={user.image || "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300"}
                    alt="Business Profile"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Camera size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Change</span>
                  </div>
                </div>

                <div 
                  className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center border-2 border-white shadow-md ${
                    isApproved ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                  title={isApproved ? "Verified Partner" : "Pending Verification"}
                >
                  {isApproved ? <CheckCircle2 size={16} strokeWidth={2.5} /> : <Clock size={16} strokeWidth={2.5} />}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Supplier Partner
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    isApproved 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {user.status || 'Pending'}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Name</label>
                    <input 
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="Company / Business Name"
                      className="w-full text-lg sm:text-2xl font-black text-slate-900 border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {user.supplierDetails?.businessName || user.displayName || 'Registered Supplier'}
                    </h1>
                    <p className="text-sm font-semibold text-slate-500 mt-0.5">
                      B2B Raw Materials & Packaging Fulfillment Partner
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Mail size={15} className="text-slate-400" />
                    <span>{user.email || 'partner@ezoflife.in'}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <Phone size={15} className="text-slate-400" />
                    <span>{user.phone || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 size={16} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        businessName: user.supplierDetails?.businessName || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        accountHolderName: user.bankDetails?.accountHolderName || '',
                        accountNumber: user.bankDetails?.accountNumber || '',
                        ifscCode: user.bankDetails?.ifscCode || '',
                        bankName: user.bankDetails?.bankName || ''
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout for Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Info Column (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Business & Warehouse Information Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">Saved Business & Warehouse Address</h3>
                    <p className="text-xs text-slate-400 font-medium">Registered warehouse and commercial pickup location</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/supplier/addresses')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Manage Address
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Shop / Company Name</span>
                  <p className="text-sm sm:text-base font-black text-slate-900">
                    {user.supplierDetails?.businessName || 'N/A'}
                  </p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Warehouse Location / Full Address</span>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    {formatSupplierAddress(user.supplierDetails?.address)}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">GSTIN / Tax ID</span>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-black text-slate-900">
                      {user.supplierDetails?.gst || 'Individual / Non-GST'}
                    </p>
                    {user.supplierDetails?.gst && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Operating City / Territory</span>
                  <p className="text-sm font-bold text-slate-900">
                    {user.supplierDetails?.city || 'Indore Region'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bank & Settlement Details Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">Settlement & Bank Details</h3>
                    <p className="text-xs text-slate-400 font-medium">B2B wholesale order payouts are credited to this account</p>
                  </div>
                </div>
                {isEditing && (
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Editing Bank Info</span>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Account Holder Name</label>
                    <input 
                      type="text"
                      value={formData.accountHolderName}
                      onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                      placeholder="e.g. Acme Enterprise"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Bank Name</label>
                    <input 
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">IFSC Code</label>
                    <input 
                      type="text"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Account Number</label>
                    <input 
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="e.g. 50100234567890"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Holder</span>
                    <p className="text-sm sm:text-base font-black text-slate-900">
                      {user.bankDetails?.accountHolderName || 'N/A'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bank Name</span>
                    <p className="text-sm sm:text-base font-black text-slate-900">
                      {user.bankDetails?.bankName || 'N/A'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">IFSC Code</span>
                    <p className="text-sm font-mono font-black text-slate-900 uppercase">
                      {user.bankDetails?.ifscCode || 'N/A'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Number</span>
                    <p className="text-sm font-mono font-black text-slate-900 tracking-wider">
                      {user.bankDetails?.accountNumber 
                        ? `•••• •••• ${user.bankDetails.accountNumber.slice(-4)}` 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Column (1/3 width on desktop) */}
          <div className="space-y-6">

            {/* Verification Documents Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-indigo-600" />
                  <h3 className="text-base font-black text-slate-900">Verification Documents</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {user.documents?.length || 0} Attached
                </span>
              </div>

              {user.documents && user.documents.length > 0 ? (
                <div className="space-y-2.5">
                  {user.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{doc.type}</p>
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 mt-0.5"
                          >
                            <span>Preview File</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>

                      <label className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-indigo-600 transition-all cursor-pointer" title="Replace Document">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleDocumentUpdate(doc.type, e.target.files[0])}
                        />
                        <UploadCloud size={16} />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle size={24} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600">No documents uploaded yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Upload GST or MSME certificate to accelerate wholesale orders</p>
                </div>
              )}

              {/* Add Missing Document Option */}
              {(!user.documents || user.documents.length < 2) && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Supporting Documents</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['GST Document', 'MSME Document']
                      .filter(type => !user.documents?.some(d => d.type === type))
                      .map(type => (
                        <label key={type} className="cursor-pointer">
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleDocumentUpdate(type, e.target.files[0])} 
                          />
                          <div className="p-3 border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl text-center transition-all">
                            <UploadCloud size={16} className="mx-auto text-indigo-600 mb-1" />
                            <p className="text-[11px] font-bold text-indigo-900 leading-tight">{type}</p>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Legal & App Links */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs divide-y divide-slate-100">
              <button
                onClick={() => navigate('/privacy?role=supplier')}
                className="w-full py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  <span className="text-xs font-bold text-slate-800">Privacy Policy</span>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/terms?role=supplier')}
                className="w-full py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  <span className="text-xs font-bold text-slate-800">Terms & Conditions</span>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full py-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-xs font-black text-rose-600 uppercase tracking-widest flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-98"
            >
              <LogOut size={16} />
              <span>Log Out Partner Account</span>
            </button>

            <div className="text-center pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                EZ OF LIFE PARTNER PLATFORM • v3.2.0
              </p>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};

export default SupplierProfile;
