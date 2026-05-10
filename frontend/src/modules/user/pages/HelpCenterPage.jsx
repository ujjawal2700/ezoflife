import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { faqApi, ticketApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const HelpCenterPage = () => {
    const navigate = useNavigate();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [showContactModal, setShowContactModal] = useState(false);
    
    // User Data for Auto-fill
    const userData = JSON.parse(
        localStorage.getItem('user') || 
        localStorage.getItem('userData') || 
        '{}'
    );
    const userId = userData._id || userData.id;
    const userRole = userData.role || 'Customer';

    // Contact Form State
    const [ticketData, setTicketData] = useState({
        subject: '',
        category: 'Technical Issue',
        description: '',
        attachments: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        const currentRole = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase(); // Normalize
        
        return faqs
            .filter(f => !f.targetRole || f.targetRole === 'All' || f.targetRole === currentRole)
            .filter(f => 
                f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                f.answer.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [faqs, searchQuery, userRole]);

    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleContactSubmit = async () => {
        if (!ticketData.subject || !ticketData.description) {
            toast.error('Please fill all mandatory fields');
            return;
        }
        try {
            setIsSubmitting(true);
            await ticketApi.createTicket({
                customer: userId,
                subject: ticketData.subject,
                category: ticketData.category,
                description: ticketData.description,
                // Metadata for backend auto-population logic if needed
                userMetadata: {
                    name: userData.name,
                    phone: userData.phone,
                    role: userRole
                }
            });
            toast.success('Support ticket submitted successfully!');
            setShowContactModal(false);
            setTicketData({ subject: '', category: 'Technical Issue', description: '', attachments: [] });
        } catch (error) {
            toast.error('Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 15, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
    };

    return (
        <div className="bg-slate-50/50 text-slate-900 min-h-screen pb-32 font-body">
            <header className="px-6 pt-6 flex items-center mb-8">
                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-900 border border-slate-100"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </motion.button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none">Help Center</h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">FAQs & Support Hub</p>
                    </div>
                </div>
            </header>

            <main className="px-6 max-w-2xl mx-auto">
                {/* Search */}
                <div className="relative mb-10">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                        <span className="material-symbols-outlined text-lg">search</span>
                    </div>
                    <input 
                        type="text"
                        placeholder="Search for answers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white rounded-[2rem] pl-14 pr-6 py-5 text-sm font-semibold border border-slate-200 shadow-sm focus:ring-2 focus:ring-slate-900/5 outline-none transition-all"
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
                        const videoId = getYouTubeId(faq.youtubeUrl);

                        return (
                            <motion.div 
                                key={faq._id}
                                variants={itemVariants}
                                className={`bg-white rounded-[2rem] border transition-all ${isOpen ? 'border-slate-900/10 shadow-lg' : 'border-slate-200/50 shadow-sm'}`}
                            >
                                <button 
                                    onClick={() => setExpandedId(isOpen ? null : faq._id)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                                >
                                    <div className="flex-1 pr-4">
                                        <span className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase block mb-1">{faq.category}</span>
                                        <span className="text-sm font-black text-slate-900 leading-tight">{faq.question}</span>
                                    </div>
                                    <span className={`material-symbols-outlined text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
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
                                            <div className="px-6 pb-6 border-t border-slate-50 pt-4 space-y-4">
                                                <div 
                                                    className="text-xs font-medium text-slate-600 leading-relaxed rich-text-content"
                                                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                                                />
                                                {videoId && (
                                                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                                                        <iframe 
                                                            src={`https://www.youtube.com/embed/${videoId}`}
                                                            title="YouTube video player"
                                                            className="absolute inset-0 w-full h-full"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}

                    {!loading && (
                        <motion.div variants={itemVariants} className="pt-10 pb-20 text-center space-y-6">
                            <div className="w-px h-12 bg-slate-200 mx-auto" />
                            <div className="space-y-2">
                                <h3 className="text-xl font-black tracking-tighter uppercase">Still Need Help?</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                    If you couldn't find your answer above, <br/>reach out to our support team.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowContactModal(true)}
                                className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">support_agent</span>
                                Contact Us
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            </main>

            {/* Contact Modal */}
            <AnimatePresence>
                {showContactModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setShowContactModal(false)} 
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                            className="relative w-full max-w-md bg-white rounded-[3rem] p-8 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black tracking-tighter uppercase">Support Ticket</h3>
                                <button onClick={() => setShowContactModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-base">close</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                                    <select 
                                        value={ticketData.category}
                                        onChange={(e) => setTicketData({ ...ticketData, category: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900/5 outline-none appearance-none"
                                    >
                                        <option value="Technical Issue">Technical Issue</option>
                                        <option value="Billing & Payments">Billing & Payments</option>
                                        <option value="Onboarding Help">Onboarding Help</option>
                                        <option value="Service Quality">Service Quality</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Issue Title</label>
                                    <input 
                                        type="text"
                                        placeholder="Brief summary of your issue..."
                                        value={ticketData.subject}
                                        onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900/5 outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                                    <textarea 
                                        placeholder="Please explain your problem in detail..."
                                        rows={4}
                                        value={ticketData.description}
                                        onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900/5 outline-none resize-none"
                                    />
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined text-sm">person</span>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sending as {userRole}</p>
                                        <p className="text-[10px] font-bold text-slate-900">{userData.name || 'User'} • {userData.phone || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleContactSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting Request...' : 'Submit Support Request'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HelpCenterPage;
