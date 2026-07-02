import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import UserHeader from '../components/UserHeader';
import { authApi, orderApi } from '../../../lib/api';

const WalletPage = () => {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const userId = useMemo(() => {
        const userRaw = localStorage.getItem('user') || '{}';
        const user = JSON.parse(userRaw);
        return user._id || user.id || null;
    }, []);

    useEffect(() => {
        if (userId) {
            const loadData = async () => {
                try {
                    setLoading(true);
                    
                    // Fetch live balance
                    const profile = await authApi.getProfile(userId);
                    setBalance(profile?.walletBalance || 0);

                    // Fetch customer orders to find B2B cashback records
                    const orders = await orderApi.getMyOrders(userId);
                    const cashbackTxList = (orders || [])
                        .filter(o => o.ledger && o.ledger.customerWalletCredit > 0)
                        .map(o => ({
                            id: o.orderId || `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
                            type: 'Promo Cashback',
                            amount: o.ledger.customerWalletCredit,
                            date: new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            status: 'Credited'
                        }));

                    setTransactions(cashbackTxList);
                } catch (err) {
                    console.error('Failed to load wallet data:', err);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        } else {
            setLoading(false);
        }
    }, [userId]);

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
    }), []);

    return (
        <div className="bg-[#FAFBFD] text-slate-900 min-h-screen pb-32 font-sans">
            <UserHeader title="SPINZYT Wallet" showBack={true} onBack={() => navigate(-1)} />
            
            <motion.main 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-xl mx-auto px-6 pt-16 space-y-10"
            >
                {/* Balance Display */}
                <motion.section variants={itemVariants} className="relative mt-8">
                    <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-3">Available Balance</p>
                        <h2 className="text-5xl font-black tracking-tighter tabular-nums mb-2">
                            ₹{balance.toLocaleString('en-IN')}
                        </h2>
                    </div>
                </motion.section>

                {/* Transaction History */}
                <motion.section variants={itemVariants} className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Transaction History</h3>
                        <span className="material-symbols-outlined text-slate-300">tune</span>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                <span className="material-symbols-outlined text-3xl text-slate-200 mb-2">receipt_long</span>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No promotion cashback history yet</p>
                            </div>
                        ) : transactions.map((tx, i) => (
                            <motion.div 
                                variants={itemVariants}
                                key={tx.id} 
                                className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-900">
                                        <span className="material-symbols-outlined text-[20px]">
                                            {tx.type.includes('Cashback') || tx.type.includes('Promo') ? 'celebration' : 'account_balance_wallet'}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">{tx.type}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tx.date} · {tx.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black tracking-tighter tabular-nums text-slate-900">
                                        {tx.amount > 0 ? '+' : ''}₹{tx.amount}
                                    </p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mt-1">{tx.status}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>
            </motion.main>
        </div>
    );
};

export default WalletPage;
