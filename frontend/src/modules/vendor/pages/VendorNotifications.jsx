import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import VendorHeader from '../components/VendorHeader';

import useNotificationStore from '../../../shared/stores/notificationStore';

const VendorNotifications = () => {
    const navigate = useNavigate();
    const { notifications, fetchNotifications, markAllAsRead } = useNotificationStore();

    const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
    const vendorData = JSON.parse(vendorDataRaw);
    const vendorId = vendorData?._id || vendorData?.id || vendorData?.user?._id || vendorData?.user?.id;

    React.useEffect(() => {
        if (vendorId) {
            fetchNotifications(vendorId, 'vendor');
        }
    }, [vendorId]);
    
    // Filter notifications for the 'vendor' persona
    const vendorNotifications = useMemo(() => 
        notifications.filter(n => n.persona === 'vendor'), 
    [notifications]);

    const iconColors = useMemo(() => ({
        order: 'bg-[#3D5AFE]/10 text-[#3D5AFE]',
        payout: 'bg-green-50 text-green-600',
        rating: 'bg-amber-50 text-amber-500',
        pickup: 'bg-slate-100 text-slate-600',
        system: 'bg-purple-50 text-purple-500',
        pickup_complete: 'bg-blue-50 text-blue-600',
        ready: 'bg-primary/10 text-primary',
        at_shop: 'bg-cyan-50 text-cyan-600',
    }), []);

    return (
        <div className="text-[#1E293B] min-h-screen pb-32 font-sans">

            <motion.main 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto px-6 py-8 space-y-4"
            >
                <div className="flex items-center justify-between mb-2 px-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Activity Feed</span>
                    <button 
                        onClick={() => markAllAsRead()}
                        className="text-[#3D5AFE] font-bold text-[10px] uppercase tracking-widest hover:underline"
                    >
                        Mark all read
                    </button>
                </div>

                {vendorNotifications.length > 0 ? (
                    vendorNotifications.map((notif, i) => (
                        <motion.div 
                            key={notif.id}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            whileHover={{ x: 6 }}
                            className={`flex items-start gap-5 p-5 rounded-2xl border transition-all cursor-pointer ${notif.read === false ? 'bg-white border-[#3D5AFE]/10 shadow-lg shadow-[#3D5AFE]/5' : 'bg-white border-slate-50 shadow-sm opacity-80'}`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColors[notif.type] || 'bg-slate-100 text-slate-500'}`}>
                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {notif.type === 'pickup_complete' ? 'local_shipping' : 
                                     notif.type === 'ready' ? 'rocket_launch' : 
                                     notif.type === 'at_shop' ? 'store' : 
                                     notif.type === 'payout' ? 'payments' : 
                                     notif.type === 'order' ? 'shopping_bag' : 'notifications'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                    <p className={`text-sm font-bold leading-tight ${notif.read === false ? 'text-slate-800' : 'text-slate-600'}`}>{notif.title}</p>
                                    {notif.read === false && <span className="w-2 h-2 bg-[#3D5AFE] rounded-full mt-1.5 flex-shrink-0"></span>}
                                </div>
                                <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{notif.message}</p>
                                <p className="text-[10px] text-slate-300 font-bold tracking-tight mt-2 italic capitalize">{notif.type.replace('_', ' ')} · Just Now</p>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Quiet Feed</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No operational alerts currently.</p>
                    </div>
                )}
            </motion.main>
        </div>
    );
};


export default VendorNotifications;
