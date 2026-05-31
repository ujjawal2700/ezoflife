import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const VendorProductImages = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { images, name } = location.state || {};

    const displayImages = images && images.length > 0 ? images : [];

    if (displayImages.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <span className="material-symbols-outlined text-6xl text-slate-800 mb-4">image_not_supported</span>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No images available</p>
                <button onClick={() => navigate(-1)} className="mt-8 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-20">
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl p-4 flex items-center gap-4 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-sm font-black uppercase tracking-widest truncate text-white">{name || 'Product Images'}</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{displayImages.length} Image{displayImages.length !== 1 ? 's' : ''}</p>
                </div>
            </header>
            
            <main className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full mt-4">
                {displayImages.map((img, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.4 }}
                        className="w-full rounded-[2.5rem] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl relative"
                    >
                        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-10 text-[10px] font-black text-white tracking-widest">
                            {idx + 1} / {displayImages.length}
                        </div>
                        <img src={img} alt={`${name} - ${idx + 1}`} className="w-full h-auto object-contain max-h-[80vh]" />
                    </motion.div>
                ))}
            </main>
        </div>
    );
};

export default VendorProductImages;
