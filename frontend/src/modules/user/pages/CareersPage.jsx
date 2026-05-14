import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jobApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const CareersPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isApplied, setIsApplied] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(null); // Will store the job being applied to
    const [applyForm, setApplyForm] = useState({
        applicantName: '',
        applicantEmail: '',
        applicantPhone: '',
        resume: null, // Changed from resumeLink string to resume file object
        coverLetter: ''
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const data = await jobApi.getActiveJobs();
            setJobs(Array.isArray(data) ? data : []);
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
            toast.error('Application failed, please try again.');
        }
    };

    
    const filteredJobs = useMemo(() => {
        if (!Array.isArray(jobs)) return [];
        return jobs.filter(job => 
            job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            job.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [jobs, searchQuery]);

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
            <header className="px-6 pt-4 flex items-center mb-8 relative overflow-hidden">
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
                        <h1 className="text-2xl font-black tracking-tighter italic leading-none">Careers</h1>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40 mt-1">Join the Ecosystem</p>
                    </div>
                </div>
            </header>

            <main className="px-6 max-w-2xl mx-auto">
                {/* Search Orchestrator */}
                <motion.div initial="hidden" animate="visible" variants={itemVariants} className="space-y-6 mb-10">
                    <div className="relative flex items-center bg-white rounded-3xl px-6 py-4 shadow-sm border border-outline-variant/10 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <span className="material-symbols-outlined text-outline-variant mr-3">search</span>
                        <input 
                            type="text" 
                            placeholder="Search by Skill or Location"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold w-full placeholder:text-outline-variant/40"
                        />
                    </div>
                </motion.div>

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
                                    className="bg-white rounded-[2rem] p-6 border border-outline-variant/5 shadow-sm space-y-4"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-black text-lg tracking-tight text-on-surface mb-1">{job.title}</h3>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${job.creatorRole === 'Admin' ? 'text-indigo-600' : 'text-primary'}`}>
                                                    {job.creatorRole === 'Admin' ? (job.companyName || 'Official Post') : (job.vendor?.displayName || 'Vendor Post')}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-outline-variant/30"></span>
                                                <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">{job.applicantsCount || 0} Applicants</span>
                                                <span className="w-1 h-1 rounded-full bg-outline-variant/30"></span>
                                                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">{job.jobType}</span>
                                            </div>
                                        </div>
                                        {job.creatorRole === 'Admin' && (
                                            <div className="bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 flex items-center gap-1.5 shrink-0">
                                                <span className="material-symbols-outlined text-[12px] text-indigo-600">verified</span>
                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Verified</span>
                                            </div>
                                        )}
                                        <div className="bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/10 flex items-center gap-1.5 shrink-0">
                                            <span className="material-symbols-outlined text-[12px] text-primary">location_on</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest">{job.location}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed italic opacity-80 line-clamp-2">
                                        "{job.description}"
                                    </p>
                                    <button 
                                        onClick={() => setIsApplying(job)}
                                        className="w-full py-4 bg-surface-container-high rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all border border-primary/10"
                                    >
                                        Apply Now
                                    </button>
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

            {/* Backdrop Visuals */}
            <div className="fixed bottom-[10%] -left-20 w-80 h-80 bg-tertiary/5 rounded-full blur-[80px] pointer-events-none"></div>
        </div>
    );
};

export default CareersPage;

