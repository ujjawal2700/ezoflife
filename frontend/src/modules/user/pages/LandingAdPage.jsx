import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adApi, UPLOADS_URL } from '../../../lib/api';
import { safeStorage } from '@/lib/safeStorage';

const LandingAdPage = () => {
    const navigate = useNavigate();
    const [activeAd, setActiveAd] = useState(null);
    const [timeLeft, setTimeLeft] = useState(30);

    const fetchActiveAd = async () => {
        try {
            const data = await adApi.getActive();
            if (data && !data.message) {
                setActiveAd(data);
            }
        } catch (error) {
            console.error('Failed to fetch ad');
        }
    };

    useEffect(() => {
        fetchActiveAd();

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleStartBrowsing();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleStartBrowsing = () => {
        safeStorage.setItem('hasSeenLanding', 'true');
        navigate('/user/home');
    };

    return (
        <div className="min-h-screen bg-white flex flex-col overflow-hidden relative">
            {/* Countdown Overlay */}
            <div className="absolute top-6 right-6 z-50">
                <div className="bg-black/20 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#89ECDA] animate-pulse"></span>
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Entering in {timeLeft}s</span>
                </div>
            </div>

            {/* Top 50%: Advertisement Screen */}
            <div className="h-[50vh] relative group overflow-hidden bg-slate-900">
                <motion.div 
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 10, repeat: Infinity, yoyo: true }}
                    className="absolute inset-0"
                >
                    {activeAd ? (
                        activeAd.type === 'video' ? (
                            <video 
                                src={`${UPLOADS_URL}${activeAd.url}`} 
                                autoPlay 
                                muted 
                                loop 
                                playsInline 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <img 
                                src={`${UPLOADS_URL}${activeAd.url}`} 
                                alt={activeAd.title} 
                                className="w-full h-full object-cover"
                            />
                        )
                    ) : (
                        <img 
                            src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&q=80&w=1000" 
                            alt="Default Ad" 
                            className="w-full h-full object-cover opacity-50"
                        />
                    )}
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 flex flex-col justify-end p-8">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <span className="px-3 py-1 bg-[#89ECDA] text-black text-[9px] font-black uppercase tracking-widest rounded-full">
                            {activeAd ? activeAd.title : 'Explore Offers'}
                        </span>
                        <h2 className="text-3xl font-black text-white mt-3 tracking-tighter leading-tight uppercase">
                            Premium <br /> Care For Your <br /> <span className="text-[#89ECDA]">Finest Fabrics.</span>
                        </h2>
                    </motion.div>
                </div>
            </div>

            {/* Bottom 50%: Spinzyt Branding & Redirect */}
            <div className="h-[50vh] bg-gradient-to-br from-[#F8FAFC] to-[#a1f0e2] flex flex-col items-center justify-between py-12 px-8 relative overflow-hidden">
                {/* Decorative Blobs */}
                <div className="absolute top-10 right-[-10%] w-60 h-60 bg-white/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-10 left-[-10%] w-60 h-60 bg-[#73e0c9]/10 rounded-full blur-3xl pointer-events-none" />

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center relative z-10"
                >
                    <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-2xl">
                        <span className="material-symbols-outlined text-3xl">local_laundry_service</span>
                    </div>
                    <h1 className="text-5xl font-black text-black tracking-tighter leading-none mb-2">SPINZYT</h1>
                    <p className="text-[10px] font-black text-black/40 uppercase tracking-[0.4em] mb-4">India's Choice</p>
                </motion.div>

                <div className="w-full max-w-xs relative z-10 space-y-4">
                    <button 
                        onClick={handleStartBrowsing}
                        className="w-full py-5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-black/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Browse Services
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                    <p className="text-center text-[10px] font-bold text-black/30 uppercase tracking-widest">No Login Required to browse</p>
                </div>

                <div className="relative z-10 opacity-30">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black">Precision Flow Technology</p>
                </div>
            </div>
        </div>
    );
};

export default LandingAdPage;
