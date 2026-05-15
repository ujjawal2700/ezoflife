import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { legalApi, mediaApi, UPLOADS_URL } from '../../../lib/api';
import toast from 'react-hot-toast';

const AdminLegalPage = ({ type }) => {
    const [role, setRole] = useState('customer');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [hasExistingDoc, setHasExistingDoc] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const resolvePdfUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const cleanPath = url.replace(/^uploads[/\\]+/, '');
        return `${UPLOADS_URL}${cleanPath}`;
    };

    const fetchDocument = async (docType, docRole) => {
        try {
            setLoading(true);
            const data = await legalApi.getByType(`${docType}-${docRole}`);
            if (data && !data.message) {
                setPdfUrl(data.pdfUrl || '');
                setHasExistingDoc(!!data.pdfUrl);
            } else {
                setPdfUrl('');
                setHasExistingDoc(false);
            }
        } catch (error) {
            console.error('Fetch document error:', error);
            setPdfUrl('');
            setHasExistingDoc(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocument(type, role);
    }, [type, role]);

    const handleSave = async () => {
        if (!pdfUrl || uploading) return;
        try {
            setSaving(true);
            await legalApi.update(`${type}-${role}`, { content: '', pdfUrl });
            toast.success(`Your ${role.charAt(0).toUpperCase() + role.slice(1)} Policy Published`);
            setHasExistingDoc(true);
        } catch (error) {
            toast.error('Failed to update document');
        } finally {
            setSaving(false);
        }
    };

    const handlePdfUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file');
            return;
        }

        const formData = new FormData();
        formData.append('media', file);

        setUploading(true);
        setUploadProgress(0);
        setPdfUrl(''); // Clear current URL until upload succeeds

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/media/upload-pdf`, true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 201 || xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                setPdfUrl(data.fileUrl);
                toast.success('PDF uploaded successfully');
            } else {
                toast.error('Upload failed');
            }
            setUploading(false);
            setUploadProgress(0);
        };

        xhr.onerror = () => {
            toast.error('Upload failed');
            setUploading(false);
            setUploadProgress(0);
        };

        xhr.send(formData);
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
                        <div className="bg-slate-50/50 p-12 rounded-[2.5rem] border border-slate-100 border-dashed">
                            <div className="flex flex-col items-center text-center gap-6">
                                <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center">
                                    <span className={`material-symbols-outlined text-4xl ${pdfUrl ? 'text-green-500' : 'text-slate-200'}`}>
                                        {pdfUrl ? 'check_circle' : 'picture_as_pdf'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">
                                        {pdfUrl ? 'Policy PDF Ready' : `Upload ${displayTitle}`}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                        {pdfUrl ? 'You can update the existing file or save changes' : `Target: ${role.toUpperCase()} Documents`}
                                    </p>
                                </div>

                                <div className="w-full max-w-md space-y-6">
                                    {/* Preview Block - ABOVE Upload Button */}
                                    {pdfUrl && !uploading && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex items-center gap-4 p-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-200/20"
                                        >
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                                <span className="material-symbols-outlined">description</span>
                                            </div>
                                            <div className="flex-1 text-left truncate">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Current File</p>
                                                <p className="text-xs font-bold text-slate-900 truncate">
                                                    {pdfUrl.split('/').pop().substring(0, 30)}...
                                                </p>
                                            </div>
                                            <a 
                                                href={resolvePdfUrl(pdfUrl)} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                                            >
                                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                                            </a>
                                        </motion.div>
                                    )}

                                    {/* Progress Bar */}
                                    {uploading && (
                                        <div className="space-y-3 p-6 bg-white rounded-[1.5rem] border border-slate-100">
                                            <div className="flex justify-between items-end">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Uploading File</p>
                                                <p className="text-[10px] font-black text-slate-400">{uploadProgress}%</p>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-slate-900"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

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
                                            className={`w-full py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border-2 border-dashed flex items-center justify-center gap-4 cursor-pointer transition-all ${uploading ? 'bg-white/50 text-slate-300 border-slate-100 pointer-events-none' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-900 hover:text-slate-900 shadow-sm'}`}
                                        >
                                            {uploading ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined">{pdfUrl ? 'edit_document' : 'upload_file'}</span>
                                                    {pdfUrl ? 'Change PDF File' : 'Select Official PDF'}
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-center">
                            <button 
                                onClick={handleSave}
                                disabled={saving || uploading || !pdfUrl}
                                className={`px-16 py-6 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-5 transition-all ${saving || uploading || !pdfUrl ? 'bg-slate-100 text-slate-400 cursor-not-allowed scale-95 opacity-50' : 'bg-slate-950 text-white hover:scale-[1.02] active:scale-[0.98] shadow-slate-900/30'}`}
                            >
                                {saving ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-xl">{hasExistingDoc ? 'published_with_changes' : 'verified'}</span>
                                        {hasExistingDoc ? 'Update Policy' : 'Save Policy'}
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
