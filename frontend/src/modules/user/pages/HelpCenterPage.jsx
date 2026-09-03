import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Search, MessageSquare, ChevronDown, CheckCircle2, X, AlertCircle, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { faqApi, ticketApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const HelpCenterPage = () => {
    const navigate = useNavigate();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    
    // User Data for Auto-fill
    const userData = JSON.parse(
        localStorage.getItem('user') || 
        localStorage.getItem('userData') || 
        localStorage.getItem('vendorData') ||
        localStorage.getItem('supplierData') ||
        '{}'
    );
    const userId = userData._id || userData.id;

    const getRole = () => {
        const u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('userData') || '{}');
        const v = JSON.parse(localStorage.getItem('vendorData') || '{}');
        const s = JSON.parse(localStorage.getItem('supplierData') || '{}');
        
        let role = u.role || '';
        if (!role && v.role) role = v.role;
        if (!role && v._id) role = 'Vendor';
        if (!role && s.role) role = s.role;
        if (!role && s._id) role = 'Supplier';
        return role || 'Customer';
    };
    const userRole = getRole();

    // Contact Form State
    const [ticketData, setTicketData] = useState({
        subject: '',
        category: 'Technical Issue',
        description: '',
        attachments: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            .filter(f => f.isActive !== false)
            .filter(f => !f.targetRole || f.targetRole === 'All' || f.targetRole === currentRole)
            .filter(f => 
                f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                f.answer.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [faqs, searchQuery, userRole]);

    const [playingId, setPlayingId] = useState(null);

    useEffect(() => {
        // Force body selection to be auto to prevent iframe click blocking
        document.body.style.userSelect = 'auto';
        document.body.style.webkitUserSelect = 'auto';
        document.body.style.touchAction = 'auto';
        return () => {
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.touchAction = 'pan-x pan-y';
        };
    }, []);

    const getYouTubeId = (url) => {
        if (!url || typeof url !== 'string') return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
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
        <div className="bg-[#f8fafc] text-slate-900 min-h-screen pb-36 font-['Poppins',sans-serif] relative">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                {/* Hero Header */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 mb-2">
                                <HelpCircle size={13} className="text-slate-700" />
                                <span>Support & FAQs Hub</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                How can we help you?
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
                                Search common questions or contact our dedicated customer assistance desk.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-2xs flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
                        >
                            <Headphones size={15} />
                            <span>Contact Support</span>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative pt-2">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 mt-1" />
                        <input 
                            type="text"
                            placeholder="Search questions, pickup times, garment care..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all font-normal"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 mt-1 cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                >
                    {loading ? (
                        <div className="py-20 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Loading solutions...
                        </div>
                    ) : filteredFaqs.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-3 shadow-2xs">
                            <HelpCircle size={36} className="mx-auto text-slate-300" />
                            <h3 className="text-base font-semibold text-slate-800">
                                {searchQuery ? `No answers matching "${searchQuery}"` : 'No FAQs currently published'}
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                Our support team is ready to answer any questions regarding your pickups or order status.
                            </p>
                            <button
                                onClick={() => setShowContactModal(true)}
                                className="mt-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-2"
                            >
                                <Headphones size={14} />
                                <span>Create Support Ticket</span>
                            </button>
                        </div>
                    ) : (
                        filteredFaqs.map((faq) => {
                            const isOpen = expandedId === faq._id;
                            const vId = getYouTubeId(faq.youtubeUrl);
                            const isThisPlaying = playingId === faq._id;

                        return (
                            <div 
                                key={faq._id}
                                className={`bg-white rounded-[2rem] border transition-all ${isOpen ? 'border-slate-900/10 shadow-lg' : 'border-slate-200/50 shadow-sm'}`}
                            >
                                <button 
                                    onClick={() => {
                                        setExpandedId(isOpen ? null : faq._id);
                                        setPlayingId(null);
                                    }}
                                    className="w-full px-6 pt-5 pb-2 flex items-center justify-between text-left"
                                >
                                    <div className="flex-1 pr-4">
                                        <span className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase block mb-1">{faq.category}</span>
                                        <span className="text-sm font-black text-slate-900 leading-tight">{faq.question}</span>
                                    </div>
                                    <span className={`material-symbols-outlined text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="overflow-hidden pointer-events-auto relative z-[100]">
                                        <div className="px-6 pb-6 border-t border-slate-50 pt-1 space-y-3">
                                            <div 
                                                className="text-xs font-medium text-slate-600 leading-relaxed rich-text-content break-words"
                                                dangerouslySetInnerHTML={{ __html: faq.answer }}
                                            />
                                            {vId && (
                                                <div className="space-y-3">
                                                    {isThisPlaying && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPlayingId(null);
                                                            }}
                                                            className="w-full py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg mb-2 shadow-lg"
                                                        >
                                                            Close Tutorial [X]
                                                        </button>
                                                    )}
                                                        {(() => {
                                                            const match = faq.youtubeUrl?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/);
                                                            const videoId = (match && match[2].length === 11) ? match[2] : null;
                                                            
                                                            if (isThisPlaying) {
                                                                return (
                                                                    <div key="playing" className="aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner relative z-[9999] pointer-events-auto group/player">
                                                                        <iframe 
                                                                            id={`player-${faq._id}`}
                                                                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
                                                                            className="w-full h-full pointer-events-none"
                                                                            frameBorder="0"
                                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                            allowFullScreen
                                                                        />
                                                                        {/* The Magic Overlay */}
                                                                        <div 
                                                                            className="absolute inset-0 z-[10000] cursor-pointer"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const iframe = document.getElementById(`player-${faq._id}`);
                                                                                if (iframe) {
                                                                                    // Toggle logic: we send both but YouTube handles state
                                                                                    // Since we don't know state, we alternate or just send pause if playing
                                                                                    // A better way is to toggle a local state
                                                                                    const isCurrentlyPaused = e.currentTarget.getAttribute('data-paused') === 'true';
                                                                                    if (isCurrentlyPaused) {
                                                                                        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                                                                                        e.currentTarget.setAttribute('data-paused', 'false');
                                                                                    } else {
                                                                                        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                                                                                        e.currentTarget.setAttribute('data-paused', 'true');
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                        {/* Visual indicator for pause state on the overlay */}
                                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-active/player:opacity-100 transition-opacity">
                                                                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                                                <span className="material-symbols-outlined text-white text-4xl">touch_app</span>
                                                                            </div>
                                                                        </div>
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
                                                                    {videoId ? (
                                                                        <img 
                                                                            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                                                            alt="Video Preview"
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
                                                                        <span className="text-[10px] font-black uppercase text-white tracking-widest">Tap to start tutorial</span>
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
                                                        Watch on YouTube App
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }))}

                    {!loading && filteredFaqs.length > 0 && (
                        <motion.div variants={itemVariants} className="pt-6 pb-12">
                            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 text-center space-y-3 shadow-2xs">
                                <h3 className="text-base sm:text-lg font-bold text-slate-900">Still have questions?</h3>
                                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-normal">
                                    Can't find the answer you're looking for? Reach out to our customer care team and we'll resolve it promptly.
                                </p>
                                <button 
                                    onClick={() => setShowContactModal(true)}
                                    className="mt-2 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Headphones size={15} />
                                    <span>Contact Customer Support</span>
                                </button>
                            </div>
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
                                    <div className="relative" ref={dropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowDropdown(!showDropdown)}
                                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold flex items-center justify-between focus:ring-2 focus:ring-slate-900/5 outline-none text-left"
                                        >
                                            <span className="text-slate-900">{ticketData.category}</span>
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>

                                        <AnimatePresence>
                                            {showDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-[110]"
                                                >
                                                    {['Technical Issue', 'Billing & Payments', 'Onboarding Help', 'Service Quality', 'Others'].map((opt) => (
                                                        <button
                                                            key={opt}
                                                            type="button"
                                                            onClick={() => {
                                                                setTicketData({ ...ticketData, category: opt });
                                                                setShowDropdown(false);
                                                            }}
                                                            className={`w-full text-left px-5 py-3.5 text-sm font-semibold transition-all hover:bg-slate-50 flex items-center justify-between ${
                                                                ticketData.category === opt ? 'bg-slate-50/80 text-slate-950 font-black' : 'text-slate-600'
                                                            }`}
                                                        >
                                                            <span>{opt}</span>
                                                            {ticketData.category === opt && (
                                                                <span className="material-symbols-outlined text-[14px] text-slate-900 font-black">check</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
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
