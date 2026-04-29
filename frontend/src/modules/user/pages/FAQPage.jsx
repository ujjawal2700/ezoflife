import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { faqApi } from '../../../lib/api';

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
        const userRole = localStorage.getItem('userRole') || 'Customer';
        const roleMapping = {
            'customer': 'Customer',
            'vendor': 'Vendor',
            'supplier': 'Supplier'
        };
        const currentRole = roleMapping[userRole.toLowerCase()] || 'Customer';

        return faqs
            .filter(f => !f.targetRole || f.targetRole === 'All' || f.targetRole === currentRole)
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

    return (
        <div className="bg-background text-on-surface min-h-screen pb-32 font-body">
            <header className="px-6 pt-4 flex items-center mb-8">
                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-on-surface border border-outline-variant/10"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </motion.button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none">Faq</h1>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40 mt-1">Instant Knowledge Base</p>
                    </div>
                </div>
            </header>

            <main className="px-6 max-w-2xl mx-auto">
                {/* Search */}
                <div className="relative mb-10">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant">
                        <span className="material-symbols-outlined text-lg">help_outline</span>
                    </div>
                    <input 
                        type="text"
                        placeholder="Search for answers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white rounded-[2rem] pl-14 pr-6 py-5 text-sm font-semibold border border-slate-300 shadow-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                    />
                </div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                >
                    {loading ? (
                        <div className="py-20 text-center opacity-30 italic text-sm font-black uppercase tracking-widest">Loading solutions...</div>
                    ) : filteredFaqs.map((faq) => {
                        const isOpen = expandedId === faq._id;

                        return (
                            <motion.div 
                                key={faq._id}
                                variants={itemVariants}
                                className={`bg-white rounded-[2rem] border transition-all ${isOpen ? 'border-primary/20 shadow-lg' : 'border-outline-variant/5 shadow-sm'}`}
                            >
                                <button 
                                    onClick={() => toggleExpand(faq._id)}
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
                                            <div className="px-6 pb-6 text-xs font-medium text-on-surface-variant leading-relaxed opacity-80 border-t border-outline-variant/5 pt-4">
                                                {faq.answer}
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
        </div>
    );
};

export default FAQPage;
