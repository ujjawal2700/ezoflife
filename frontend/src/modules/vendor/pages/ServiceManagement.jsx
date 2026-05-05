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
            <main className="max-w-xl mx-auto px-6 pt-10 space-y-12">
                {/* PAGE HEADER */}
                <header className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tighter text-slate-950 uppercase leading-none">Services</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-1">Operational Command Center</p>
                </header>

                <section className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Tools</h3>
                        <span className="material-symbols-outlined text-slate-300 text-sm">construction</span>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* 1. WALK-IN HUB */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/walk-in')}
                            className="bg-white rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Manual Entry</p>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-950 tracking-tight uppercase">Walk-In Hub</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[240px] tracking-widest">
                                        Quickly log over-the-counter orders and book a "Drop-off Rider" on demand
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-2xl">add_shopping_cart</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. MY SERVICES */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/my-services')}
                            className="bg-white rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Inventory Control</p>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-950 tracking-tight uppercase">My Services</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[240px] tracking-widest">
                                        Take full control of your menu. Add new services, update pricing, or toggle active status instantly.
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-2xl">inventory_2</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* 3. ORDER SUPPLIES */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/material-request')}
                            className="bg-white rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Material Procurement</p>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-950 tracking-tight uppercase">Order Supplies</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[240px] tracking-widest">
                                        Take full control of your menu. Add new services, update pricing, or toggle active status instantly.
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-2xl">shopping_basket</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 4. HIRE TALENT */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/labor-request')}
                            className="bg-white rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Staffing Solutions</p>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-950 tracking-tight uppercase">Hire Talent</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[240px] tracking-widest">
                                        Struggling to find workers? Submit a request and let Spinzyt handle the recruitment and social media broadcast for you.
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-2xl">groups</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* 5. PROMOTIONS */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/vendor/promotions')}
                            className="bg-white rounded-[2.5rem] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden group cursor-pointer border border-slate-100"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-50 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Marketing Hub</p>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-950 tracking-tight uppercase">Promotions</h2>
                                    <p className="text-[8px] text-slate-400 font-black uppercase leading-relaxed max-w-[240px] tracking-widest">
                                        Create custom promo codes, offer flat or percentage discounts, and track campaign performance in real-time.
                                    </p>
                                </div>
                                <div className="w-14 h-14 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500">
                                    <span className="material-symbols-outlined text-2xl">confirmation_number</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <p className="text-center text-[9px] font-black text-slate-200 uppercase tracking-[0.4em] pt-10">Operational Control Hub v3.0</p>
            </main>
        </motion.div>
    );
};

export default ServiceManagement;
