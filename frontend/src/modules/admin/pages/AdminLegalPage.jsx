import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { legalApi, mediaApi, UPLOADS_URL } from '../../../lib/api';
import toast from 'react-hot-toast';

const AdminLegalPage = ({ type }) => {
    const [role, setRole] = useState('customer');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [content, setContent] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');

    const fetchDocument = async (docType, docRole) => {
        try {
            setLoading(true);
            const data = await legalApi.getByType(`${docType}-${docRole}`);
            if (data) {
                setContent(data.content || '');
                setPdfUrl(data.pdfUrl || '');
            } else {
                setContent('');
                setPdfUrl('');
            }
        } catch (error) {
            console.error('Fetch document error:', error);
            setContent('');
            setPdfUrl('');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocument(type, role);
    }, [type, role]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await legalApi.update(`${type}-${role}`, { content, pdfUrl });
            toast.success('Document updated successfully');
        } catch (error) {
            toast.error('Failed to update document');
        } finally {
            setSaving(false);
        }
    };

    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file');
            return;
        }

        const formData = new FormData();
        formData.append('media', file);

        try {
            setUploading(true);
            const data = await mediaApi.upload(formData);
            setPdfUrl(data.fileUrl);
            toast.success('PDF uploaded successfully');
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const displayTitle = type === 'privacy-policy' ? 'Privacy Policy' : 'Terms & Conditions';

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none uppercase italic">{displayTitle}</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Manage official documents by role</p>
                </div>
                
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
                    {['customer', 'vendor', 'supplier'].map((r) => (
                        <button 
                            key={r}
                            onClick={() => setRole(r)}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </header>

            <motion.div 
                key={`${type}-${role}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden p-10 space-y-8"
            >
                {loading ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                        <span className="material-symbols-outlined animate-spin text-slate-200 text-4xl">sync</span>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading document data...</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Content</label>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Target: {role.toUpperCase()}</span>
                            </div>
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={`Enter ${displayTitle} content for ${role}s...`}
                                className="w-full h-[450px] bg-slate-50 border-none rounded-[2.5rem] p-10 text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-inner"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end bg-slate-50/50 p-8 rounded-[2.5rem]">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PDF Version (Optional)</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="text"
                                        value={pdfUrl}
                                        onChange={(e) => setPdfUrl(e.target.value)}
                                        placeholder="Paste PDF URL or upload"
                                        className="flex-1 bg-white border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                    />
                                    {pdfUrl && (
                                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white text-slate-400 border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                            <span className="material-symbols-outlined">open_in_new</span>
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <input 
                                    type="file" 
                                    id="pdf-upload" 
                                    accept=".pdf" 
                                    onChange={handlePdfUpload}
                                    className="hidden" 
                                />
                                <label 
                                    htmlFor="pdf-upload"
                                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-dashed flex items-center justify-center gap-3 cursor-pointer transition-all ${uploading ? 'bg-white/50 text-slate-300 border-slate-100' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900'}`}
                                >
                                    {uploading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin">sync</span>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">upload_file</span>
                                            Upload Official PDF
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className={`px-12 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all ${saving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-950 text-white hover:scale-[1.02] active:scale-[0.98] shadow-slate-900/20'}`}
                            >
                                {saving ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">verified</span>
                                        Update Policy
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default AdminLegalPage;
