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
    const [viewingProposal, setViewingProposal] = useState(null);

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
                                                    const rawStatus = inq.status || 'Creative Pending Review';
                                                    let status = rawStatus;
                                                    if (rawStatus === 'New Application') status = 'Creative Pending Review';
                                                    else if (rawStatus === 'Requested More Info') status = 'Content Review';
                                                    else if (rawStatus === 'Scheduled Meeting') status = 'Scheduled';
                                                    else if (rawStatus === 'Final Proposal') status = 'Running';

                                                    const STATUS_MAP = {
                                                        'Creative Pending Review': { label: 'Submitted', color: 'bg-slate-100 text-slate-800 border-slate-200' },
                                                        'Content Review': { label: 'Under Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                                                        'Invoice Generated': { label: 'Payment Required', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                                                        'Scheduled': { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                                                        'Running': { label: 'Active', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                                                        'Campaign Ended': { label: 'Completed', color: 'bg-slate-100 text-slate-400 border-slate-200' },
                                                        'Paused by Admin': { label: 'Paused', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                                                        'Rejected': { label: 'Declined', color: 'bg-rose-50 text-rose-700 border-rose-200' }
                                                    };
                                                    const mapped = STATUS_MAP[status] || { label: status, color: 'bg-slate-100 text-slate-800 border-slate-200' };
                                                    const displayStatus = mapped.label;
                                                    const badgeColor = mapped.color;
                                                    return (
                                                        <tr 
                                                            key={inq._id} 
                                                            className="hover:bg-slate-50/70 active:bg-slate-100 transition-all cursor-pointer group"
                                                            onClick={() => setViewingProposal(inq)}
                                                        >
                                                            <td className="px-6 py-5">
                                                                <p className="text-xs font-black text-slate-900 leading-none">{inq.brandName}</p>
                                                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{inq.location}</p>
                                                                {inq.notes && (
                                                                    <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold text-slate-500 max-w-[200px] leading-relaxed">
                                                                        <span className="font-extrabold text-slate-700">Note: </span>{inq.notes}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-5 text-xs font-bold text-slate-600">
                                                                ₹{inq.budget?.toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <span className={`px-2.5 py-1 text-[8px] font-black rounded-full uppercase tracking-wider border whitespace-nowrap ${badgeColor}`}>
                                                                    {displayStatus}
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

            <AnimatePresence>
                {viewingProposal && (() => {
                    const rawStatus = viewingProposal.status || 'Creative Pending Review';
                    const STATUS_MAP = {
                        'Creative Pending Review': { label: 'Submitted', color: 'bg-slate-100 text-slate-800 border-slate-200' },
                        'Content Review': { label: 'Under Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        'Invoice Generated': { label: 'Payment Required', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        'Scheduled': { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        'Running': { label: 'Active', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                        'Campaign Ended': { label: 'Completed', color: 'bg-slate-100 text-slate-400 border-slate-200' },
                        'Paused by Admin': { label: 'Paused', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                        'Rejected': { label: 'Declined', color: 'bg-rose-50 text-rose-700 border-rose-200' }
                    };
                    const status = rawStatus === 'New Application' ? 'Creative Pending Review' : rawStatus;
                    const mapped = STATUS_MAP[status] || { label: status, color: 'bg-slate-100 text-slate-800 border-slate-200' };

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setViewingProposal(null)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl relative z-10 text-slate-900 border border-slate-200 overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider mb-2 inline-block border ${mapped.color}`}>
                                            {mapped.label}
                                        </span>
                                        <h2 className="font-black text-xl tracking-tight text-slate-950 leading-tight">
                                            {viewingProposal.brandName}
                                        </h2>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Proposal Details</p>
                                    </div>
                                    <button
                                        onClick={() => setViewingProposal(null)}
                                        className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>

                                <div className="space-y-4 text-xs font-semibold text-slate-600">
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Target Location</p>
                                            <p className="text-slate-900 font-bold mt-0.5">{viewingProposal.location}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Monthly Budget</p>
                                            <p className="text-slate-900 font-bold mt-0.5">₹{viewingProposal.budget?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Campaign Timeline</p>
                                            <p className="text-slate-900 font-bold mt-0.5">{viewingProposal.timeline}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Submitted On</p>
                                            <p className="text-slate-900 font-bold mt-0.5">{new Date(viewingProposal.createdAt).toLocaleDateString('en-GB')}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Email Address</p>
                                            <p className="text-slate-900 font-bold mt-0.5">{viewingProposal.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Phone Number</p>
                                            <p className="text-slate-900 font-bold mt-0.5">{viewingProposal.phone}</p>
                                        </div>
                                    </div>

                                    {viewingProposal.notes && (
                                        <div className="bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">info</span>
                                                Feedback / Notes
                                            </p>
                                            <p className="text-slate-800 font-medium mt-1 leading-relaxed text-xs">
                                                {viewingProposal.notes}
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button 
                                            onClick={() => setViewingProposal(null)}
                                            className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Close Window
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};

export default AdvertiseWithUsPage;
