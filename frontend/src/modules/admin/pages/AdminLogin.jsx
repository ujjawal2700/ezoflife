import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../../../lib/api';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [otpChannel, setOtpChannel] = useState('WhatsApp'); // 'WhatsApp' or 'SMS'
    const [apiError, setApiError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isLoginValid = phone.length === 10 && /^\d+$/.test(phone);

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.5,
                staggerChildren: 0.05
            }
        },
        exit: {
            opacity: 0,
            y: -20,
            transition: { duration: 0.3 }
        }
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
    }), []);

    const otpChannels = useMemo(() => [
        { id: 'WhatsApp', icon: 'chat', color: 'text-green-600' },
        { id: 'SMS', icon: 'sms', color: 'text-primary' }
    ], []);

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!isLoginValid) return;
        
        setIsLoading(true);
        setApiError('');

        try {
            const response = await authApi.requestOtp(phone, otpChannel, 'login', 'Admin');
            if (response.message === 'OTP sent successfully' || response.message === 'Admin OTP sent successfully') {
                navigate('/admin/otp', { state: { phone, channel: otpChannel } });
            } else {
                setApiError(response.message || 'Access Denied');
                setIsLoading(false);
            }
        } catch (err) {
            setApiError('Authorization system error.');
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-background font-body text-on-background min-h-[100dvh] flex flex-col overflow-x-hidden">
            {/* Hero Visual Section */}
            <div className="relative h-[25dvh] min-h-[220px] w-full overflow-hidden flex items-center justify-center">
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary-container/30 rounded-full blur-[80px]"></div>
                <div className="absolute top-40 -right-20 w-96 h-96 bg-tertiary-container/20 rounded-full blur-[100px]"></div>
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="z-10 text-center px-8"
                >
                    <h1 className="font-headline font-black text-[2.5rem] md:text-[3.5rem] text-primary leading-none tracking-tight mb-2 uppercase">Ez Control</h1>
                    <p className="font-label text-on-surface-variant uppercase tracking-[0.2em] text-[10px] font-bold">Administrative Command Hub</p>
                </motion.div>
                <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-background to-transparent"></div>
            </div>

            {/* Auth Container */}
            <main className="flex-grow px-6 -mt-6 relative z-20 pb-12">
                <div className="max-w-md mx-auto">
                    {/* Title */}
                    <div className="flex items-center justify-center mb-8">
                        <span className="font-headline text-2xl font-black text-on-background uppercase tracking-tighter">Login Access</span>
                    </div>

                    {/* Auth Card */}
                    <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_40px_60px_rgba(47,50,58,0.08)] border border-outline-variant/5"
                    >
                        <div className="space-y-10">
                            <motion.div variants={itemVariants}>
                                <h2 className="font-headline text-3xl font-black mb-3 text-on-surface leading-tight">Welcome Commander</h2>
                                <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest opacity-60 leading-relaxed">
                                    Secure verification required for administrative privileges.
                                </p>
                            </motion.div>

                            <div className="space-y-8">
                                {/* Phone Input */}
                                <motion.div variants={itemVariants} className="relative group">
                                    <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 ml-1 opacity-60">Authorized Phone</label>
                                    <div className="flex items-center bg-surface-container-low rounded-[1.75rem] p-1.5 border border-slate-300 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20">
                                        <div className="px-6 font-black text-on-surface text-sm opacity-40">+91</div>
                                        <input
                                            className="w-full bg-transparent border-none focus:ring-0 py-4.5 px-2 text-on-surface font-black text-md placeholder:text-on-surface/20 placeholder:font-medium outline-none tracking-widest"
                                            placeholder="000 000 0000"
                                            type="tel"
                                            maxLength={10}
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        />
                                    </div>
                                </motion.div>

                                {apiError && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-error font-bold text-center uppercase tracking-widest animate-pulse">
                                        {apiError}
                                    </motion.p>
                                )}

                                <motion.button
                                    variants={itemVariants}
                                    whileTap={isLoginValid ? { scale: 0.98 } : {}}
                                    onClick={handleRequestOtp}
                                    disabled={!isLoginValid || isLoading}
                                    className={`w-full font-headline font-black py-6 rounded-2xl shadow-2xl tracking-[0.2em] uppercase text-[10px] transition-all duration-300 ${isLoginValid ? 'bg-primary text-on-primary shadow-primary/20 hover:scale-[1.02]' : 'bg-surface-container-high text-on-surface/20 cursor-not-allowed opacity-50'}`}
                                >
                                    {isLoading ? 'Decrypting Access...' : 'Authenticate Admin'}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default AdminLogin;
