import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SupplierWallet = () => {
    const navigate = useNavigate();
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState(false);

    const transactions = useMemo(() => [
        { id: '#WAL-8822', type: 'Settlement', vendor: 'Spinzyt - HSR', amount: '₹14,290', date: 'Oct 23, 10:45 AM', status: 'Credited' },
        { id: '#WAL-8821', type: 'Material Sale', vendor: 'Spinzyt - Ind', amount: '₹4,800', date: 'Oct 23, 08:30 AM', status: 'Processing' },
        { id: '#WAL-8818', type: 'Settlement', vendor: 'FabriCare - Wfd', amount: '₹22,150', date: 'Oct 22, 06:15 PM', status: 'Credited' }
    ], []);

    const handlePayout = () => {
        setIsRequesting(true);
        setTimeout(() => {
            setIsRequesting(false);
            setRequestSuccess(true);
            setTimeout(() => setRequestSuccess(false), 3000);
        }, 1500);
    };

    return (
        <div className="min-h-screen pb-40">
            <header className="px-6 pt-2 mb-4 z-20 pb-4">
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-on-surface">Wallet</h1>
                <p className="text-[9px] font-black text-on-surface/40 uppercase tracking-[0.3em] mt-1">Bulk Sourcing Settlements</p>
            </header>

            <main className="px-6 space-y-8 flex-1">
                <div className="bg-primary p-8 rounded-[2.5rem] text-white shadow-xl shadow-black/20 relative overflow-hidden group">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                        className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-3xl"
                    ></motion.div>
                    
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Available for Payout</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-8 leading-none">₹84,250.00</h2>
                    
                    <div className="flex gap-3">
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePayout}
                            disabled={isRequesting || requestSuccess}
                            className={`flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-black/5 transition-all ${
                                requestSuccess ? 'bg-emerald-500 text-white' : 'bg-white text-primary'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">
                                {isRequesting ? 'sync' : requestSuccess ? 'check_circle' : 'payments'}
                            </span>
                            {isRequesting ? 'Processing...' : requestSuccess ? 'Request Sent' : 'Request Payout'}
                        </motion.button>
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            className="flex-1 py-4 bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-lg">equalizer</span>
                        </motion.button>
                    </div>
                </div>

                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Revenue Ledger</h2>
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">October 2026</span>
                    </div>

                    <div className="space-y-4">
                        {transactions.map(tx => (
                            <motion.div 
                                key={tx.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-100 ${tx.status === 'Credited' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                        <span className="material-symbols-outlined text-2xl">{tx.status === 'Credited' ? 'add_card' : 'history'}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-[#0F172A] leading-none mb-1">{tx.vendor}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{tx.type} • {tx.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black text-on-surface tracking-tight">{tx.amount}</p>
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${tx.status === 'Credited' ? 'text-primary' : 'text-on-surface/40'}`}>{tx.status}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SupplierWallet;
