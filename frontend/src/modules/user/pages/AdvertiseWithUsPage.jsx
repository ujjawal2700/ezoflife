import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { mediaApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const AdvertiseWithUsPage = () => {
    const navigate = useNavigate();

    // User Context
    const userDataRaw = localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
    const userData = JSON.parse(userDataRaw);
    const userEmail = userData.email || userData.user?.email || '';

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('Submit Proposal');
    const [myInquiries, setMyInquiries] = useState([]);
    const [fetchingInquiries, setFetchingInquiries] = useState(false);

    // Location specific states
    const [locationType, setLocationType] = useState('Pan India'); // 'Pan India' or 'Custom'
    const [stateName, setStateName] = useState('');
    const [cityName, setCityName] = useState('');

    const [formData, setFormData] = useState({ 
        brandName: '', 
        email: userEmail || localStorage.getItem('last_b2b_email') || '',
        phone: '', 
        location: 'Pan India',
        budget: '', 
        timeline: 'Launch Boost' 
    });

    const fetchMyInquiries = async () => {
        const emailToQuery = userEmail || localStorage.getItem('last_b2b_email') || formData.email;
        if (!emailToQuery) return;
        try {
            setFetchingInquiries(true);
            const data = await mediaApi.getMyInquiries(emailToQuery);
            setMyInquiries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch inquiries:', error);
        } finally {
            setFetchingInquiries(false);
        }
    };

    useEffect(() => {
        const emailToQuery = userEmail || localStorage.getItem('last_b2b_email') || formData.email;
        if (emailToQuery) {
            fetchMyInquiries();
        }
    }, [userEmail, formData.email]);

    const campaignTypes = useMemo(() => ['Launch Boost', 'Retainer', 'One-Off'], []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const submittedEmail = formData.email || userEmail;
            if (submittedEmail) {
                localStorage.setItem('last_b2b_email', submittedEmail);
            }
            await mediaApi.submitInquiry({ ...formData, email: submittedEmail });
            toast.success('Inquiry submitted!');
            fetchMyInquiries();
            setIsSubmitted(true);
            setTimeout(() => {
                setActiveTab('Track Proposals');
                setIsSubmitted(false);
                setLocationType('Pan India');
                setStateName('');
                setCityName('');
                setFormData({
                    brandName: '',
                    email: submittedEmail,
                    phone: '',
                    location: 'Pan India',
                    budget: '',
                    timeline: 'Launch Boost'
                });
            }, 2500);
        } catch (error) {
            toast.error('Failed to submit. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 10, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
    }), []);

    return (
        <div className="bg-slate-50/50 text-on-surface min-h-[100dvh] pb-24 flex flex-col overflow-x-hidden font-body">
            <header className="px-6 pt-4 flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface border border-outline-variant/10"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </motion.button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none">Advertise</h1>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40 mt-1">Sponsorships & Marketing</p>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="px-6 mb-6 max-w-md mx-auto w-full">
                <div className="bg-white p-1 rounded-2xl border border-slate-100 flex shadow-sm">
                    {['Submit Proposal', 'Track Proposals'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setIsSubmitted(false);
                            }}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <motion.main 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="px-6 max-w-md mx-auto w-full flex-grow"
            >
                <AnimatePresence mode="wait">
                    {activeTab === 'Submit Proposal' ? (
                        !isSubmitted ? (
                            <motion.form 
                                key="form"
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ opacity: 0, scale: 0.95 }}
                                onSubmit={handleSubmit}
                                className="bg-white p-10 rounded-[3rem] border border-outline-variant/10 shadow-lg space-y-10"
                            >
                                <header>
                                    <h3 className="text-2xl font-black tracking-tighter text-on-surface mb-2 leading-none">Campaign Inquiry</h3>
                                    <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-widest leading-none">Brief our advertising team.</p>
                                </header>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Brand Name</label>
                                        <div className="bg-surface-container-low rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:bg-white transition-all">
                                            <input 
                                                required 
                                                type="text" 
                                                placeholder="e.g. Nike" 
                                                value={formData.brandName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Contact Email</label>
                                        <div className="bg-surface-container-low rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:bg-white transition-all">
                                            <input 
                                                required 
                                                type="email" 
                                                placeholder="marketing@nike.com" 
                                                value={formData.email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Contact Number</label>
                                            <div className="bg-surface-container-low rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:bg-white transition-all">
                                                <input 
                                                    required 
                                                    type="tel" 
                                                    pattern="[0-9]{10}"
                                                    maxLength="10"
                                                    placeholder="10 digit number" 
                                                    value={formData.phone}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        if (val.length <= 10) {
                                                            setFormData(prev => ({ ...prev, phone: val }));
                                                        }
                                                    }}
                                                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Target Location</label>
                                            <div className="flex gap-2 p-1.5 bg-white border border-slate-300 rounded-[2rem] shadow-sm">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setLocationType('Pan India');
                                                        setFormData(prev => ({ ...prev, location: 'Pan India' }));
                                                    }}
                                                    className={`flex-1 py-3 rounded-2xl text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                                                        locationType === 'Pan India' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'
                                                    }`}
                                                >
                                                    Pan India
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setLocationType('Custom');
                                                        setFormData(prev => ({ ...prev, location: cityName ? `${cityName}, ${stateName}` : stateName }));
                                                    }}
                                                    className={`flex-1 py-3 rounded-2xl text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                                                        locationType === 'Custom' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'
                                                    }`}
                                                >
                                                    Custom
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {locationType === 'Custom' && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="grid grid-cols-2 gap-4 overflow-hidden pt-2"
                                            >
                                                <div>
                                                    <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">State</label>
                                                    <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                                        <input 
                                                            required={locationType === 'Custom'}
                                                            type="text" 
                                                            placeholder="e.g. Maharashtra" 
                                                            value={stateName}
                                                            onChange={(e) => {
                                                                const s = e.target.value;
                                                                setStateName(s);
                                                                setFormData(prev => ({ ...prev, location: cityName ? `${cityName}, ${s}` : s }));
                                                            }}
                                                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">City (Optional)</label>
                                                    <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                                        <input 
                                                            type="text" 
                                                            placeholder="e.g. Mumbai" 
                                                            value={cityName}
                                                            onChange={(e) => {
                                                                const c = e.target.value;
                                                                setCityName(c);
                                                                setFormData(prev => ({ ...prev, location: c ? `${c}, ${stateName}` : stateName }));
                                                            }}
                                                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Monthly Budget (₹)</label>
                                        <div className="bg-surface-container-low rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:bg-white transition-all flex items-center">
                                            <span className="text-on-surface font-black mr-2 opacity-50">₹</span>
                                            <input 
                                                required 
                                                type="number" 
                                                placeholder="50,000" 
                                                value={formData.budget}
                                                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Campaign Timeline</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {campaignTypes.map(type => (
                                                <button 
                                                    type="button" 
                                                    key={type} 
                                                    onClick={() => setFormData(prev => ({ ...prev, timeline: type }))}
                                                    className={`px-5 py-4 border rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all text-left ${
                                                        formData.timeline === type ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 hover:bg-primary/5 hover:border-primary/20'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-full py-5 bg-primary-gradient text-on-primary font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/30 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {submitting ? 'Submitting...' : 'Request Proposal'}
                                </motion.button>
                            </motion.form>
                        ) : (
                            <motion.div 
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[3rem] p-12 text-center border border-outline-variant/10 shadow-2xl shadow-primary/10"
                            >
                                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-8 text-success border border-success/20">
                                    <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                </div>
                                <h2 className="text-3xl font-black tracking-tighter mb-4 leading-none">Campaign Slated</h2>
                                <p className="text-on-surface-variant text-sm font-bold opacity-60 leading-relaxed mb-10">Our advertising specialists will draft a tailored proposal and contact your team within 24 hours.</p>
                                <button 
                                    onClick={() => setActiveTab('Track Proposals')}
                                    className="bg-slate-900 text-white hover:bg-black px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-950/20"
                                >
                                    Track My Application
                                </button>
                            </motion.div>
                        )
                    ) : (
                        <motion.div 
                            key="tracking"
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-6"
                        >
                            {fetchingInquiries ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-950 rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Campaigns...</p>
                                </div>
                            ) : myInquiries.length > 0 ? (
                                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Budget</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stage</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {myInquiries.map((inq) => {
                                                    const status = inq.status || 'New Application';
                                                    let badgeColor = 'bg-slate-100 text-slate-800 border-slate-200';
                                                    if (status === 'Requested More Info') {
                                                        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                                                    } else if (status === 'Scheduled Meeting') {
                                                        badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                                                    } else if (status === 'Final Proposal') {
                                                        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                                    }
                                                    return (
                                                        <tr key={inq._id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-5">
                                                                <p className="text-xs font-black text-slate-900 leading-none">{inq.brandName}</p>
                                                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{inq.location}</p>
                                                            </td>
                                                            <td className="px-6 py-5 text-xs font-bold text-slate-600">
                                                                ₹{inq.budget?.toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <span className={`px-2.5 py-1 text-[8px] font-black rounded-full uppercase tracking-wider border whitespace-nowrap ${badgeColor}`}>
                                                                    {status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 text-center shadow-sm">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">assignment_late</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active campaigns found</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.main>
        </div>
    );
};

export default AdvertiseWithUsPage;
