import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { BASE_URL } from '../../../lib/api';

const RegisterAsSupplierPage = () => {
  const navigate = useNavigate();
  const [showLanding, setShowLanding] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    bankAccountName: '',
    bankName: '',
    bankAccountNumber: '',
    ifscCode: '',
    businessName: '',
    businessType: 'Manufacturer',
    gstNumber: '',
    businessAddress: '',
    gstDoc: '',
    udyogAadharDoc: '',
    aadharDoc: '',
    addressProofDoc: ''
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.phone) {
        setFormData(prev => ({ ...prev, phone: user.phone, fullName: user.name || '', email: user.email || '' }));
    }
  }, []);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
        const data = new FormData();
        data.append('media', file);
        const response = await fetch(`${BASE_URL}/media/upload`, {
            method: 'POST',
            body: data
        });
        const res = await response.json();
        if (res.fileUrl) {
            setFormData(prev => ({ ...prev, [field]: res.fileUrl }));
            toast.success(`${field.replace(/([A-Z])/g, ' $1').toUpperCase()} uploaded`);
        }
    } catch (error) {
        console.error('Upload Error:', error);
        toast.error('File upload failed');
    } finally {
        setUploading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
        if (!formData.fullName || !formData.email || !formData.address) {
            toast.error('Please fill all personal details');
            return;
        }
    }
    if (step === 2) {
        if (!formData.bankAccountName || !formData.bankAccountNumber || !formData.ifscCode) {
            toast.error('Please fill bank details');
            return;
        }
    }
    if (step === 3) {
        if (!formData.businessName || !formData.businessAddress) {
            toast.error('Please fill business details');
            return;
        }
    }
    setStep(prev => prev + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.aadharDoc || !formData.addressProofDoc) {
        toast.error('Aadhar and Address Proof are mandatory');
        return;
    }

    try {
        setIsSubmitting(true);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user._id || user.id;

        const response = await fetch(`${BASE_URL}/supplier/apply/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            toast.success('Supplier application submitted!');
            navigate('/user/profile');
        } else {
            const err = await response.json();
            toast.error(err.message || 'Submission failed');
        }
    } catch (error) {
        toast.error('Error submitting application');
    } finally {
        setIsSubmitting(false);
    }
  };

  const benefits = [
    'Expand your business reach',
    'Direct access to retail partners',
    'Timely automated payments',
    'Simplified order management'
  ];

  if (showLanding) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50/50 min-h-[100dvh] flex flex-col font-body pb-32">
          <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/80 backdrop-blur-md p-6 border-b border-outline-variant/10">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface"><span className="material-symbols-outlined">arrow_back</span></button>
              <h1 className="font-headline font-black text-lg tracking-tighter uppercase">Supplier Program</h1>
              <div className="w-10"></div>
            </div>
          </header>
          <main className="pt-28 px-6 max-w-2xl mx-auto w-full flex flex-col items-center">
            <motion.section initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-12 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mx-auto mb-6"><span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>factory</span></div>
              <h2 className="text-4xl font-black tracking-tighter leading-none mb-6 text-on-surface">Become a<br/><span className="text-primary italic">Supplier</span></h2>
            </motion.section>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[3rem] p-10 w-full border border-outline-variant/5 shadow-sm mb-12">
              <div className="space-y-6">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20"><span className="material-symbols-outlined text-sm font-black">check</span></div>
                    <span className="text-lg font-black text-on-surface tracking-tight">{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.button onClick={() => setShowLanding(false)} whileTap={{ scale: 0.95 }} className="w-full max-w-sm bg-primary text-on-primary py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3">
              Start Application <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </motion.button>
          </main>
        </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50/50 text-on-background min-h-[100dvh] flex flex-col font-body">
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/80 backdrop-blur-md px-6 pt-6 pb-4 border-b border-outline-variant/10">
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => step === 1 ? setShowLanding(true) : setStep(prev => prev - 1)} className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined">{step === 1 ? 'close' : 'arrow_back'}</span>
                </button>
                <h1 className="font-headline font-black text-lg tracking-tighter uppercase">Supplier Registration</h1>
                <div className="w-10"></div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-outline-variant/10 rounded-full overflow-hidden">
                    <motion.div initial={{ width: '0%' }} animate={{ width: `${(step/4)*100}%` }} className="h-full bg-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0 tabular-nums">STEP 0{step} / 04</span>
            </div>
        </div>
      </header>

      <main className="pt-32 px-6 pb-32 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-12">
            {step === 1 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs">01</span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">Personal Details</h3>
                    </div>
                    <div className="space-y-4">
                        <input required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="FULL NAME" className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all" />
                        <input disabled value={formData.phone} placeholder="PHONE NUMBER" className="w-full p-6 bg-slate-100 border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none text-slate-400 cursor-not-allowed" />
                        <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="EMAIL ADDRESS" className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all" />
                        <textarea required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="RESIDENTIAL ADDRESS" rows={3} className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all resize-none" />
                    </div>
                </section>
            )}

            {step === 2 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs">02</span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">Bank Details</h3>
                    </div>
                    <div className="space-y-4">
                        <input required value={formData.bankAccountName} onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })} placeholder="ACCOUNT HOLDER NAME" className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all" />
                        <input required value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} placeholder="BANK NAME" className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input required value={formData.bankAccountNumber} onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} placeholder="ACCOUNT NUMBER" className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all" />
                            <input required value={formData.ifscCode} onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })} placeholder="IFSC CODE" className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all" />
                        </div>
                    </div>
                </section>
            )}

            {step === 3 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs">03</span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">Business Details</h3>
                    </div>
                    <div className="space-y-4">
                        <input required value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} placeholder="BUSINESS NAME" className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all" />
                        <select value={formData.businessType} onChange={(e) => setFormData({ ...formData, businessType: e.target.value })} className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all cursor-pointer">
                            <option>Manufacturer</option>
                            <option>Wholesaler</option>
                            <option>Distributor</option>
                            <option>Retailer</option>
                        </select>
                        <input value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} placeholder="GST NUMBER (OPTIONAL)" className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all" />
                        <textarea required value={formData.businessAddress} onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })} placeholder="BUSINESS ADDRESS" rows={3} className="w-full p-6 bg-surface-container-low border border-outline-variant/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-primary uppercase transition-all resize-none" />
                    </div>
                </section>
            )}

            {step === 4 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black text-xs">04</span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">Document Upload</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['gstDoc', 'udyogAadharDoc', 'aadharDoc', 'addressProofDoc'].map((field) => (
                            <div key={field} className="relative group">
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, field)} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                                <div className={`p-8 border-2 border-dashed rounded-[2rem] text-center transition-all ${formData[field] ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-primary/40'}`}>
                                    <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">{formData[field] ? 'task_alt' : 'cloud_upload'}</span>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{field.replace(/([A-Z])/g, ' $1')}</p>
                                    {formData[field] && <p className="text-[8px] font-bold text-primary mt-1 truncate max-w-[120px] mx-auto">File Loaded</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] font-bold text-on-surface-variant opacity-60 italic text-center px-4 uppercase tracking-widest">Aadhar and Address Proof are mandatory for verification.</p>
                </section>
            )}

            <div className="flex gap-4">
                {step < 4 ? (
                    <button type="button" onClick={handleNext} className="flex-1 bg-primary text-on-primary py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                        Continue <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                ) : (
                    <button type="submit" disabled={isSubmitting || uploading} className="flex-1 bg-primary text-on-primary py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                        {isSubmitting ? 'Submitting...' : 'Complete Registration'} <span className="material-symbols-outlined text-lg">verified</span>
                    </button>
                )}
            </div>
        </form>
      </main>
    </motion.div>
  );
};

export default RegisterAsSupplierPage;
