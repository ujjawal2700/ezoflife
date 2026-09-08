import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { partnershipApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const STATUS_MAPPING = {
    'Lead Received': { label: 'Form Submitted', colors: 'bg-slate-100 text-slate-800 border-slate-200' },
    'Under Verification': { label: 'Under Review', colors: 'bg-amber-50 text-amber-700 border-amber-200' },
    'Proposal Sent': { label: 'Proposal Sent', colors: 'bg-purple-50 text-purple-700 border-purple-200' },
    'Contract Drafting': { label: 'Agreement Pending', colors: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    'Account Setup': { label: 'Profile Configuration', colors: 'bg-blue-50 text-blue-700 border-blue-200' },
    'Active': { label: 'Active Partner', colors: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'Suspended': { label: 'Account Paused', colors: 'bg-orange-50 text-orange-700 border-orange-200' },
    'Rejected': { label: 'Application Closed', colors: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const getMappedStatus = (rawStatus) => {
    let normalized = rawStatus || 'Lead Received';
    if (normalized === 'New Application') normalized = 'Lead Received';
    else if (normalized === 'Requested More Info') normalized = 'Under Verification';
    else if (normalized === 'Scheduled Meeting') normalized = 'Proposal Sent';
    else if (normalized === 'Final Proposal') normalized = 'Contract Drafting';

    return STATUS_MAPPING[normalized] || { label: normalized, colors: 'bg-slate-100 text-slate-800 border-slate-200' };
};

const PartnershipInquiryPage = () => {
    const navigate = useNavigate();
    
    // User Context
    const userDataRaw = localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
    const userData = JSON.parse(userDataRaw);
    const userEmail = userData.email || userData.user?.email || '';

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('Submit Proposal');
    const [myProposals, setMyProposals] = useState([]);
    const [fetchingProposals, setFetchingProposals] = useState(false);

    // Location specific states
    const [locationType, setLocationType] = useState('Pan India'); // 'Pan India' or 'Custom'
    const [stateName, setStateName] = useState('');
    const [cityName, setCityName] = useState('');

    const [formData, setFormData] = useState({
        companyName: '',
        email: userEmail || localStorage.getItem('last_b2b_email') || '',
        phone: '',
        location: 'Pan India',
        website: '',
        partnershipType: 'Logistics',
        proposal: ''
    });

    const fetchMyProposals = async () => {
        const emailToQuery = userEmail || localStorage.getItem('last_b2b_email') || formData.email;
        if (!emailToQuery) return;
        try {
            setFetchingProposals(true);
            const data = await partnershipApi.getMyInquiries(emailToQuery);
            setMyProposals(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch proposals:', error);
        } finally {
            setFetchingProposals(false);
        }
    };

    useEffect(() => {
        const emailToQuery = userEmail || localStorage.getItem('last_b2b_email') || formData.email;
        if (emailToQuery) {
            fetchMyProposals();
        }
    }, [userEmail, formData.email]);

    const partnershipTypes = useMemo(() => ['Logistics', 'Supplies', 'Marketing', 'Technology'], []);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const submittedEmail = formData.email || userEmail;
            if (submittedEmail) {
                localStorage.setItem('last_b2b_email', submittedEmail);
            }
            await partnershipApi.submit({ ...formData, email: submittedEmail });
            toast.success('Proposal submitted successfully!');
            fetchMyProposals();
            setIsSubmitted(true);
            setTimeout(() => {
                setActiveTab('Track Proposals');
                setIsSubmitted(false);
                setLocationType('Pan India');
                setStateName('');
                setCityName('');
                setFormData({
                    companyName: '',
                    email: submittedEmail,
                    phone: '',
                    location: 'Pan India',
                    website: '',
                    partnershipType: 'Logistics',
                    proposal: ''
                });
            }, 2500);
        } catch (error) {
            toast.error('Failed to submit proposal.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-slate-50/50 text-on-surface min-h-[100dvh] pb-24 flex flex-col overflow-x-hidden font-body">
            <header className="px-6 pt-4 flex items-center mb-6">
                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface border border-outline-variant/10"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </motion.button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none">Partnerships</h1>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40 mt-1">Industrial & B2B Inquiries</p>
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
                                className="space-y-8"
                            >
                                <div className="space-y-6">
                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Company / Individual Name</label>
                                        <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            <input 
                                                required 
                                                type="text" 
                                                placeholder="e.g. Acme Logistics" 
                                                value={formData.companyName}
                                                onChange={(e) => setFormData(p => ({ ...p, companyName: e.target.value }))}
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Contact Email</label>
                                        <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            <input 
                                                required 
                                                type="email" 
                                                placeholder="partnership@company.com" 
                                                value={formData.email}
                                                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Phone Number</label>
                                            <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                                <input 
                                                    required 
                                                    type="tel" 
                                                    pattern="[0-9]{10}"
                                                    maxLength="10"
                                                    placeholder="Enter 10 digit number" 
                                                    value={formData.phone}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        if (val.length <= 10) {
                                                            setFormData(p => ({ ...p, phone: val }));
                                                        }
                                                    }}
                                                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Base Location</label>
                                            <div className="flex gap-2 p-1.5 bg-white border border-slate-300 rounded-[2rem] shadow-sm">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setLocationType('Pan India');
                                                        setFormData(p => ({ ...p, location: 'Pan India' }));
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
                                                        setFormData(p => ({ ...p, location: cityName ? `${cityName}, ${stateName}` : stateName }));
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
                                                                setFormData(p => ({ ...p, location: cityName ? `${cityName}, ${s}` : s }));
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
                                                                setFormData(p => ({ ...p, location: c ? `${c}, ${stateName}` : stateName }));
                                                            }}
                                                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Website (Optional)</label>
                                        <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            <input 
                                                type="url" 
                                                placeholder="https://company.com" 
                                                value={formData.website}
                                                onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))}
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-md font-black placeholder:text-outline-variant/40" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Partnership Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {partnershipTypes.map(type => (
                                                <button 
                                                    type="button" 
                                                    key={type} 
                                                    onClick={() => setFormData(p => ({ ...p, partnershipType: type }))}
                                                    className={`px-5 py-4 border rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all ${
                                                        formData.partnershipType === type ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 hover:bg-primary/5 hover:border-primary/20'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1">Brief Proposal</label>
                                        <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                            <textarea 
                                                required
                                                rows={4} 
                                                placeholder="How can we grow together?" 
                                                value={formData.proposal}
                                                onChange={(e) => setFormData(p => ({ ...p, proposal: e.target.value }))}
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-sm font-bold placeholder:text-outline-variant/40 resize-none" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-full py-5.5 bg-primary-gradient text-on-primary font-headline font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary/30 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Inquiry'}
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
                                <h2 className="text-3xl font-black tracking-tighter mb-4">Inquiry Received</h2>
                                <p className="text-on-surface-variant text-sm font-bold opacity-60 leading-relaxed mb-10">Our B2B team will review your proposal and reach out within 48 business hours.</p>
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
                            {fetchingProposals ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-950 rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Proposals...</p>
                                </div>
                            ) : myProposals.length > 0 ? (
                                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stage</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {myProposals.map((prop) => {
                                                    const mapped = getMappedStatus(prop.status);
                                                    return (
                                                        <tr key={prop._id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-5">
                                                                <p className="text-xs font-black text-slate-900 leading-none">{prop.companyName}</p>
                                                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{prop.location}</p>
                                                                {prop.notes && (
                                                                    <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-bold text-slate-500 text-left leading-normal max-w-xs whitespace-normal break-words">
                                                                        <span className="font-extrabold text-slate-700">Note: </span>{prop.notes}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-5 text-xs font-bold text-slate-600">
                                                                {prop.partnershipType}
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <span className={`px-2.5 py-1 text-[8px] font-black rounded-full uppercase tracking-wider border whitespace-nowrap ${mapped.colors}`}>
                                                                    {mapped.label}
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
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active proposals found</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.main>

            <footer className="mt-12 text-center py-10 opacity-20">
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Spinzyt Partnerships HQ 2026</span>
            </footer>
        </div>
    );
};

export default PartnershipInquiryPage;

