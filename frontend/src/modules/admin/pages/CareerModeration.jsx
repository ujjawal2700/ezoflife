import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jobApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const CareerModeration = () => {
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [viewMode, setViewMode] = useState('Jobs'); // 'Jobs' or 'Applications'

    // Form for Admin Direct Post
    const [form, setForm] = useState({
        title: '',
        companyName: 'EzOfLife Corporate',
        description: '',
        requirements: '',
        experience: '1-2 Years',
        location: 'Gurgaon (HQ)',
        type: 'Full-time',
        salary: 'As per Industry',
        skills: ['Punctual', 'Steam Iron Exp']
    });
    const [newSkill, setNewSkill] = useState('');

    const [adminAddresses, setAdminAddresses] = useState([]);
    const [adminCompany, setAdminCompany] = useState('EzOfLife Corporate');

    useEffect(() => {
        fetchJobs();
        fetchApplications();
        // Load addresses from settings
        const savedAddresses = localStorage.getItem('admin_addresses');
        if (savedAddresses) {
            setAdminAddresses(JSON.parse(savedAddresses));
        }
        // Load company name from settings
        const savedProfile = localStorage.getItem('admin_profile');
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            if (profile.companyName) {
                setAdminCompany(profile.companyName);
                setForm(prev => ({ ...prev, companyName: profile.companyName }));
            }
        }
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const data = await jobApi.getAdminAll();
            setJobs(data);
        } catch (error) {
            console.error('Fetch all jobs error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchApplications = async () => {
        try {
            const data = await jobApi.getAdminApplications();
            setApplications(data);
        } catch (error) {
            console.error('Fetch applications error:', error);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await jobApi.updateStatus(id, status);
            fetchJobs();
            toast.success(`Job ${status} Successfully`);
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const handleUpdateApplicationStatus = async (id, status) => {
        try {
            await jobApi.updateApplicationStatus(id, status);
            fetchApplications();
            toast.success(`Application ${status} Successfully`);
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const handleAdminCreate = async (e) => {
        e.preventDefault();
        try {
            const adminRaw = localStorage.getItem('adminData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
            const adminData = JSON.parse(adminRaw);
            
            const requirementsArray = form.requirements.split(',').map(r => r.trim()).filter(r => r !== '');
            const jobData = {
                ...form,
                requirements: form.requirements.split(',').map(r => r.trim()).filter(r => r !== ''),
                createdBy: adminData._id || adminData.id || adminData.user?._id || adminData.user?.id || 'admin_id',
                creatorRole: 'Admin',
                status: 'Active'
            };
            await jobApi.create(jobData);
            fetchJobs();
            setIsCreating(false);
            toast.success('Corporate Job Posted Successfully');
            setForm({ 
                title: '', 
                companyName: adminCompany, 
                description: '', 
                requirements: '', 
                experience: '1-2 Years',
                location: adminAddresses[0]?.address || '', 
                type: 'Full-time', 
                salary: 'As per Industry',
                skills: ['Punctual', 'Steam Iron Exp']
            });
        } catch (error) {
            alert('Creation failed');
        }
    };

    const handleEdit = (job) => {
        setEditingJob(job);
        setForm({
            title: job.title,
            companyName: job.companyName,
            description: job.description,
            requirements: Array.isArray(job.requirements) ? job.requirements.join(', ') : job.requirements,
            experience: job.experience,
            location: job.location,
            type: job.type || 'Full-time',
            salary: job.salary,
            skills: job.skills || []
        });
        setIsEditing(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const requirementsArray = typeof form.requirements === 'string' ? form.requirements.split(',').map(r => r.trim()).filter(r => r !== '') : form.requirements;
            const updateData = {
                ...form,
                requirements: requirementsArray
            };
            await jobApi.update(editingJob._id, updateData);
            fetchJobs();
            setIsEditing(false);
            setEditingJob(null);
            setForm({ title: '', companyName: 'EzOfLife Corporate', description: '', requirements: '', location: 'Gurgaon (HQ)', type: 'Full-time', salary: 'As per Industry' });
        } catch (error) {
            alert('Update failed');
        }
    };


    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 min-h-screen bg-[#E0F7FA]/30">
            <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-center">
                <div className="space-y-2">
                    <button className="flex items-center gap-2 text-[9px] font-black not-italic text-slate-400 uppercase tracking-widest hover:text-primary transition-colors mb-2">
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Back to Flow
                    </button>
                    <h1 className="text-4xl sm:text-5xl font-black not-italic tracking-tighter text-slate-900 uppercase leading-none">Flow Updates.</h1>
                    <p className="text-[10px] sm:text-xs font-bold not-italic text-slate-400 uppercase tracking-widest">Recruitment pipeline status and candidate tracking</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl flex w-full sm:w-fit shadow-sm border border-white">
                        <button onClick={() => setViewMode('Jobs')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black not-italic uppercase tracking-widest transition-all ${viewMode === 'Jobs' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Jobs</button>
                        <button onClick={() => setViewMode('Applications')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black not-italic uppercase tracking-widest transition-all ${viewMode === 'Applications' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Applications</button>
                    </div>
                    {viewMode === 'Jobs' && (
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="w-full sm:w-fit px-8 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Create Direct Post
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'Jobs' ? (
                <>

                    {loading ? (
                        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {(Array.isArray(jobs) ? jobs : []).map(job => (
                                    <motion.div 
                                        key={job._id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white p-6 rounded-[2rem] border border-slate-100 border-b-4 border-b-slate-900 shadow-sm space-y-4 group relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${job.creatorRole === 'Admin' ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                        {job.creatorRole === 'Admin' ? 'Admin' : 'Vendor'}
                                                    </span>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{job.companyName}</p>
                                                </div>
                                                <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{job.title}</h3>
                                            </div>
                                            {job.creatorRole === 'Admin' && (
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                                                    <span className="material-symbols-outlined text-sm">verified</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-xs font-medium text-slate-500 line-clamp-2">{job.description}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {(job.requirements || []).slice(0, 3).map((r, i) => (
                                                    <span key={i} className="px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[8px] font-bold uppercase">{r}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-50 flex gap-2">
                                            <button onClick={() => handleEdit(job)} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-widest">Edit Details</button>
                                            <button 
                                                onClick={async () => { if(confirm('Permanently delete?')) { await jobApi.delete(job._id); fetchJobs(); } }}
                                                className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl shrink-0"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Applications</span>
                        <div className="h-px flex-1 bg-slate-100" />
                        <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black text-primary uppercase">{applications?.length || 0} Total</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {(Array.isArray(applications) ? applications : []).map(app => (
                                <motion.div 
                                    key={app._id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5 group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">{app.applicantName}</h4>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Applied for <span className="text-primary">{app.jobId?.title}</span>
                                                </p>
                                                <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter ${app.jobId?.creatorRole === 'Admin' ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                    {app.jobId?.creatorRole === 'Admin' ? 'Admin' : 'Vendor'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                                            app.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 
                                            app.status === 'Recommended' ? 'bg-indigo-50 text-indigo-600' : 
                                            app.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {app.status === 'Recommended' ? 'Pending Admin' : app.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-4 rounded-2xl">
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contact</p>
                                            <p className="text-[10px] font-bold text-slate-800 truncate">{app.applicantPhone}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                                            <p className="text-[10px] font-bold text-slate-800 truncate">{app.applicantEmail}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2">
                                        <div className="flex gap-2">
                                            <a 
                                                href={app.resumeLink} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all"
                                            >
                                                View Resume
                                            </a>
                                            {app.status === 'Recommended' && (
                                                <button 
                                                    onClick={() => handleUpdateApplicationStatus(app._id, 'Approved')}
                                                    className="flex-[2] py-3 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                                >
                                                    <span className="material-symbols-outlined text-sm">verified</span>
                                                    Approve Candidate
                                                </button>
                                            )}
                                        </div>
                                        {app.status !== 'Approved' ? (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleUpdateApplicationStatus(app._id, 'Approved')}
                                                    className="flex-1 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                    title="Approve"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateApplicationStatus(app._id, 'Rejected')}
                                                    className="flex-1 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                    title="Reject"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                                </button>
                                                <button 
                                                    onClick={async () => { if(confirm('Delete application?')) { await jobApi.deleteApplication(app._id); fetchApplications(); } }}
                                                    className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 border border-emerald-100">
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">Hiring Confirmed</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Admin Post Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-20">
                        <div onClick={() => setIsCreating(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative z-10 shadow-2xl overflow-y-auto max-h-full no-scrollbar">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-6">Create Official Career Post</h2>
                            <form onSubmit={handleAdminCreate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Title</label>
                                        <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Company Name</label>
                                        <input required value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Description</label>
                                    <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold min-h-[100px]" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Required Experience</label>
                                        <input required placeholder="e.g. 1-2 Years" value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Job Type</label>
                                        <select 
                                            value={form.type} 
                                            onChange={e => setForm({...form, type: e.target.value})} 
                                            className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-200"
                                        >
                                            <option>Full-time</option>
                                            <option>Part-time</option>
                                            <option>Contract</option>
                                            <option>Internship</option>
                                            <option>Freelance</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Salary Range (Monthly)</label>
                                    <select 
                                        required 
                                        value={form.salary} 
                                        onChange={e => setForm({...form, salary: e.target.value})} 
                                        className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-200 appearance-none"
                                    >
                                        <option value="" disabled>Select Salary Bracket</option>
                                        <option value="10000-20000">₹10,000 - ₹20,000</option>
                                        <option value="20000-30000">₹20,000 - ₹30,000</option>
                                        <option value="30000-40000">₹30,000 - ₹40,000</option>
                                        <option value="50000+">₹50,000+</option>
                                        <option value="As per Industry">As per Industry</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Location</label>
                                    <select 
                                        required 
                                        value={form.location} 
                                        onChange={e => setForm({...form, location: e.target.value})} 
                                        className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-200"
                                    >
                                        <option value="" disabled>Select Office Location</option>
                                        {adminAddresses.map(addr => (
                                            <option key={addr.id} value={addr.address}>
                                                {addr.type}: {addr.address}
                                            </option>
                                        ))}
                                        <option value="Remote">Remote</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Skills & Qualifications</label>
                                    <div className="flex flex-wrap gap-2 px-2">
                                        {form.skills.map(skill => (
                                            <span key={skill} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-2">
                                                {skill}
                                                <button type="button" onClick={() => setForm({...form, skills: form.skills.filter(s => s !== skill)})}>
                                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            value={newSkill} 
                                            onChange={e => setNewSkill(e.target.value)}
                                            placeholder="Add a skill..." 
                                            className="flex-1 bg-slate-50 rounded-xl p-3 text-[10px] font-bold"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (newSkill.trim() && !form.skills.includes(newSkill.trim())) {
                                                    setForm({...form, skills: [...form.skills, newSkill.trim()]});
                                                    setNewSkill('');
                                                }
                                            }}
                                            className="px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black"
                                        >
                                            ADD
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase">Cancel</button>
                                    <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Push Live</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-20">
                        <div onClick={() => { setIsEditing(false); setEditingJob(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-2xl rounded-[3rem] p-10 relative z-10 shadow-2xl overflow-y-auto max-h-full no-scrollbar">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-6">Edit Job Posting</h2>
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Title</label>
                                        <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Company Name</label>
                                        <input required value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Description</label>
                                    <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold min-h-[100px]" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Required Experience</label>
                                        <input required value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Job Type</label>
                                        <select 
                                            value={form.type} 
                                            onChange={e => setForm({...form, type: e.target.value})} 
                                            className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-200"
                                        >
                                            <option>Full-time</option>
                                            <option>Part-time</option>
                                            <option>Contract</option>
                                            <option>Internship</option>
                                            <option>Freelance</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Salary Range (Monthly)</label>
                                    <select 
                                        required 
                                        value={form.salary} 
                                        onChange={e => setForm({...form, salary: e.target.value})} 
                                        className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-200 appearance-none"
                                    >
                                        <option value="" disabled>Select Salary Bracket</option>
                                        <option value="10000-20000">₹10,000 - ₹20,000</option>
                                        <option value="20000-30000">₹20,000 - ₹30,000</option>
                                        <option value="30000-40000">₹30,000 - ₹40,000</option>
                                        <option value="50000+">₹50,000+</option>
                                        <option value="As per Industry">As per Industry</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 ml-4 uppercase">Location</label>
                                    <select 
                                        required 
                                        value={form.location} 
                                        onChange={e => setForm({...form, location: e.target.value})} 
                                        className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-200"
                                    >
                                        <option value="" disabled>Select Office Location</option>
                                        {adminAddresses.map(addr => (
                                            <option key={addr.id} value={addr.address}>
                                                {addr.type}: {addr.address}
                                            </option>
                                        ))}
                                        <option value="Remote">Remote</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => { setIsEditing(false); setEditingJob(null); }} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase">Cancel</button>
                                    <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Save Changes</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CareerModeration;
