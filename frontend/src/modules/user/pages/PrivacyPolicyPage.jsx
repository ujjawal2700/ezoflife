import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, FileText, ChevronRight, Mail } from 'lucide-react';
import { legalApi, UPLOADS_URL } from '../../../lib/api';

const DEFAULT_PRIVACY_SECTIONS = [
  {
    title: '1. Information We Collect',
    desc: 'We collect personal, business, and operational information necessary to provide and continually improve our platform services, process transactions, maintain account security, and verify platform participants.'
  },
  {
    title: '2. How We Use Your Information',
    desc: 'Your data is utilized strictly to fulfill orders, facilitate communications between clients, vendors, and suppliers, process payouts, prevent fraud, and ensure platform safety and compliance.'
  },
  {
    title: '3. Data Security & Storage',
    desc: 'We adopt industry-standard administrative, technical, and physical security measures to safeguard your personal and financial information against unauthorized access, loss, or misuse.'
  },
  {
    title: '4. Sharing & Disclosure',
    desc: 'We never sell your personal information. Information is only shared with trusted service partners, payment gateways, and logistics providers strictly to the extent required to execute services.'
  }
];

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRole = searchParams.get('role') || 'customer';
  const role = rawRole.toLowerCase();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const resolvePdfUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanPath = url.replace(/^uploads[/\\]+/, '');
    return `${UPLOADS_URL}${cleanPath}`;
  };

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const data = await legalApi.getByType(`privacy-policy-${role}`);
        setDoc(data);
      } catch (error) {
        console.error('Fetch Privacy Policy Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [role]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (role === 'supplier') {
      navigate('/supplier/profile');
    } else if (role === 'vendor') {
      navigate('/vendor/profile');
    } else {
      navigate('/user/home');
    }
  };

  const handleSupport = () => {
    if (role === 'supplier') {
      navigate('/supplier/profile');
    } else if (role === 'vendor') {
      navigate('/vendor/support');
    } else {
      navigate('/user/support');
    }
  };

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
  }), []);

  const roleLabel = role === 'supplier' ? 'Supplier Portal' : role === 'vendor' ? 'Vendor Portal' : 'Customer Agreement';

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-background min-h-[100dvh] flex flex-col text-slate-800"
    >
      {/* Standalone Header */}
      <header className="fixed top-0 z-50 bg-white/90 backdrop-blur-xl w-full flex items-center px-4 sm:px-6 py-3.5 border-b border-slate-200/80 shadow-xs">
        <button 
          onClick={handleBack} 
          className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors mr-3 cursor-pointer active:scale-95"
          aria-label="Go Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">Privacy Policy</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {roleLabel}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 pb-32 w-full">
        <motion.section 
          variants={itemVariants}
          className="mb-8 pt-4"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-3">
            <Shield size={12} />
            <span>Legal & Privacy Protection</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            Your Privacy,<br />Our Commitment.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Understand how EZ OF LIFE protects and handles your confidential information.
          </p>
          {doc?.lastUpdated && (
            <p className="text-[11px] font-bold text-slate-400 mt-3 uppercase tracking-widest">
              Last Updated: {new Date(doc.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </motion.section>

        <section className="space-y-6 min-h-[260px]">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
              Loading privacy policy...
            </div>
          ) : (
            <div className="space-y-6">
              {doc?.content ? (
                <div 
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs text-[14px] leading-relaxed text-slate-700 legal-content"
                  dangerouslySetInnerHTML={{ __html: doc.content }}
                />
              ) : (
                <div className="space-y-4">
                  {DEFAULT_PRIVACY_SECTIONS.map((sec, idx) => (
                    <motion.div 
                      key={idx} 
                      variants={itemVariants}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs"
                    >
                      <h3 className="text-sm font-bold text-slate-900 mb-2">{sec.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">{sec.desc}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {doc?.pdfUrl && (
                <motion.div variants={itemVariants} className="pt-4">
                  <a 
                    href={resolvePdfUrl(doc.pdfUrl)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-5 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-rose-400">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">Official Document</p>
                        <p className="text-sm font-bold tracking-tight text-white">Download Privacy Policy PDF</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </a>
                </motion.div>
              )}
            </div>
          )}
        </section>

        <motion.section variants={itemVariants} className="mt-12 p-6 rounded-2xl bg-white border border-slate-200/80 text-center shadow-xs">
          <p className="text-xs text-slate-500 font-medium mb-3">
            Have questions regarding our privacy practices or data policies?
          </p>
          <button 
            onClick={handleSupport}
            className="inline-flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider hover:underline cursor-pointer"
          >
            <Mail size={14} />
            <span>Contact Support / Legal Team</span>
          </button>
        </motion.section>
      </main>
    </motion.div>
  );
};

export default PrivacyPolicyPage;

