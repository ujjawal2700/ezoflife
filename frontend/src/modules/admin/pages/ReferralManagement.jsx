import React, { useState, useEffect } from 'react';
import { adminApi, referralApi } from '../../../lib/api';
import PageHeader from '../components/common/PageHeader';
import { Share2, Save, MessageSquare, Link, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const ReferralManagement = () => {
    const [config, setConfig] = useState({
        REFERRAL_MESSAGE: "Hi! I've been using Spinzyt for my laundry services and thought you'd love it. Download it here: ",
        REFERRAL_DOWNLOAD_LINK: "https://spinzyt.com/download"
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [referrals, setReferrals] = useState([]);

    const SMS_CHAR_LIMIT = 160;

    const fetchReferrals = async () => {
        try {
            const data = await referralApi.getAll();
            setReferrals(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch Referrals Error:', error);
        }
    };

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
        fetchReferrals();
    }, []);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await adminApi.updateConfig({ key: 'REFERRAL_MESSAGE', value: config.REFERRAL_MESSAGE });
            await adminApi.updateConfig({ key: 'REFERRAL_DOWNLOAD_LINK', value: config.REFERRAL_DOWNLOAD_LINK });
            toast.success('Referral settings updated successfully!');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const totalLength = config.REFERRAL_MESSAGE.length + config.REFERRAL_DOWNLOAD_LINK.length;
    const isOverLimit = totalLength > SMS_CHAR_LIMIT;

    return (
        <div className="p-6 space-y-6">
            <PageHeader 
                title="Referral Management" 
                subtitle="Configure the viral growth message and links"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight">Message Template</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pre-populated text for users</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Welcome Message</label>
                                <textarea 
                                    value={config.REFERRAL_MESSAGE}
                                    onChange={(e) => setConfig({ ...config, REFERRAL_MESSAGE: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-slate-900 outline-none text-sm font-bold min-h-[120px] resize-none"
                                    placeholder="Enter the invitation message..."
                                />
                                <div className="flex justify-between items-center px-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
                                        Character Count: {totalLength} / {SMS_CHAR_LIMIT}
                                    </span>
                                    {isOverLimit && (
                                        <span className="text-[10px] font-bold text-red-500 italic flex items-center gap-1">
                                            <Info size={12} /> May split into 2 SMS
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Download Link</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Link size={16} />
                                    </div>
                                    <input 
                                        type="text"
                                        value={config.REFERRAL_DOWNLOAD_LINK}
                                        onChange={(e) => setConfig({ ...config, REFERRAL_DOWNLOAD_LINK: e.target.value })}
                                        className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-slate-900 outline-none text-sm font-bold"
                                        placeholder="https://appstore.com/spinzyt"
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 italic px-1">This link will be appended to the end of your message.</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={isSaving || loading}
                            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Save size={14} />
                            {isSaving ? 'Updating...' : 'Save Referral Settings'}
                        </button>
                    </div>
                </div>

                {/* Preview Card */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6 relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-10 opacity-10">
                            <Share2 size={80} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Live Preview</h3>
                        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                            <p className="text-sm font-bold leading-relaxed">
                                {config.REFERRAL_MESSAGE}
                                <span className="text-blue-400 underline break-all">{config.REFERRAL_DOWNLOAD_LINK}</span>
                            </p>
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 italic">
                            *This is how the message will look when the user clicks 'Refer'.
                        </p>
                    </div>

                    {/* Tips section removed */}
                </div>
            </div>

            {/* Referral History Table */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight">Referral History</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Track viral referral downloads & sign-ups</p>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-[9px] font-black text-slate-500 rounded-full uppercase tracking-widest">
                        {referrals.length} Total Referrals
                    </span>
                </div>
                
                <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Referrer Name</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Referrer Number</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Referred Number</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Is Downloaded</th>
                                <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Referral Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {referrals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                        No referral logs recorded yet
                                    </td>
                                </tr>
                            ) : (
                                referrals.map((ref) => (
                                    <tr key={ref._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-5 text-xs font-black text-slate-900 uppercase tracking-tight">
                                            {ref.referrerName}
                                        </td>
                                        <td className="p-5 text-[10px] font-bold text-slate-500 tabular-nums">
                                            {ref.referrerPhone}
                                        </td>
                                        <td className="p-5 text-[10px] font-bold text-slate-500 tabular-nums">
                                            {ref.referredPhone}
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                ref.isDownloaded === 'Yes' 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                     : 'bg-rose-50 text-rose-600 border border-rose-100'
                                            }`}>
                                                {ref.isDownloaded}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                                            {new Date(ref.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReferralManagement;
