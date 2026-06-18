import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const SupplierSupplies = () => {
    const navigate = useNavigate();

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-900 pb-2 font-sans"
        >
            {/* Header */}
            <header className="px-6 pt-2 flex items-center justify-between mb-6 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tighter text-slate-950 uppercase leading-none">Spinzyt</h1>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 animate-pulse"></div>
                </div>

                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-xl bg-white border border-black/5 flex items-center justify-center text-slate-400 shadow-sm relative"
                    >
                        <span className="material-symbols-outlined text-xl">notifications</span>
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>
                    </motion.button>

                    <motion.div 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/supplier/profile')}
                        className="w-10 h-10 rounded-full bg-white border border-black/5 overflow-hidden shadow-sm cursor-pointer"
                    >
                        <img 
                            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100" 
                            alt="Supplier" 
                            className="w-full h-full object-cover" 
                        />
                    </motion.div>
                </div>
            </header>

            <main className="px-6 space-y-6 max-w-md mx-auto">
                <div className="grid grid-cols-2 gap-4">
                    {/* Row 1: My Supplies */}
                    <motion.div 
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/supplier/my-supplies')}
                        className="col-span-2 bg-white rounded-[1.8rem] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer border border-slate-100"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Inventory Control</p>
                                </div>
                                <h2 className="text-lg font-black text-slate-950 tracking-tight uppercase">My Supplies</h2>
                                <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[240px] tracking-widest">
                                    Manage your supplies registry, update wholesale rates, bulk discounts, and active status instantly.
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                <span className="material-symbols-outlined text-xl">inventory_2</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Row 2: Hire Talent */}
                    <motion.div 
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/supplier/labor-request')}
                        className="col-span-2 bg-white rounded-[1.8rem] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer border border-slate-100"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/40 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Staffing Solutions</p>
                                </div>
                                <h2 className="text-lg font-black text-slate-950 tracking-tight uppercase">Hire Talent</h2>
                                <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[240px] tracking-widest">
                                    Submit labor requests and hire skilled helpers for your facility.
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                <span className="material-symbols-outlined text-xl">groups</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Row 3: Promotions */}
                    <motion.div 
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toast('Marketing Hub coming soon!', { icon: '📢' })}
                        className="col-span-2 bg-white rounded-[1.8rem] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer border border-slate-100"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/40 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Marketing Hub</p>
                                </div>
                                <h2 className="text-lg font-black text-slate-950 tracking-tight uppercase">Promotions</h2>
                                <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[240px] tracking-widest">
                                    Configure discount codes and run campaign offers for vendors.
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                <span className="material-symbols-outlined text-xl">confirmation_number</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </motion.div>
    );
};

export default SupplierSupplies;
