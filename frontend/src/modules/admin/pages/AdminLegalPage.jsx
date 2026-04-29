import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { legalApi, mediaApi, UPLOADS_URL } from '../../../lib/api';
import toast from 'react-hot-toast';

const AdminLegalPage = () => {
    const [activeTab, setActiveTab] = useState('privacy-policy');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [content, setContent] = useState('');
    const [pdfUrl, setPdfUrl] = useState('');

    const fetchDocument = async (type) => {
        try {
            setLoading(true);
            const data = await legalApi.getByType(type);
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
        fetchDocument(activeTab);
    }, [activeTab]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await legalApi.update(activeTab, { content, pdfUrl });
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
            // mediaApi.upload returns the whole media object, fileUrl is relative or absolute
            // based on the controller we saw earlier it constructs full URL
            setPdfUrl(data.fileUrl);
            toast.success('PDF uploaded successfully');
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Legal & Compliance</h1>
                    <p className="text-sm text-slate-500 font-medium mt-2">Manage official privacy policies and terms of service</p>
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('privacy-policy')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'privacy-policy' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                        Privacy Policy
                    </button>
                    <button 
                        onClick={() => setActiveTab('terms-conditions')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'terms-conditions' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                        Terms & Conditions
                    </button>
                </div>
            </header>

            <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden p-8 space-y-8"
            >
                {loading ? (
                    <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                        Loading document data...
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Document Content (Rich Text/HTML)</label>
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write the full document content here..."
                                className="w-full h-[400px] bg-slate-50 border-none rounded-[2rem] p-8 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PDF Version (Optional)</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="text"
                                        value={pdfUrl}
                                        onChange={(e) => setPdfUrl(e.target.value)}
                                        placeholder="Paste PDF URL or upload below"
                                        className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                    {pdfUrl && (
                                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all">
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
                                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-dashed flex items-center justify-center gap-3 cursor-pointer transition-all ${uploading ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary'}`}
                                >
                                    {uploading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin">sync</span>
                                            Uploading PDF...
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
                                className={`px-12 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${saving ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-primary text-white hover:scale-[1.02] active:scale-[0.98] shadow-primary/20'}`}
                            >
                                {saving ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">sync</span>
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">save</span>
                                        Save Document
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
