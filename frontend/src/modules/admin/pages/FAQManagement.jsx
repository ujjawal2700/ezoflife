import React, { useState, useEffect } from 'react';
import { faqApi } from '../../../lib/api';
import PageHeader from '../components/common/PageHeader';
import { PlusCircle, Trash2, HelpCircle, Save, Video } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import StatusBadge from '../components/common/StatusBadge';

const FAQManagement = () => {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'General', targetRole: 'All', youtubeUrl: '' });
    const [isAdding, setIsAdding] = useState(false);

    const fetchFaqs = async () => {
        try {
            setLoading(true);
            const data = await faqApi.getAll();
            setFaqs(data);
        } catch (error) {
            console.error('Fetch FAQs Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFaqs();
    }, []);

    const handleCreate = async () => {
        if (!newFaq.question || !newFaq.answer) return;
        try {
            await faqApi.create(newFaq);
            setNewFaq({ question: '', answer: '', category: 'General', targetRole: 'All', youtubeUrl: '' });
            setIsAdding(false);
            fetchFaqs();
        } catch (error) {
            console.error('Create FAQ Error:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this FAQ?')) return;
        try {
            await faqApi.delete(id);
            fetchFaqs();
        } catch (error) {
            console.error('Delete FAQ Error:', error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader 
                title="FAQ Management" 
                actions={[
                    { 
                        label: isAdding ? 'Cancel' : 'Add New FAQ', 
                        icon: PlusCircle, 
                        variant: isAdding ? 'secondary' : 'primary',
                        onClick: () => setIsAdding(!isAdding)
                    }
                ]}
            />

            {/* Add FAQ Form */}
            {isAdding && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question</label>
                            <input 
                                type="text"
                                value={newFaq.question}
                                onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-primary/30 outline-none text-sm font-bold"
                                placeholder="Enter question..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                            <select 
                                value={newFaq.category}
                                onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-primary/30 outline-none text-sm font-bold"
                            >
                                <option value="General">General</option>
                                <option value="Orders">Orders</option>
                                <option value="Payments">Payments</option>
                                <option value="Vendor">Vendor</option>
                                <option value="Supplier">Supplier</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Audience</label>
                            <select 
                                value={newFaq.targetRole}
                                onChange={(e) => setNewFaq({ ...newFaq, targetRole: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-primary/30 outline-none text-sm font-bold"
                            >
                                <option value="All">All Roles</option>
                                <option value="Customer">Customer</option>
                                <option value="Vendor">Vendor</option>
                                <option value="Supplier">Supplier</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Answer (Rich Text)</label>
                            <div className="quill-wrapper bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 focus-within:border-primary/30 transition-all">
                                <ReactQuill 
                                    theme="snow"
                                    value={newFaq.answer}
                                    onChange={(content) => setNewFaq({ ...newFaq, answer: content })}
                                    placeholder="Type your answer here... (Bold, Lists, Links supported)"
                                    modules={{
                                        toolbar: [
                                            ['bold', 'italic', 'underline'],
                                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                            ['link'],
                                            ['clean']
                                        ],
                                    }}
                                    className="bg-slate-50 border-none"
                                />
                            </div>
                            <style>{`
                                .quill-wrapper .ql-toolbar.ql-snow {
                                    border: none !important;
                                    background: white !important;
                                    border-bottom: 1px solid #f1f5f9 !important;
                                }
                                .quill-wrapper .ql-container.ql-snow {
                                    border: none !important;
                                    min-height: 120px;
                                    font-family: inherit;
                                    font-size: 14px;
                                }
                                .quill-wrapper .ql-editor {
                                    min-height: 120px;
                                }
                            `}</style>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">YouTube Video URL (Optional)</label>
                            <input 
                                type="text"
                                value={newFaq.youtubeUrl}
                                onChange={(e) => setNewFaq({ ...newFaq, youtubeUrl: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-primary/30 outline-none text-sm font-bold"
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                            <p className="text-[8px] text-slate-400 italic">Provide a visual tutorial for this FAQ</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleCreate}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Save size={14} />
                        Save FAQ
                    </button>
                </div>
            )}

            {/* FAQ List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="h-40 flex items-center justify-center text-slate-400 italic">Loading FAQs...</div>
                ) : (
                    faqs.map((faq) => (
                        <div key={faq._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start gap-4 group hover:border-primary/20 transition-all">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                                <HelpCircle size={20} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">{faq.category}</span>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${faq.targetRole === 'Customer' ? 'bg-blue-50 text-blue-600' : faq.targetRole === 'Vendor' ? 'bg-orange-50 text-orange-600' : faq.targetRole === 'Supplier' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-500'}`}>
                                            {faq.targetRole || 'All'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(faq._id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <h4 className="text-sm font-black text-slate-900 tracking-tight">{faq.question}</h4>
                                <div 
                                    className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-2"
                                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                                />
                                {faq.youtubeUrl && (
                                    <div className="flex items-center gap-1.5 mt-2 text-[9px] font-black text-red-500 uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-sm">play_circle</span>
                                        Video Linked
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {!loading && faqs.length === 0 && (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <HelpCircle size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No FAQs found. Add one to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FAQManagement;
