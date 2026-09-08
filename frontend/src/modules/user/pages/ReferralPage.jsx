import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, 
  Share2, 
  MessageCircle, 
  Phone, 
  Copy, 
  Check, 
  Sparkles, 
  Users, 
  IndianRupee, 
  CheckCircle2, 
  Contact2,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminApi, referralApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const ReferralPage = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState(false);
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

  const handleCopyLink = () => {
    const link = config.REFERRAL_DOWNLOAD_LINK;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const isValid = validatePhone(phoneNumber);

  return (
    <div className="min-h-[100dvh] flex flex-col text-slate-900 bg-slate-50/50">
      <main className="flex-1 pb-36 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* Main 2-Column Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Rewards & Explainer */}
          <div className="md:col-span-6 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                <Gift size={13} className="text-slate-700" />
                <span>Referral Rewards Program</span>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                  Give ₹100, <br />Get ₹100 Back
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
                  Invite friends, family, and colleagues to Spinzyt. When they place their first laundry or dry cleaning pickup, you both get ₹100 credited directly into your wallet.
                </p>
              </div>

              {/* 3 Step Timeline */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800">Share Your Invite Link</h4>
                    <p className="text-xs text-slate-500">Send via WhatsApp or SMS to your contacts.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800">Friend Books First Pickup</h4>
                    <p className="text-xs text-slate-500">They enjoy convenient doorstep laundry pickup.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Both Receive ₹100 Wallet Credits</h4>
                    <p className="text-xs text-slate-500">Auto-applied towards your next orders.</p>
                  </div>
                </div>
              </div>

              {/* Copy Invite Link Card */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Your Shareable Download Link</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pl-3.5">
                  <span className="text-xs text-slate-600 font-normal truncate flex-1">
                    {config.REFERRAL_DOWNLOAD_LINK}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Friend Invite Card */}
          <div className="md:col-span-6 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Direct Contact Invite</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter your friend's phone number to send an instant invite.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Recipient Phone Number</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-500 font-semibold text-xs">+91</span>
                    <input 
                      type="tel"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={handleManualInput}
                      placeholder="10-digit mobile number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-10 py-3 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                    />
                    {isValid && (
                      <CheckCircle2 size={16} className="absolute right-3.5 text-emerald-500" />
                    )}
                  </div>
                </div>

                {/* Choose from Contacts */}
                <button
                  type="button"
                  onClick={selectFromContacts}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200/60"
                >
                  <Contact2 size={15} />
                  <span>Select from Contacts</span>
                </button>

                {/* Share CTAs */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => triggerReferral('whatsapp')}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <MessageCircle size={16} />
                    <span>Invite via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerReferral('sms')}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                  >
                    <Share2 size={16} />
                    <span>Invite via SMS</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
                  By referring, your friend receives a welcome invitation link. Standard SMS or data rates may apply.
                </p>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default ReferralPage;
