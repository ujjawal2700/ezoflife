import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adApi, mediaApi, UPLOADS_URL } from '../../../lib/api';
import toast from 'react-hot-toast';

const AdminAdvertisementPage = () => {
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inquiries'
    const [ads, setAds] = useState([]);
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // Form state
    const [title, setTitle] = useState('');
    const [type, setType] = useState('image');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const fetchAds = async () => {
        try {
            setLoading(true);
            const data = await adApi.getAll();
            setAds(data);
        } catch (error) {
            toast.error('Failed to fetch advertisements');
        } finally {
            setLoading(false);
        }
    };

    const fetchInquiries = async () => {
        try {
            setLoading(true);
            const data = await mediaApi.getAllInquiries();
            setInquiries(data);
        } catch (error) {
            toast.error('Failed to fetch inquiries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'active') {
            fetchAds();
        } else {
            fetchInquiries();
        }
    }, [activeTab]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        const isVideo = selectedFile.type.startsWith('video/');
        const isImage = selectedFile.type.startsWith('image/');

        if (type === 'image' && !isImage) {
            toast.error('Please select an image file');
            e.target.value = null;
            return;
        }
        if (type === 'video' && !isVideo) {
            toast.error('Please select a video file');
            e.target.value = null;
            return;
        }

        setFile(selectedFile);
        
        // Create preview
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(selectedFile));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !title) {
            toast.error('Please provide a title and select a file');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('media', file);

        try {
            setUploading(true);
            await adApi.create(formData);
            toast.success('Advertisement published successfully!');
            
            // Reset form
            setTitle('');
            setFile(null);
            setPreview(null);
            const fileInput = document.getElementById('ad-media-upload');
            if (fileInput) fileInput.value = null;
            
            fetchAds();
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleToggle = async (id) => {
        try {
            await adApi.toggleStatus(id);
            toast.success('Status updated');
            fetchAds();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this ad?')) return;
        try {
            await adApi.delete(id);
            toast.success('Ad deleted');
            fetchAds();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Advertisement Hub</h1>
                    <p className="text-sm text-slate-500 font-medium mt-2">Manage splash content and track brand inquiries</p>
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                        Active Ads
                    </button>
                    <button 
                        onClick={() => setActiveTab('inquiries')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'inquiries' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                        Inquiries
                    </button>
                </div>
            </header>

            {activeTab === 'active' ? (

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-fit"
                >
                    <h3 className="text-lg font-black text-slate-900 mb-6">Create New Ad</h3>
                    <form onSubmit={handleUpload} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Ad Campaign Title</label>
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Summer Sale 2024"
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Media Type</label>
                            <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                                <button 
                                    type="button"
                                    onClick={() => { setType('image'); setFile(null); setPreview(null); }}
                                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${type === 'image' ? 'bg-white text-primary shadow-sm shadow-primary/10' : 'text-slate-400 opacity-60'}`}
                                >
                                    Image
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setType('video'); setFile(null); setPreview(null); }}
                                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${type === 'video' ? 'bg-white text-primary shadow-sm shadow-primary/10' : 'text-slate-400 opacity-60'}`}
                                >
                                    Video
                                </button>
                            </div>
                        </div>

                        <div className="relative group">
                            <input 
                                type="file" 
                                id="ad-media-upload"
                                onChange={handleFileChange}
                                accept={type === 'image' ? "image/*" : "video/*"}
                                className="hidden" 
                            />
                            <label 
                                htmlFor="ad-media-upload"
                                className="w-full flex flex-col items-center justify-center gap-4 py-8 px-6 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group overflow-hidden relative min-h-[200px]"
                            >
                                {preview ? (
                                    type === 'image' ? (
                                        <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                                    ) : (
                                        <video src={preview} className="absolute inset-0 w-full h-full object-cover opacity-30" muted />
                                    )
                                ) : null}
                                
                                <div className="z-10 flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-[28px]">{type === 'image' ? 'image' : 'videocam'}</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-700">{file ? file.name : 'Select Media File'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Recommended: 1080x1920 (9:16)</p>
                                    </div>
                                </div>
                            </label>
                        </div>

                        <button 
                            type="submit"
                            disabled={uploading || !file || !title}
                            className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${
                                uploading || !file || !title ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-primary text-white hover:scale-[1.02] active:scale-[0.98] shadow-primary/20'
                            }`}
                        >
                            {uploading ? (
                                <>
                                    <span className="animate-spin material-symbols-outlined text-sm">sync</span>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                    Publish Advertisement
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Ads History Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]"
                >
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-900">Ad History</h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ads.length} Campaign(s)</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-12 text-center text-slate-400">Loading your campaigns...</td>
                                    </tr>
                                ) : (
                                    ads.map((ad) => (
                                        <tr key={ad._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                                        {ad.type === 'image' ? (
                                                            <img src={`${UPLOADS_URL}${ad.url}`} alt={ad.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-black text-white">
                                                                <span className="material-symbols-outlined text-sm">videocam</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{ad.title}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{ad.type}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-slate-600">{new Date(ad.createdAt).toLocaleDateString('en-GB')}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(ad.createdAt).toLocaleTimeString()}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <button 
                                                    onClick={() => handleToggle(ad._id)}
                                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                        ad.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                                                    }`}
                                                >
                                                    {ad.isActive ? 'Active' : 'Paused'}
                                                </button>
                                            </td>
                                            <td className="px-8 py-6 text-right space-x-2">
                                                <a href={`${UPLOADS_URL}${ad.url}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 inline-flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all">
                                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                </a>
                                                <button onClick={() => handleDelete(ad._id)} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 inline-flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {ads.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-32 text-center text-slate-300">
                                            <span className="material-symbols-outlined text-6xl mb-4">movie_edit</span>
                                            <p className="text-[11px] font-black uppercase tracking-widest">No advertisements found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"
                >
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-black text-slate-900">Brand Inquiries</h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{inquiries.length} Lead(s)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand & Contact</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget (₹)</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center text-slate-400">Loading inquiries...</td>
                                    </tr>
                                ) : inquiries.map((inquiry) => (
                                    <tr key={inquiry._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-8">
                                            <div className="flex flex-col">
                                                <span className="text-md font-black text-slate-900">{inquiry.brandName}</span>
                                                <span className="text-xs text-primary font-bold mt-1">{inquiry.email}</span>
                                                <span className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-wider">{inquiry.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <span className="material-symbols-outlined text-sm">location_on</span>
                                                <span className="text-xs font-bold">{inquiry.location}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <span className="text-sm font-black text-slate-900">₹{inquiry.budget?.toLocaleString()}</span>
                                        </td>
                                        <td className="px-8 py-8">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-slate-200">
                                                {inquiry.timeline}
                                            </span>
                                        </td>
                                        <td className="px-8 py-8">
                                            <p className="text-xs font-bold text-slate-600">{new Date(inquiry.createdAt).toLocaleDateString('en-GB')}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(inquiry.createdAt).toLocaleTimeString()}</p>
                                        </td>
                                    </tr>
                                ))}
                                {inquiries.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-40 text-center text-slate-300">
                                            <span className="material-symbols-outlined text-6xl mb-4">campaign</span>
                                            <p className="text-[11px] font-black uppercase tracking-widest">No brand inquiries yet</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default AdminAdvertisementPage;
