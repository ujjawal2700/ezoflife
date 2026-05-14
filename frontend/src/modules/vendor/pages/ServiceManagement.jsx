import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ServiceManagement = () => {
    const navigate = useNavigate();

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-900 min-h-screen pb-32 font-sans"
        >
            <main className="max-w-xl mx-auto px-6 pt-4 space-y-6">

                <section className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        {/* 1. WALK-IN HUB */}
                        <motion.div 
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/walk-in')}
                            className="bg-white rounded-[1.8rem] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Manual Entry</p>
                                    </div>
                                    <h2 className="text-lg font-black text-slate-950 tracking-tight uppercase">Walk-In Hub</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[200px] tracking-widest">
                                        Quickly log over-the-counter orders and book a "Drop-off Rider" on demand
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. MY SERVICES */}
                        <motion.div 
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/my-services')}
                            className="bg-white rounded-[1.8rem] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Inventory Control</p>
                                    </div>
                                    <h2 className="text-lg font-black text-slate-950 tracking-tight uppercase">My Services</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[200px] tracking-widest">
                                        Take full control of your menu. Add new services, update pricing, or toggle active status instantly.
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-xl">inventory_2</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 3. ORDER SUPPLIES */}
                        <motion.div 
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/material-request')}
                            className="bg-white rounded-[1.8rem] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Material Procurement</p>
                                    </div>
                                    <h2 className="text-lg font-black text-slate-950 tracking-tight uppercase">Order Supplies</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[200px] tracking-widest">
                                        Procure high-quality cleaning materials and supplies directly from authorized partners.
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-xl">shopping_basket</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 4. HIRE TALENT */}
                        <motion.div 
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/labor-request')}
                            className="bg-white rounded-[1.8rem] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Staffing Solutions</p>
                                    </div>
                                    <h2 className="text-lg font-black text-slate-950 tracking-tight uppercase">Hire Talent</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[200px] tracking-widest">
                                        Struggling to find workers? Submit a request and let Ezoflife handle the recruitment for you.
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-xl">groups</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 5. PROMOTIONS */}
                        <motion.div 
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/promotions')}
                            className="bg-white rounded-[1.8rem] p-5 shadow-[0_15px_40px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Marketing Hub</p>
                                    </div>
                                    <h2 className="text-lg font-black text-slate-950 tracking-tight uppercase">Promotions</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[200px] tracking-widest">
                                        Create custom promo codes and track campaign performance in real-time.
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-xl">confirmation_number</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <p className="text-center text-[8px] font-black text-slate-200 uppercase tracking-[0.3em] pt-6">Control Hub v3.0</p>
            </main>
        </motion.div>
    );
};

export default ServiceManagement;
