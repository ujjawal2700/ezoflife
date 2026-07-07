import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jobApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const format24hTo12h = (time24) => {
    if (!time24) return '';
    try {
        let [hours, minutes] = time24.split(':');
        let hr = parseInt(hours, 10);
        let ampm = 'AM';
        if (hr >= 12) {
            ampm = 'PM';
            if (hr > 12) hr -= 12;
        } else if (hr === 0) {
            hr = 12;
        }
        return `${hr.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (e) {
        return time24;
    }
};

const CareersPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [nameFilter, setNameFilter] = useState('');
    const [salaryFilter, setSalaryFilter] = useState('');
    const [salaryOpen, setSalaryOpen] = useState(false);

    const SALARY_OPTIONS = [
        { label: 'Any Salary', value: '' },
        { label: 'Up to ₹5,000', value: '5000' },
        { label: 'Up to ₹10,000', value: '10000' },
        { label: 'Up to ₹15,000', value: '15000' },
        { label: 'Up to ₹20,000', value: '20000' },
        { label: 'Up to ₹25,000', value: '25000' },
        { label: 'Up to ₹30,000', value: '30000' },
        { label: 'Up to ₹50,000', value: '50000' },
        { label: 'Up to ₹75,000', value: '75000' },
        { label: 'Up to ₹1,00,000', value: '100000' },
    ];
    const salaryLabel = SALARY_OPTIONS.find(o => o.value === salaryFilter)?.label || 'Any Salary';
    const [isApplied, setIsApplied] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [appliedJobIds, setAppliedJobIds] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [viewingAppStatus, setViewingAppStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('Jobs'); // 'Jobs' or 'Applied'
    const [loading, setLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(null);
    const [viewingJobDetails, setViewingJobDetails] = useState(null);
    const [applyForm, setApplyForm] = useState({
        applicantName: '',
        applicantEmail: '',
        applicantPhone: '',
        resume: null,
        coverLetter: ''
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const data = await jobApi.getActiveJobs();
            setJobs(Array.isArray(data) ? data : []);
            
            const userDataRaw = localStorage.getItem('userData') || localStorage.getItem('user') || '{}';
            const userData = JSON.parse(userDataRaw);
            const applicantId = userData._id || userData.id || userData.user?._id || userData.user?.id;
            if (applicantId) {
                try {
                    const appliedIds = await jobApi.getAppliedJobIds(applicantId);
                    setAppliedJobIds(Array.isArray(appliedIds) ? appliedIds : []);

                    const apps = await jobApi.getApplicantApplications(applicantId);
                    setMyApplications(Array.isArray(apps) ? apps : []);
                } catch (e) {
                    console.error('Fetch applied job IDs error:', e);
                }
            }
        } catch (error) {
            console.error('Fetch jobs error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        const userDataRaw = localStorage.getItem('userData') || localStorage.getItem('user') || '{}';
        const userData = JSON.parse(userDataRaw);
        const applicantId = userData._id || userData.id || userData.user?._id || userData.user?.id;

        if (!applicantId) {
            toast.error('Please login to apply for jobs.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('jobId', isApplying._id);
            formData.append('applicantId', applicantId);
            formData.append('applicantName', applyForm.applicantName);
            formData.append('applicantEmail', applyForm.applicantEmail);
            formData.append('creatorRole', isApplying.creatorRole || 'Vendor');
            if (isApplying.vendor?._id || isApplying.vendor) {
                formData.append('vendorId', isApplying.vendor?._id || isApplying.vendor);
            }
            formData.append('experience', applyForm.experience || 'Not Specified');
            formData.append('contactNumber', applyForm.applicantPhone);
            formData.append('coverLetter', applyForm.coverLetter);
            
            if (applyForm.resume) {
                formData.append('resume', applyForm.resume);
            }

            await jobApi.apply(formData);
            setIsApplied('Vendor');
            setIsApplying(null);
            setApplyForm({ applicantName: '', applicantEmail: '', applicantPhone: '', resume: null, coverLetter: '' });
            setTimeout(() => setIsApplied(false), 3000);
            fetchJobs(); 
        } catch (error) {
            toast.error(error.message || 'Application failed, please try again.');
        }
    };

    const filteredJobs = useMemo(() => {
        if (!Array.isArray(jobs)) return [];
        return jobs.filter(job => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                job.title.toLowerCase().includes(q) ||
                (job.description || '').toLowerCase().includes(q) ||
                (job.location || '').toLowerCase().includes(q) ||
                (job.companyName || '').toLowerCase().includes(q) ||
                (job.category || '').toLowerCase().includes(q) ||
                (job.jobType || '').toLowerCase().includes(q) ||
                (Array.isArray(job.skills) && job.skills.some(skill => skill.toLowerCase().includes(q))) ||
                (Array.isArray(job.requirements) && job.requirements.some(req => req.toLowerCase().includes(q)));

            const matchesName = !nameFilter ||
                job.title.toLowerCase().includes(nameFilter.toLowerCase());

            // Salary filter: extract number from salary string (e.g. "₹15000", "15,000", "15000/month")
            const matchesSalary = !salaryFilter || (() => {
                const salaryStr = (job.salary || '').replace(/[^\d]/g, ''); // remove all non-digits
                const salaryNum = parseInt(salaryStr, 10);
                const maxSalary = parseInt(salaryFilter, 10);
                return !isNaN(salaryNum) && salaryNum <= maxSalary;
            })();

            return matchesSearch && matchesName && matchesSalary;
        });
    }, [jobs, searchQuery, nameFilter, salaryFilter]);

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
    }), []);

    return (
        <div className="bg-slate-50/50 text-on-surface min-h-screen pb-32 font-body">
            <header className="px-6 pt-4 flex items-center mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface border border-outline-variant/10"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </motion.button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none">Careers</h1>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40 mt-1">Join the Ecosystem</p>
                    </div>
                </div>
            </header>

            <main className="px-4 max-w-2xl mx-auto">
                {/* Switcher Tabs */}
                <div className="bg-slate-100 p-1.5 rounded-2xl flex w-full mb-6 border border-slate-200/40 shadow-sm">
                    <button 
                        onClick={() => setActiveTab('Jobs')}
                        className={`flex-1 py-3 items-center justify-center gap-2 flex rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'Jobs' 
                            ? 'bg-white text-slate-900 shadow-sm font-black' 
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">work</span>
                        Active Jobs
                    </button>
                    <button 
                        onClick={() => setActiveTab('Applied')}
                        className={`flex-1 py-3 items-center justify-center gap-2 flex rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'Applied' 
                            ? 'bg-white text-slate-900 shadow-sm font-black' 
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                        Submitted Jobs
                        {myApplications.length > 0 && (
                            <span className="bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
                                {myApplications.length}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'Jobs' ? (
                    <>
                        {/* Search + Filters */}
                        <motion.div initial="hidden" animate="visible" variants={itemVariants} className="space-y-3 mb-6">
                            {/* Main Search */}
                            <div className="relative flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-outline-variant/10 transition-all">
                                <span className="material-symbols-outlined text-outline-variant mr-3 text-[20px]">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Search by keyboard"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold w-full placeholder:text-outline-variant/40"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-slate-300 hover:text-slate-500">
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                )}
                            </div>

                            {/* Name & Salary Filters */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Name Filter */}
                                <div className="relative flex items-center bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-outline-variant/10 transition-all">
                                    <span className="material-symbols-outlined text-outline-variant mr-2 text-[16px]">badge</span>
                                    <input 
                                        type="text" 
                                        placeholder="Filter by Name"
                                        value={nameFilter}
                                        onChange={(e) => setNameFilter(e.target.value)}
                                        className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-[11px] font-semibold w-full placeholder:text-outline-variant/40"
                                    />
                                    {nameFilter && (
                                        <button onClick={() => setNameFilter('')} className="text-slate-300 hover:text-slate-500 shrink-0">
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    )}
                                </div>

                                {/* Salary Custom Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setSalaryOpen(prev => !prev)}
                                        className="w-full flex items-center bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-outline-variant/10 transition-all gap-2"
                                    >
                                        <span className="material-symbols-outlined text-outline-variant text-[16px] shrink-0">payments</span>
                                        <span className={`text-[11px] font-semibold flex-1 text-left truncate ${salaryFilter ? 'text-slate-700' : 'text-outline-variant/60'}`}>
                                            {salaryLabel}
                                        </span>
                                        <span className={`material-symbols-outlined text-outline-variant text-[14px] shrink-0 transition-transform duration-200 ${salaryOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                    </button>

                                    {/* Dropdown Panel — opens upward, constrained inside screen */}
                                    <AnimatePresence>
                                        {salaryOpen && (
                                            <>
                                                {/* Backdrop to close */}
                                                <div
                                                    className="fixed inset-0 z-[40]"
                                                    onClick={() => setSalaryOpen(false)}
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute right-0 top-[calc(100%+6px)] z-[50] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden min-w-[160px]"
                                                >
                                                    {SALARY_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => { setSalaryFilter(opt.value); setSalaryOpen(false); }}
                                                            className={`w-full text-left px-4 py-2.5 text-[11px] font-semibold transition-colors ${
                                                                salaryFilter === opt.value
                                                                    ? 'bg-primary text-white'
                                                                    : 'text-slate-700 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Active filter chips */}
                            {(nameFilter || salaryFilter || searchQuery) && (
                                <div className="flex flex-wrap gap-2">
                                    {searchQuery && (
                                        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                                            <span className="material-symbols-outlined text-[12px]">search</span>
                                            {searchQuery}
                                            <button onClick={() => setSearchQuery('')}><span className="material-symbols-outlined text-[12px]">close</span></button>
                                        </span>
                                    )}
                                    {nameFilter && (
                                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                                            <span className="material-symbols-outlined text-[12px]">badge</span>
                                            {nameFilter}
                                            <button onClick={() => setNameFilter('')}><span className="material-symbols-outlined text-[12px]">close</span></button>
                                        </span>
                                    )}
                                    {salaryFilter && (
                                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                                            <span className="material-symbols-outlined text-[12px]">payments</span>
                                            {salaryLabel}
                                            <button onClick={() => setSalaryFilter('')}><span className="material-symbols-outlined text-[12px]">close</span></button>
                                        </span>
                                    )}
                                </div>
                            )}
                        </motion.div>

                        {/* Result Count */}
                        {!loading && (
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40 mb-4 px-1">
                                {filteredJobs.length} {filteredJobs.length === 1 ? 'Opening' : 'Openings'} Found
                            </p>
                        )}

                        {/* Job List */}
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-on-surface-variant opacity-40">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Prospecting Opportunities...</p>
                            </div>
                        ) : (
                            <motion.div 
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-4"
                            >
                                {filteredJobs.length > 0 ? (
                                    filteredJobs.map(job => (
                                        <motion.div 
                                            key={job._id}
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.01 }}
                                            className="bg-white rounded-[2rem] p-5 border border-outline-variant/5 shadow-sm space-y-3 overflow-hidden"
                                        >
                                            {/* Title Row */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-base tracking-tight text-on-surface truncate">{job.title}</h3>
                                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${job.creatorRole === 'Admin' ? 'text-indigo-600' : 'text-primary'}`}>
                                                        {job.creatorRole === 'Admin' ? (job.companyName || 'Official Post') : (job.vendor?.displayName || 'Vendor Post')}
                                                    </span>
                                                </div>
                                                {/* Location badge — fixed to right, won't overflow */}
                                                <div className="bg-surface-container-low px-2.5 py-1.5 rounded-xl border border-outline-variant/10 flex items-center gap-1 shrink-0 max-w-[120px]">
                                                    <span className="material-symbols-outlined text-[12px] text-primary shrink-0">location_on</span>
                                                    <span className="text-[8px] font-black uppercase tracking-wider truncate">{job.location}</span>
                                                </div>
                                            </div>

                                            {/* Meta Tags Row */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500">
                                                    <span className="material-symbols-outlined text-[11px]">group</span>
                                                    {job.applicantsCount || 0} Applicants
                                                </span>
                                                <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500">
                                                    <span className="material-symbols-outlined text-[11px]">schedule</span>
                                                    {job.shiftStartTime && job.shiftEndTime 
                                                        ? `${format24hTo12h(job.shiftStartTime)} - ${format24hTo12h(job.shiftEndTime)}`
                                                        : (job.jobType || 'Full Time')}
                                                </span>
                                                {job.salary && (
                                                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-800">
                                                        <span className="material-symbols-outlined text-[11px]">payments</span>
                                                        {job.salary}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Description */}
                                            {job.description && (
                                                <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed opacity-70 line-clamp-2">
                                                    "{job.description}"
                                                </p>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-2.5 mt-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => setViewingJobDetails(job)}
                                                    className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-[13px]">info</span>
                                                    View Details
                                                </button>
                                                {appliedJobIds.includes(job._id) ? (
                                                     <button 
                                                         type="button"
                                                         onClick={() => setViewingAppStatus(job._id)}
                                                         className="flex-[1.2] py-3 bg-white border border-slate-950 hover:bg-slate-50 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                     >
                                                         <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                         View Application Status
                                                     </button>
                                                 ) : (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setIsApplying(job)}
                                                        className="flex-[1.2] py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">rocket_launch</span>
                                                        Apply Now
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center opacity-40">
                                        <span className="material-symbols-outlined text-5xl mb-4">person_search</span>
                                        <p className="text-xs font-bold uppercase tracking-widest">No matching roles found.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </>
                ) : (
                    /* Submitted Jobs Tab View */
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4"
                    >
                        {myApplications.length > 0 ? (
                            myApplications.map(app => {
                                const job = app.job || app.jobId || {};
                                const rawStatus = app.status || 'Submitted';
                                const status = rawStatus === 'Pending' ? 'Submitted' : rawStatus;
                                
                                const STATUS_MAPPING = {
                                    'Submitted': { label: 'Applied', style: 'bg-amber-50 text-amber-600 border border-amber-100' },
                                    'Shortlisted': { label: 'Under Review / Screening', style: 'bg-indigo-50 text-indigo-600 border border-indigo-100' },
                                    'Interview Scheduled': { label: 'Interview Scheduled', style: 'bg-violet-50 text-violet-600 border border-violet-100' },
                                    'Post-Interview Review': { label: 'Under Review', style: 'bg-sky-50 text-sky-600 border border-sky-100' },
                                    'Background Check': { label: 'Background Check Initiated', style: 'bg-cyan-50 text-cyan-600 border border-cyan-100' },
                                    'Offer Generation': { label: 'Offer Pending', style: 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100' },
                                    'Offer Extended': { label: 'Offer Received', style: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
                                    'Pre-onboarding': { label: 'Onboarding', style: 'bg-teal-50 text-teal-600 border border-teal-100' },
                                    'Rejected': { label: 'Application Declined', style: 'bg-rose-50 text-rose-600 border border-rose-100' },
                                    'Candidate Withdrew': { label: 'Withdrawn', style: 'bg-slate-50 text-slate-600 border border-slate-100' }
                                };
                                
                                const mapped = STATUS_MAPPING[status] || { label: status, style: 'bg-slate-50 text-slate-600 border border-slate-100' };
                                const statusLabel = mapped.label;
                                const statusStyle = mapped.style;

                                return (
                                    <motion.div 
                                        key={app._id}
                                        variants={itemVariants}
                                        className="bg-white rounded-[2rem] p-5 border border-outline-variant/5 shadow-sm space-y-3.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider mb-2 ${statusStyle}`}>
                                                    {statusLabel}
                                                </span>
                                                <h3 className="font-black text-base tracking-tight text-on-surface truncate">{job.title || 'Job Position'}</h3>
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    {job.companyName || 'Corporate Post'}
                                                </span>
                                            </div>
                                            <div className="bg-surface-container-low px-2.5 py-1.5 rounded-xl border border-outline-variant/10 flex items-center gap-1 shrink-0">
                                                <span className="material-symbols-outlined text-[12px] text-primary shrink-0">location_on</span>
                                                <span className="text-[8px] font-black uppercase tracking-wider truncate">{job.location || 'N/A'}</span>
                                            </div>
                                        </div>

                                        {app.notes && (
                                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-bold text-slate-500 text-left leading-relaxed">
                                                <span className="font-extrabold text-slate-700">Note: </span>{app.notes}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                Applied: {new Date(app.createdAt).toLocaleDateString()}
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setViewingAppStatus(job._id || job)}
                                                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[13px]">analytics</span>
                                                Track Application
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="py-20 text-center opacity-40">
                                <span className="material-symbols-outlined text-5xl mb-4">work_history</span>
                                <p className="text-xs font-bold uppercase tracking-widest">No applications submitted yet.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </main>

            {/* Apply Modal */}
            <AnimatePresence>
                {isApplying && (
                    <div className="fixed inset-0 z-[120] flex items-end justify-center">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsApplying(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white w-full max-w-xl rounded-t-[3rem] p-8 pb-32 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Job Application</h3>
                                    <p className="text-[10px] font-bold text-primary uppercase mt-1">Applying for {isApplying.title}</p>
                                </div>
                                <button onClick={() => setIsApplying(null)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleApply} className="space-y-5">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name</label>
                                        <input 
                                            required
                                            value={applyForm.applicantName}
                                            onChange={e => setApplyForm({...applyForm, applicantName: e.target.value})}
                                            className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold border-transparent focus:bg-white focus:border-primary/20 transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Address</label>
                                            <input 
                                                required
                                                type="email"
                                                value={applyForm.applicantEmail}
                                                onChange={e => setApplyForm({...applyForm, applicantEmail: e.target.value})}
                                                className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold border-transparent focus:bg-white focus:border-primary/20 transition-all"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Phone Number</label>
                                            <input 
                                                required
                                                value={applyForm.applicantPhone}
                                                onChange={e => setApplyForm({...applyForm, applicantPhone: e.target.value})}
                                                className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold border-transparent focus:bg-white focus:border-primary/20 transition-all"
                                                placeholder="+91 0000000000"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Upload Resume (PDF/JPG)</label>
                                        <div className="relative">
                                            <input 
                                                required
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={e => setApplyForm({...applyForm, resume: e.target.files[0]})}
                                                className="hidden"
                                                id="resume-upload"
                                            />
                                            <label 
                                                htmlFor="resume-upload"
                                                className="w-full bg-slate-50 rounded-2xl p-5 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-primary/30 transition-all group"
                                            >
                                                {applyForm.resume ? (
                                                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                                        <span className="material-symbols-outlined">description</span>
                                                        {applyForm.resume.name}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-3xl mb-1">cloud_upload</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select File</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Brief Cover Note</label>
                                        <textarea 
                                            value={applyForm.coverLetter}
                                            onChange={e => setApplyForm({...applyForm, coverLetter: e.target.value})}
                                            className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold border-transparent focus:bg-white focus:border-primary/20 transition-all min-h-[100px]"
                                            placeholder="Tell us why you're a good fit..."
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    className="w-full py-5 bg-primary text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all mt-2"
                                >
                                    Submit Application
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Success Toast */}
            <AnimatePresence>
                {isApplied && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-10 left-6 right-6 z-[100]"
                    >
                        <div className="bg-primary text-on-primary rounded-2xl p-5 shadow-2xl flex items-center gap-4 border border-white/20">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <span className="material-symbols-outlined">send</span>
                            </div>
                            <div>
                                <p className="font-black text-[13px] leading-none mb-1">Application Sent</p>
                                <p className="text-[10px] font-bold opacity-80">The {isApplied === 'Admin' ? 'admin' : 'vendor'} team has been notified.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Details Modal */}
            <AnimatePresence>
                {viewingJobDetails && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingJobDetails(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl relative z-10 max-h-[85vh] overflow-y-auto no-scrollbar text-slate-900 border border-slate-200"
                        >
                            {/* Close Button */}
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Job Details</h3>
                                <button
                                    onClick={() => setViewingJobDetails(null)}
                                    className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>

                            {/* Job Info Container */}
                            <div className="space-y-5">
                                {/* Header Info */}
                                <div>
                                    <h2 className="font-black text-lg tracking-tight text-slate-950 leading-tight">
                                        {viewingJobDetails.title}
                                    </h2>
                                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 block mt-1">
                                        {viewingJobDetails.creatorRole === 'Admin' ? (viewingJobDetails.companyName || 'Official Post') : (viewingJobDetails.vendor?.displayName || 'Vendor Post')}
                                    </span>
                                    <span className="inline-flex items-center gap-1 mt-2 text-[8px] font-black text-slate-700 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[10px] text-slate-900">location_on</span>
                                        {viewingJobDetails.location}
                                    </span>
                                </div>

                                {/* Description */}
                                {viewingJobDetails.description && (
                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic border-l-2 border-slate-200 pl-3 block py-0.5">
                                        "{viewingJobDetails.description}"
                                    </p>
                                )}

                                {/* Requirements/Responsibilities */}
                                {Array.isArray(viewingJobDetails.requirements) && viewingJobDetails.requirements.length > 0 && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Responsibilities & Requirements</p>
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                                            {viewingJobDetails.requirements.map((req, idx) => (
                                                <p key={idx} className="text-[10px] font-medium text-slate-600 flex items-start gap-2 leading-relaxed">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 mt-1.5 shrink-0" />
                                                    <span>{req}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Badges Grid */}
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                                    <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl flex flex-col gap-1">
                                        <span className="material-symbols-outlined text-sm text-slate-400">payments</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Salary</span>
                                        <span className="text-[10px] font-black text-slate-800">{viewingJobDetails.salary || 'Not Disclosed'}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl flex flex-col gap-1">
                                        <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Timings</span>
                                        <span className="text-[10px] font-black text-slate-800">
                                            {viewingJobDetails.shiftStartTime && viewingJobDetails.shiftEndTime
                                                ? `${format24hTo12h(viewingJobDetails.shiftStartTime)} - ${format24hTo12h(viewingJobDetails.shiftEndTime)}`
                                                : (viewingJobDetails.jobType || 'Full Time')}
                                        </span>
                                    </div>
                                </div>

                                {/* Apply Action in Modal */}
                                <div className="pt-3">
                                    {appliedJobIds.includes(viewingJobDetails._id) ? (
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setViewingAppStatus(viewingJobDetails._id);
                                                setViewingJobDetails(null);
                                            }}
                                            className="w-full py-4 bg-white border border-slate-950 hover:bg-slate-50 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm"
                                        >
                                            View Application Status
                                        </button>
                                    ) : (
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsApplying(viewingJobDetails);
                                                setViewingJobDetails(null);
                                            }}
                                            className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-[0.98] transition-all shadow-lg shadow-slate-950/10"
                                        >
                                            Apply Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Tracking Status Modal */}
            <AnimatePresence>
                {viewingAppStatus && (() => {
                    const app = myApplications.find(a => (a.job?._id || a.jobId?._id || a.job || a.jobId) === viewingAppStatus);
                    if (!app) return null;
                    const rawStatus = app.status || 'Submitted';
                    const status = rawStatus === 'Pending' ? 'Submitted' : rawStatus;
                    const isRejected = status === 'Rejected';
                    const isWithdrawn = status === 'Candidate Withdrew';
                    
                    // Determine active step
                    let step = 1;
                    if (status === 'Shortlisted') step = 2;
                    else if (status === 'Interview Scheduled' || status === 'Post-Interview Review') step = 3;
                    else if (status === 'Background Check') step = 4;
                    else if (status === 'Offer Generation' || status === 'Offer Extended') step = 5;
                    else if (status === 'Pre-onboarding') step = 6;

                    const steps = [
                        { id: 1, label: 'Applied', desc: 'Application received successfully' },
                        { id: 2, label: 'Screening', desc: 'Evaluating resume against requirements' },
                        { id: 3, label: 'Interviewing', desc: status === 'Post-Interview Review' ? 'Reviewing interview feedback' : 'Hiring discussion / Interview scheduled' },
                        { id: 4, label: 'Verification', desc: 'Reference and background check' },
                        { id: 5, label: 'Offer', desc: status === 'Offer Extended' ? 'Offer letter extended!' : 'Drafting salary & contract details' },
                        { id: 6, label: 'Onboarding', desc: 'Pre-onboarding and joining setup' }
                    ];

                    return (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setViewingAppStatus(null)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl relative z-10 text-slate-900 border border-slate-200"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Application Tracker</h3>
                                        <h2 className="font-black text-lg tracking-tight text-slate-950 leading-tight mt-1">
                                            {app.job?.title || 'Job Position'}
                                        </h2>
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary block mt-0.5">
                                            {app.job?.creatorRole === 'Admin' ? (app.job?.companyName || 'Official Post') : (app.job?.companyName || 'Partner Post')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setViewingAppStatus(null)}
                                        className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>

                                {isRejected || isWithdrawn ? (
                                    <div className="space-y-4 py-4 text-center">
                                        <div className={`w-16 h-16 ${isRejected ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-100 border-slate-200 text-slate-500'} border rounded-full flex items-center justify-center mx-auto`}>
                                            <span className="material-symbols-outlined text-3xl">{isRejected ? 'cancel' : 'do_not_disturb_on'}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className={`font-black text-base ${isRejected ? 'text-rose-600' : 'text-slate-600'} uppercase tracking-wide`}>
                                                {isRejected ? 'Application Declined' : 'Application Withdrawn'}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-bold leading-relaxed px-4">
                                                {isRejected 
                                                    ? 'Thank you for your interest in this role. We appreciate your time, but we are not moving forward with your application at this stage.' 
                                                    : 'You have cancelled your application for this position or declined the interview invitation.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative pl-8 space-y-6 py-2 border-l border-slate-200 ml-4">
                                        {steps.map((st) => {
                                            const isActive = step >= st.id;
                                            const isCurrent = step === st.id;
                                            return (
                                                <div key={st.id} className="relative">
                                                    {/* Step Dot Indicator */}
                                                    <span className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                        isActive 
                                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                                                        : 'bg-white border-slate-200 text-slate-400'
                                                    }`}>
                                                        {isActive ? (
                                                            <span className="material-symbols-outlined text-[14px] font-black">check</span>
                                                        ) : (
                                                            <span className="text-[10px] font-black">{st.id}</span>
                                                        )}
                                                    </span>

                                                    {/* Step Details */}
                                                    <div>
                                                        <h4 className={`text-xs font-black uppercase tracking-wider ${
                                                            isCurrent 
                                                            ? 'text-slate-900 font-black' 
                                                            : isActive 
                                                            ? 'text-slate-700 font-bold' 
                                                            : 'text-slate-400'
                                                        }`}>
                                                            {st.label}
                                                        </h4>
                                                        <p className={`text-[10px] font-medium leading-none mt-0.5 ${isActive ? 'text-slate-500' : 'text-slate-300'}`}>
                                                            {st.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {app.notes && (
                                     <div className="bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20 mt-6 text-left">
                                         <p className="text-[8px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1">
                                             <span className="material-symbols-outlined text-[12px]">info</span>
                                             Feedback / Notes
                                         </p>
                                         <p className="text-slate-800 font-medium mt-1 leading-relaxed text-xs">
                                             {app.notes}
                                         </p>
                                     </div>
                                 )}

                                 <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                     <span>Applied On:</span>
                                     <span className="text-slate-800 font-black">{new Date(app.createdAt).toLocaleDateString()}</span>
                                 </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            {/* Backdrop Visuals */}
            <div className="fixed bottom-[10%] -left-20 w-80 h-80 bg-tertiary/5 rounded-full blur-[80px] pointer-events-none"></div>
        </div>
    );
};

export default CareersPage;
