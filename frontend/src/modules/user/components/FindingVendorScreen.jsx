import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

const FindingVendorScreen = ({ order, onBack }) => {
    const radarRef = useRef(null);

    useEffect(() => {
        if (radarRef.current) {
            gsap.to(radarRef.current, {
                rotation: 360,
                duration: 4,
                repeat: -1,
                ease: 'linear'
            });
        }
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden text-white"
        >
            {/* Header / Back Button */}
            <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center">
                <button 
                    onClick={onBack}
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                    <p className="text-[10px] font-black tracking-widest uppercase text-white/80">Order {order?.orderId || '#...'}</p>
                </div>
            </div>

            {/* Radar Animation Area */}
            <div className="relative w-80 h-80 flex items-center justify-center">
                {/* Outer Rings */}
                <div className="absolute inset-0 rounded-full border border-primary/20 shadow-[0_0_50px_rgba(61,90,254,0.1)]"></div>
                <div className="absolute inset-10 rounded-full border border-primary/30 shadow-[0_0_30px_rgba(61,90,254,0.2)]"></div>
                <div className="absolute inset-20 rounded-full border border-primary/40 shadow-[0_0_20px_rgba(61,90,254,0.3)]"></div>
                <div className="absolute inset-32 rounded-full border border-primary/60 bg-primary/10 shadow-[0_0_40px_rgba(61,90,254,0.5)]"></div>

                {/* Radar Sweep */}
                <div 
                    ref={radarRef}
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(61,90,254,0.8) 100%)' }}
                ></div>

                {/* Center Pulse Icon */}
                <div className="absolute z-10 w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(61,90,254,0.8)]">
                    <span className="material-symbols-outlined text-4xl text-white animate-pulse">local_laundry_service</span>
                </div>

                {/* Blips (Simulating found nearby vendors) */}
                <motion.div 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute top-1/4 left-1/4 w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_#4ade80]"
                ></motion.div>
                <motion.div 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1.2 }}
                    className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-green-400 rounded-full shadow-[0_0_10px_#4ade80]"
                ></motion.div>
                <motion.div 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 2.1 }}
                    className="absolute top-1/2 right-10 w-4 h-4 bg-green-400 rounded-full shadow-[0_0_10px_#4ade80]"
                ></motion.div>
            </div>

            {/* Text Content */}
            <div className="mt-12 text-center space-y-4 relative z-10 max-w-xs">
                <h2 className="text-3xl font-black tracking-tighter">Finding <span className="text-primary">Vendors</span></h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Broadcasting your request to premium laundry partners in your area.
                </p>
            </div>

            {/* Bottom Status Bar */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xs">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                        <span className="material-symbols-outlined text-primary animate-spin">sync</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Status</p>
                        <p className="text-sm font-bold text-white tracking-wide">Waiting for Acceptance</p>
                    </div>
                </div>
            </div>

        </motion.div>
    );
};

export default FindingVendorScreen;
