import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi, referralApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const ReferralPage = () => {
    const navigate = useNavigate();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [config, setConfig] = useState({
        REFERRAL_MESSAGE: "Hi! I've been using Spinzyt for my laundry services and thought you'd love it. Download it here: ",
        REFERRAL_DOWNLOAD_LINK: "https://spinzyt.com/download"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const data = await adminApi.getConfig();
                const referralMsg = data.find(c => c.key === 'REFERRAL_MESSAGE')?.value;
                const referralLink = data.find(c => c.key === 'REFERRAL_DOWNLOAD_LINK')?.value;
                
                setConfig({
                    REFERRAL_MESSAGE: referralMsg || config.REFERRAL_MESSAGE,
                    REFERRAL_DOWNLOAD_LINK: referralLink || config.REFERRAL_DOWNLOAD_LINK
                });
            } catch (error) {
                console.error('Fetch Config Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const validatePhone = (phone) => {
        return /^[0-9]{10}$/.test(phone);
    };

    const handleManualInput = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
        setPhoneNumber(val);
    };

    const selectFromContacts = async () => {
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            toast.error('Contact selection is not supported in this browser. Please enter the number manually.');
            return;
        }

        try {
            const props = ['tel'];
            const opts = { multiple: false };
            const contacts = await navigator.contacts.select(props, opts);
            
            if (contacts && contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
                // Extract just digits and take last 10
                const tel = contacts[0].tel[0].replace(/\D/g, '');
                const formatted = tel.slice(-10);
                if (validatePhone(formatted)) {
                    setPhoneNumber(formatted);
                    toast.success('Contact selected!');
                } else {
                    toast.error('Invalid phone number format in contact.');
                }
            }
        } catch (err) {
            console.error('Contact Picker Error:', err);
            // Don't toast error on cancel
            if (err.name !== 'AbortError') {
                toast.error('Failed to access contacts.');
            }
        }
    };

    const recordReferralInDb = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const referrerId = user._id || user.id;
            if (referrerId) {
                await referralApi.create({
                    referrer: referrerId,
                    referredPhone: phoneNumber
                });
            }
        } catch (err) {
            console.error('Failed to log referral to DB:', err);
        }
    };

    const triggerReferral = async (type) => {
        await recordReferralInDb();
        const fullMessage = `${config.REFERRAL_MESSAGE} ${config.REFERRAL_DOWNLOAD_LINK}`;
        const encodedMsg = encodeURIComponent(fullMessage);
        
        if (type === 'whatsapp') {
            window.open(`https://wa.me/91${phoneNumber}?text=${encodedMsg}`, '_blank');
        } else {
            window.location.href = `sms:+91${phoneNumber}?body=${encodedMsg}`;
        }
    };

    const isValid = validatePhone(phoneNumber);

    return (
        <div className="bg-slate-50/50 text-slate-900 min-h-screen pb-32 font-body">
            <header className="px-6 pt-6 flex items-center mb-8">
                <div className="flex items-center gap-4">
                    <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-900 border border-slate-100"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </motion.button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none">Refer Us</h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Invite Friends & Family</p>
                    </div>
                </div>
            </header>

            <main className="px-6 max-w-md mx-auto space-y-8">
                {/* Hero Section */}
                <section className="text-center space-y-4 py-6">
                    <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-slate-900/20">
                        <span className="material-symbols-outlined text-4xl">share</span>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Spread the word</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            Invite your friends to Spinzyt and <br/>let them experience premium care.
                        </p>
                    </div>
                </section>

                {/* Input Options */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Recipient Number</label>
                            
                            {/* Manual Entry */}
                            <div className="relative">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                                    <span className="material-symbols-outlined text-xl">phone_iphone</span>
                                </div>
                                <input 
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={handleManualInput}
                                    placeholder="Enter 10-digit number"
                                    className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-6 py-5 text-sm font-bold focus:ring-2 focus:ring-slate-900/5 outline-none transition-all"
                                />
                                {isValid && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500">
                                        <span className="material-symbols-outlined text-xl">check_circle</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px bg-slate-100" />
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">or</span>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>

                            {/* Contact Integration */}
                            <button 
                                onClick={selectFromContacts}
                                className="w-full py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all"
                            >
                                <span className="material-symbols-outlined text-sm">contact_page</span>
                                Select from Contacts
                            </button>
                        </div>
                    </div>

                    {/* Referral Actions */}
                    <div className="space-y-3">
                        <button 
                            disabled={!isValid}
                            onClick={() => triggerReferral('whatsapp')}
                            className="w-full bg-[#25D366] text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#25D366]/20 flex items-center justify-center gap-3 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">chat</span>
                            Refer via WhatsApp
                        </button>
                        
                        <button 
                            disabled={!isValid}
                            onClick={() => triggerReferral('sms')}
                            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">sms</span>
                            Refer via SMS
                        </button>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-slate-900/5 p-6 rounded-[2rem] border border-slate-900/5">
                    <p className="text-[9px] font-bold text-slate-500 text-center leading-relaxed">
                        By referring, you're helping your friends get the best service in town. They will receive a download link and a welcome message from you.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default ReferralPage;
