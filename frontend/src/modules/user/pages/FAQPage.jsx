import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { faqApi } from '../../../lib/api';

// Helper: get current logged-in role from user object (works for customer, vendor, supplier)
const getCurrentRole = () => {
    const userData = JSON.parse(
        localStorage.getItem('user') ||
        localStorage.getItem('userData') ||
        '{}'
    );
    const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
    const supplierData = JSON.parse(localStorage.getItem('supplierData') || '{}');

    let raw = userData.role || '';
    if (!raw && vendorData.role) raw = vendorData.role;
    if (!raw && vendorData._id) raw = 'Vendor';
    if (!raw && supplierData.role) raw = supplierData.role;
    if (!raw && supplierData._id) raw = 'Supplier';

    if (!raw) return null;
    // Normalize: 'vendor' -> 'Vendor', 'customer' -> 'Customer', etc.
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

const FAQPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const data = await faqApi.getAll();
                setFaqs(data);
            } catch (error) {
                console.error('Fetch FAQs Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFaqs();
    }, []);

    const filteredFaqs = useMemo(() => {
        const token = localStorage.getItem('token') || localStorage.getItem('vendorToken') || localStorage.getItem('supplierToken');
        // Read role from the user object (stored on login) — NOT from 'userRole' key which is never set
        const currentRole = getCurrentRole(); // e.g. 'Customer', 'Vendor', 'Supplier' or null

        return faqs
            .filter(f => f.isActive !== false)
            .filter(f => {
                // If not logged in, only show 'All'
                if (!token || !currentRole) return f.targetRole === 'All';
                // If logged in, show 'All' AND their specific role
                return f.targetRole === 'All' || f.targetRole === currentRole;
            })
            .filter(f =>
                f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.answer.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [faqs, searchQuery]);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 15, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
    }), []);

    const [playingId, setPlayingId] = useState(null);

    const getYouTubeEmbedUrl = (url) => {
        if (!url || typeof url !== 'string') return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : null;
        if (!videoId) return null;
        return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`;
    };

    return (
        <div className="bg-[#f8fafc] text-slate-900 min-h-screen pb-36 font-['Poppins',sans-serif]">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                {/* Hero Header */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 mb-2">
                            Knowledge Base
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Frequently Asked Questions
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
                            Everything you need to know about Spinzyt laundry, dry cleaning, and delivery.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative pt-2">
                        <span className="material-symbols-outlined text-lg absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 mt-1">search</span>
                        <input 
                            type="text"
                            placeholder="Search questions or keywords..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all font-normal"
                        />
                    </div>
                </div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                >
                    {loading ? (
                        <div className="py-20 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">Loading solutions...</div>
                    ) : filteredFaqs.map((faq) => {
                        const isOpen = expandedId === faq._id;
                        const ytUrl = getYouTubeEmbedUrl(faq.youtubeUrl);

                        return (
                            <motion.div 
                                key={faq._id}
                                variants={itemVariants}
                                className={`bg-white rounded-[2rem] border transition-all ${isOpen ? 'border-primary/20 shadow-lg' : 'border-outline-variant/5 shadow-sm'}`}
                            >
                                <button 
                                    onClick={() => {
                                        toggleExpand(faq._id);
                                        setPlayingId(null);
                                    }}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                                >
                                    <div className="flex-1 pr-4">
                                        <span className="text-[9px] font-black tracking-[0.2em] text-primary uppercase block mb-1">{faq.category}</span>
                                        <span className="text-sm font-black text-on-surface leading-tight">{faq.question}</span>
                                    </div>
                                    <span className={`material-symbols-outlined text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </button>
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 text-xs font-bold text-on-surface-variant leading-relaxed opacity-80 border-t border-outline-variant/5 pt-4 space-y-4">
                                                <div 
                                                    className="faq-answer-content"
                                                    dangerouslySetInnerHTML={{ __html: faq.answer }} 
                                                />
                                                
                                                {ytUrl && (
                                                    <div className="space-y-3">
                                                        {(() => {
                                                            const match = faq.youtubeUrl?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/);
                                                            const vId = (match && match[2].length === 11) ? match[2] : null;
                                                            const isThisPlaying = playingId === faq._id;
                                                            
                                                            if (isThisPlaying) {
                                                                return (
                                                                    <div key="playing" className="aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner relative z-[30]">
                                                                        <iframe 
                                                                            src={`${ytUrl}&autoplay=1`}
                                                                            className="w-full h-full"
                                                                            frameBorder="0"
                                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                            allowFullScreen
                                                                        />
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div 
                                                                    key="preview"
                                                                    className="aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner relative z-[30] cursor-pointer group"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setPlayingId(faq._id);
                                                                    }}
                                                                >
                                                                    <div className="relative w-full h-full">
                                                                        {vId ? (
                                                                            <img 
                                                                                src={`https://img.youtube.com/vi/${vId}/mqdefault.jpg`}
                                                                                alt="Video"
                                                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                                                <span className="material-symbols-outlined text-white/20 text-4xl">play_circle</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                                                                                <span className="material-symbols-outlined text-3xl">play_arrow</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                                                            <span className="text-[10px] font-black uppercase text-white tracking-widest">Tutorial Available</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                        
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.open(faq.youtubeUrl, '_blank');
                                                            }}
                                                            className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100 hover:bg-red-100 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                            Open in YouTube
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}

                    {!loading && filteredFaqs.length === 0 && (
                        <div className="py-20 text-center opacity-40">
                            <span className="material-symbols-outlined text-5xl mb-4">search_off</span>
                            <p className="text-xs font-bold uppercase tracking-widest">No matching answers found.</p>
                        </div>
                    )}
                </motion.div>
            </main>
            <style>{`
                .faq-answer-content ul { list-style-type: disc; margin-left: 1.5rem; margin-top: 0.5rem; }
                .faq-answer-content ol { list-style-type: decimal; margin-left: 1.5rem; margin-top: 0.5rem; }
                .faq-answer-content li { margin-bottom: 0.25rem; }
                .faq-answer-content b, .faq-answer-content strong { font-weight: 900; color: #0f172a; }
                .faq-answer-content p { margin-bottom: 0.5rem; }
            `}</style>
        </div>
    );
};

export default FAQPage;
