import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import VendorHeader from '../components/VendorHeader';
import { faqApi } from '../../../lib/api';

const Support = () => {
    const navigate = useNavigate();
    const [faqs, setFaqs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const data = await faqApi.getAll();
                const vendorFaqs = data.filter(f => (f.isActive !== false) && (!f.targetRole || f.targetRole === 'Vendor' || f.targetRole === 'All'));
                setFaqs(vendorFaqs);
            } catch (error) {
                console.error('Fetch Vendor FAQs Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchFaqs();
    }, []);

    return (
        <div className="bg-[#F8FAFC] text-[#1E293B] min-h-screen pb-32 font-sans">
            <VendorHeader title="Help & Support" showBack={true} />

            <motion.main 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto px-6 py-8 space-y-8"
            >
                {/* Support Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8 text-center">
                    <div className="w-20 h-20 bg-[#3D5AFE]/10 rounded-full flex items-center justify-center text-[#3D5AFE] mx-auto">
                        <span className="material-symbols-outlined text-[32px]">support_agent</span>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold tracking-tight">Need help?</h2>
                        <p className="text-sm text-slate-500 font-medium">Our team is available 24/7 to assist you with any issues.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => navigate('/user/support/tickets')}
                            className="w-full py-4 rounded-2xl bg-[#3D5AFE] text-white font-bold text-sm shadow-lg shadow-[#3D5AFE]/20 flex items-center justify-center gap-2 hover:bg-[#304FFE] transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">chat</span>
                            Chat with Support
                        </button>
                        <button className="w-full py-4 rounded-2xl bg-white text-slate-800 font-bold text-sm border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                            <span className="material-symbols-outlined text-[20px]">mail</span>
                            Email Us
                        </button>
                    </div>
                </div>

                {/* FAQ Section */}
                <section className="space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Common Questions</label>
                    <div className="space-y-3">
                        {loading ? (
                            <div className="py-8 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest">Syncing Knowledge Base...</div>
                        ) : faqs.map((faq, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm transition-all hover:bg-slate-50 cursor-pointer">
                                <h4 className="text-sm font-bold text-slate-800 mb-2">{faq.question}</h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{faq.answer}</p>
                            </div>
                        ))}
                        {!loading && faqs.length === 0 && (
                            <div className="py-8 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest">No FAQs available.</div>
                        )}
                    </div>
                </section>

                {/* Legal Links */}
                <section className="space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Legal</label>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => navigate('/vendor/privacy-policy')} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all font-bold text-xs text-slate-600">
                            Privacy Policy
                            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                        </button>
                        <button onClick={() => navigate('/vendor/terms-conditions')} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all font-bold text-xs text-slate-600">
                            Terms & Conditions
                            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                        </button>
                    </div>
                </section>
            </motion.main>
        </div>
    );
};

export default Support;
