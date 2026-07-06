import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adApi, mediaApi, UPLOADS_URL } from '../../../lib/api';
import toast from 'react-hot-toast';

const AdminAdvertisementPage = () => {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [page, setPage] = useState(1);

    const getFullAdUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('/uploads/')) {
            return UPLOADS_URL.replace('/uploads/', '') + url;
        }
        return `${UPLOADS_URL}${url}`;
    };
    const itemsPerPage = 10;
    
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

    useEffect(() => {
        fetchAds();
    }, []);

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

    const paginatedAds = React.useMemo(() => {
        return ads.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [ads, page]);

    const totalPages = Math.ceil(ads.length / itemsPerPage) || 1;

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Splash Ads</h1>
                    <p className="text-sm text-slate-500 font-medium mt-2">Manage app splash screen content and campaigns</p>
                </div>
                <div className="bg-slate-50 px-6 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ads.length} Total Campaign(s)</span>
                </div>
            </header>

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
                                    paginatedAds.map((ad) => (
                                        <tr key={ad._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                                                        {ad.type === 'image' ? (
                                                            <img src={getFullAdUrl(ad.url)} alt={ad.title} className="w-full h-full object-cover" />
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
                                                <a href={getFullAdUrl(ad.url)} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 inline-flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all">
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
                        
                        {/* Pagination Controls */}
                        {ads.length > 0 && (
                            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end transition-colors hover:bg-slate-100/30">
                                <div className="flex items-center gap-1">
                                    <button 
                                        disabled={page <= 1 || loading}
                                        onClick={() => setPage(p => p - 1)}
                                        className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Prev
                                    </button>
                                    <span className="px-4 text-[9px] font-black text-slate-900 tracking-widest tabular-nums bg-slate-200/50 h-6 flex items-center rounded-sm whitespace-nowrap">
                                        PG {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                                    </span>
                                    <button 
                                        disabled={page >= totalPages || loading}
                                        onClick={() => setPage(p => p + 1)}
                                        className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminAdvertisementPage;
