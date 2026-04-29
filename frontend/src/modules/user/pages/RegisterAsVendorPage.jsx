import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { BASE_URL } from '../../../lib/api';

const RegisterAsVendorPage = () => {
  const navigate = useNavigate();
  const [showLanding, setShowLanding] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [masterServices, setMasterServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  const [formData, setFormData] = useState({
    shopName: '',
    businessAddress: '',
    gstNumber: '',
    msmeStatus: 'Not Certified',
    bankAccountName: '',
    bankAccountNumber: '',
    ifscCode: '',
    bankName: '',
    gstDoc: null,
    aadharDoc: null,
    serviceRates: {} // { serviceId: rate }
  });

  const benefits = [
    'More Earnings',
    'Daily Orders',
    'Business Growth',
    'Easy Settlements'
  ];

  useEffect(() => {
    if (step === 2) {
        fetchMasterServices();
    }
  }, [step]);

  const fetchMasterServices = async () => {
    try {
        setIsLoadingServices(true);
        const response = await fetch(`${BASE_URL}/master-services`);
        const data = await response.json();
        setMasterServices(data);
        
        // Do NOT auto-initialize rates, let user select via checkbox
    } catch (err) {
        console.error('Fetch services error:', err);
    } finally {
        setIsLoadingServices(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
        if (!formData.shopName || !formData.gstNumber) {
            toast.error('Please fill business details');
            return;
        }
        setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedCount = Object.keys(formData.serviceRates).length;
    if (selectedCount === 0) {
        toast.error('Please select at least one service to offer');
        return;
    }

    try {
        setIsSubmitting(true);
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = storedUser.id || storedUser._id;

        if (!userId) {
            toast.error('Session expired. Please login again.');
            navigate('/auth');
            return;
        }

        const response = await fetch(`${BASE_URL}/auth/become-vendor/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            toast.success('Application submitted for Admin approval!');
            const updatedUser = { ...storedUser, role: 'Vendor', status: 'pending' };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            navigate('/user/profile');
        } else {
            toast.error(result.message || 'Submission failed');
        }
    } catch (err) {
        console.error('Submission error:', err);
        toast.error('Failed to submit application');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
        setFormData(prev => ({ ...prev, [field]: file }));
        toast.success(`${field.toUpperCase()} uploaded`);
    }
  };

  const [uploading, setUploading] = useState(false);
  const handleShopPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    setUploading(true);
    try {
        const uploaded = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('media', file);
            const response = await fetch(`${BASE_URL}/media/upload`, {
                method: 'POST',
                body: formData
            });
            const res = await response.json();
            if (res.fileUrl) uploaded.push(res.fileUrl);
        }
        setFormData(prev => ({ 
            ...prev, 
            shopPhotos: [...(prev.shopPhotos || []), ...uploaded] 
        }));
        toast.success('Shop photos added');
    } catch (error) {
        console.error('Upload Error:', error);
        toast.error('Photo upload failed');
    } finally {
        setUploading(false);
    }
  };

  const removeShopPhoto = (index) => {
    setFormData(prev => ({
        ...prev,
        shopPhotos: prev.shopPhotos.filter((_, i) => i !== index)
    }));
  };

  const toggleService = (serviceId, basePrice) => {
    setFormData(prev => {
        const newRates = { ...prev.serviceRates };
        if (newRates[serviceId]) {
            delete newRates[serviceId];
        } else {
            newRates[serviceId] = basePrice;
        }
        return { ...prev, serviceRates: newRates };
    });
  };

  const updateRate = (serviceId, value) => {
    setFormData(prev => ({
        ...prev,
        serviceRates: {
            ...prev.serviceRates,
            [serviceId]: value
        }
    }));
  };

  if (showLanding) {
    return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-background text-on-background min-h-[100dvh] flex flex-col font-body pb-32"
        >
          <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md p-6 border-b border-outline-variant/10">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="font-headline font-black text-lg tracking-tighter uppercase">Vendor Program</h1>
              <div className="w-10"></div>
            </div>
          </header>
    
          <main className="pt-28 px-6 max-w-2xl mx-auto w-full flex flex-col items-center">
            <motion.section 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-12 text-center"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
              </div>
              <h2 className="text-4xl font-black tracking-tighter leading-none mb-6 text-on-surface">Become a<br/><span className="text-primary italic">Vendor</span></h2>
            </motion.section>
    
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[3rem] p-10 w-full border border-outline-variant/5 shadow-[0_40px_80px_rgba(0,0,0,0.03)] mb-12"
            >
              <div className="space-y-6">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-green-500/20">
                      <span className="material-symbols-outlined text-sm font-black">check</span>
                    </div>
                    <span className="text-lg font-black text-on-surface tracking-tight">{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
    
            <motion.button 
              onClick={() => setShowLanding(false)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              whileTap={{ scale: 0.95 }}
              className="w-full max-w-sm bg-primary text-on-primary py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              Apply Now
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </motion.button>
          </main>
        </motion.div>
      );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background text-on-background min-h-[100dvh] flex flex-col font-body"
    >
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md px-6 pt-6 pb-4 border-b border-outline-variant/10">
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => step === 1 ? setShowLanding(true) : setStep(1)} className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined">{step === 1 ? 'close' : 'arrow_back'}</span>
                </button>
                <h1 className="font-headline font-black text-lg tracking-tighter uppercase">Vendor Onboarding</h1>
                <div className="w-10"></div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-outline-variant/10 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: '0%' }}
                        animate={{ width: step === 1 ? '50%' : '100%' }}
                        className="h-full bg-primary"
                    />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0 tabular-nums">STEP 0{step} / 02</span>
            </div>
        </div>
      </header>

      <main className="pt-32 px-6 pb-32 max-w-2xl mx-auto w-full">
        {step === 1 ? (
            <form className="space-y-12">
                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs">01</span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">Business Information</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">Official Shop Name</label>
                            <input 
                                required
                                value={formData.shopName}
                                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                                placeholder="ENTER LEGAL SHOP NAME"
                                className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tight"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">Business Address</label>
                            <textarea 
                                required
                                value={formData.businessAddress}
                                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                                placeholder="REGISTERED OFFICE/SHOP ADDRESS"
                                rows={3}
                                className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tight resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">GST Number</label>
                                <input 
                                    required
                                    value={formData.gstNumber}
                                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                                    placeholder="GSTIN"
                                    className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tight"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">MSME Status</label>
                                <select 
                                    value={formData.msmeStatus}
                                    onChange={(e) => setFormData({ ...formData, msmeStatus: e.target.value })}
                                    className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tight cursor-pointer"
                                >
                                    <option>Not Certified</option>
                                    <option>Micro Enterprise</option>
                                    <option>Small Enterprise</option>
                                    <option>Medium Enterprise</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs">02</span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">Settlement Account</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">Account Holder Name</label>
                            <input 
                                required
                                value={formData.bankAccountName}
                                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                                placeholder="NAME AS PER BANK RECORDS"
                                className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tight"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                type="password"
                                value={formData.bankAccountNumber}
                                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                placeholder="A/C NUMBER"
                                className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tight"
                            />
                            <input 
                                value={formData.ifscCode}
                                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                                placeholder="IFSC"
                                className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary transition-all uppercase tracking-tight"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs">03</span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">Legal Documents</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <input type="file" onChange={(e) => handleFileChange(e, 'gstDoc')} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                            <div className={`p-6 border-2 border-dashed ${formData.gstDoc ? 'border-primary bg-primary/5' : 'border-outline-variant/20'} rounded-2xl text-center`}>
                                <p className="text-[10px] font-black uppercase tracking-widest">{formData.gstDoc ? 'GST Loaded' : 'GST Upload'}</p>
                            </div>
                        </div>
                        <div className="relative">
                            <input type="file" onChange={(e) => handleFileChange(e, 'aadharDoc')} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                            <div className={`p-6 border-2 border-dashed ${formData.aadharDoc ? 'border-primary bg-primary/5' : 'border-outline-variant/20'} rounded-2xl text-center`}>
                                <p className="text-[10px] font-black uppercase tracking-widest">{formData.aadharDoc ? 'Aadhar Loaded' : 'Aadhar Upload'}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs">04</span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">Shop Photos</h3>
                    </div>
                    <div className="space-y-4">
                        <label className="w-full p-8 border-2 border-dashed border-outline-variant/20 rounded-[2rem] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all">
                            <input type="file" multiple accept="image/*" onChange={handleShopPhotoUpload} className="hidden" />
                            <span className="material-symbols-outlined text-4xl text-slate-300">add_a_photo</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{uploading ? 'UPLOADING...' : 'UPLOAD SHOP PHOTOS'}</span>
                        </label>

                        {formData.shopPhotos && formData.shopPhotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                                {formData.shopPhotos.map((url, i) => (
                                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => removeShopPhoto(i)}
                                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
                                        >
                                            <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <button 
                    type="button"
                    onClick={handleNext}
                    className="w-full bg-primary text-on-primary py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3"
                >
                    Save & Continue
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
            </form>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tighter text-on-surface uppercase">Set Your Rates</h3>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60 italic">Select services you offer and define pricing</p>
                </div>

                <div className="bg-white border border-outline-variant/10 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low border-b border-outline-variant/10">
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant w-16">Offer</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Service Node</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center">Base Price</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">Your Rate (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                            {isLoadingServices ? (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center">
                                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Synchronizing Master Catalog...</p>
                                    </td>
                                </tr>
                            ) : masterServices.map((service) => (
                                <tr key={service._id} className={`group transition-all ${formData.serviceRates[service._id] ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                                    <td className="p-6">
                                        <div 
                                            onClick={() => toggleService(service._id, service.basePrice)}
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${formData.serviceRates[service._id] ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20' : 'border-outline-variant/20 bg-white'}`}
                                        >
                                            {formData.serviceRates[service._id] && <span className="material-symbols-outlined text-sm font-black">check</span>}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${formData.serviceRates[service._id] ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant opacity-60'}`}>
                                                <span className="material-symbols-outlined text-xl">{service.icon || 'settings'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[11px] font-black uppercase tracking-tight leading-none ${formData.serviceRates[service._id] ? 'text-on-surface' : 'text-on-surface-variant opacity-50'}`}>{service.name}</span>
                                                <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant opacity-40 mt-1">{service.category}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="text-xs font-black text-on-surface-variant tabular-nums opacity-40">₹{service.basePrice}</span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end">
                                            {formData.serviceRates[service._id] ? (
                                                <input 
                                                    type="number"
                                                    required
                                                    value={formData.serviceRates[service._id]}
                                                    onChange={(e) => updateRate(service._id, e.target.value)}
                                                    className="w-24 p-3 bg-white border-2 border-primary rounded-xl text-xs font-black text-right outline-none tabular-nums shadow-sm"
                                                />
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Unselected</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[1.5rem] flex items-start gap-4">
                    <span className="material-symbols-outlined text-amber-600">info</span>
                    <p className="text-[10px] font-bold text-amber-950 leading-relaxed uppercase tracking-widest opacity-80">
                        Select the services you are capable of delivering. You can always update your catalog and pricing later from your dashboard.
                    </p>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-outline-variant/10 md:static md:bg-transparent md:p-0 md:border-none">
                    <div className="max-w-2xl mx-auto flex gap-4">
                        <button 
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-10 py-6 border border-outline-variant/20 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
                        >
                            Back
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-primary text-on-primary py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Finalizing...' : 'Complete Registration'}
                            {!isSubmitting && <span className="material-symbols-outlined text-lg">verified</span>}
                        </button>
                    </div>
                </div>
            </form>
        )}
      </main>
    </motion.div>
  );
};

export default RegisterAsVendorPage;
