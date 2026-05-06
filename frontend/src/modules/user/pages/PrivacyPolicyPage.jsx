import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { legalApi } from '../../../lib/api';

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'customer';
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }), []);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-background text-on-background min-h-[100dvh] flex flex-col font-body"
    >
      <header className="fixed top-0 z-50 bg-white/70 backdrop-blur-xl w-full flex items-center px-6 py-4 border-b border-outline-variant/10">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-on-surface-variant mr-4">arrow_back</button>
        <h1 className="font-headline font-black text-xl text-primary tracking-tighter">Privacy Policy</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-36 w-full">
        <motion.section 
          variants={itemVariants}
          className="mb-12 ml-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-1 block opacity-60">Legal & Care</span>
          <h2 className="text-3xl font-black tracking-tighter leading-none mb-3">Your Privacy,<br/>Our Commitment.</h2>
          {doc && (
            <p className="text-[11px] font-bold text-on-surface-variant opacity-60 mt-4 uppercase tracking-widest leading-relaxed">
              Last Updated: {new Date(doc.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </motion.section>

        <section className="space-y-10 px-2 min-h-[300px]">
          {loading ? (
            <div className="py-20 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Loading policy...</div>
          ) : (
            <div className="space-y-8">
              {doc?.content ? (
                <div 
                  className="text-[14px] font-medium text-on-surface-variant leading-relaxed legal-content"
                  dangerouslySetInnerHTML={{ __html: doc.content }}
                />
              ) : (
                <p className="text-slate-400 italic text-sm">Policy content is currently being updated.</p>
              )}

              {doc?.pdfUrl && (
                <motion.div variants={itemVariants} className="pt-8">
                  <a 
                    href={doc.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">picture_as_pdf</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none mb-1">Official Document</p>
                        <p className="text-sm font-black tracking-tight">View Privacy Policy PDF</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined">chevron_right</span>
                  </a>
                </motion.div>
              )}
            </div>
          )}
        </section>

        <motion.section variants={itemVariants} className="mt-20 p-8 rounded-[2.5rem] bg-surface-container-low border border-outline-variant/5 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 mb-4 px-10">
            For further clarification on legal terms, please reach out via our support channel.
          </p>
          <button 
             onClick={() => navigate('/user/support')}
             className="text-primary font-black text-[10px] uppercase tracking-[0.2em] hover:underline"
          >
            Contact Legal Team
          </button>
        </motion.section>
      </main>
    </motion.div>
  );
};

export default PrivacyPolicyPage;

