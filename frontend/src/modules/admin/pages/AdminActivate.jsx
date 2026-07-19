import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, KeyRound, Mail, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BASE_URL } from '../../../lib/api';

export default function AdminActivate() {
    const navigate = useNavigate();
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [adminDetails, setAdminDetails] = useState(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [activating, setActivating] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const inviteToken = queryParams.get('token');
        if (!inviteToken) {
            setError('Activation token is missing from the invitation link.');
            setLoading(false);
            return;
        }
        setToken(inviteToken);

        const fetchDetails = async () => {
            try {
                const res = await fetch(`${BASE_URL}/auth/sub-admin-activation-details?token=${inviteToken}`);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'Invalid or expired invitation link');
                }
                setAdminDetails(data);
            } catch (err) {
                setError(err.message || 'Invalid or expired invitation link');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            return toast.error('Password must be at least 6 characters long');
        }

        if (password !== confirmPassword) {
            return toast.error('Passwords do not match');
        }

        if (otp.length !== 6) {
            return toast.error('Please enter a valid 6-digit OTP');
        }

        setActivating(true);
        try {
            const res = await fetch(`${BASE_URL}/auth/activate-sub-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    password,
                    otp
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Activation failed');
            }

            toast.success('Account activated successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/admin/login');
            }, 2500);

        } catch (err) {
            toast.error(err.message || 'Failed to activate account');
        } finally {
            setActivating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Invitation Details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-3xl border border-red-100 flex items-center justify-center text-red-500 mb-6 shadow-sm">
                    <ShieldAlert size={28} />
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Activation Error</h2>
                <p className="text-xs font-bold text-slate-500 max-w-sm mt-2 leading-relaxed uppercase tracking-wider">{error}</p>
                <button 
                    onClick={() => navigate('/admin/login')}
                    className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all cursor-pointer"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 relative overflow-hidden">
            {/* Ambient Background blur */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-lg border border-slate-800 mx-auto mb-5">
                        <KeyRound size={24} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-slate-950">Activate Admin Account</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 leading-relaxed">
                        Hi {adminDetails?.displayName}, set up your password to activate your {adminDetails?.adminRole} account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 text-left">
                    {/* Auto-filled Email */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Corporate Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                disabled
                                type="email"
                                value={adminDetails?.email || ''}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">New Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                required
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-950 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Confirm Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                required
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-950 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Verification OTP */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Verification OTP (Sent to Email/WhatsApp)</label>
                        <input 
                            required
                            type="text"
                            maxLength={6}
                            placeholder="123456"
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-black text-slate-900 focus:bg-white focus:border-slate-950 outline-none transition-all tracking-[0.4em] text-center"
                        />
                    </div>

                    {/* Submit */}
                    <button 
                        disabled={activating}
                        type="submit"
                        className="w-full bg-slate-950 hover:bg-black text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 transition-all border border-slate-900 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {activating ? (
                            <>
                                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Activating Account...
                            </>
                        ) : 'Activate Account'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
