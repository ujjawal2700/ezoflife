import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Package, 
  CreditCard, 
  Truck, 
  CheckCheck, 
  Trash2, 
  ArrowLeft,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useNotificationStore from '../../../shared/stores/notificationStore';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, clearAll } = useNotificationStore();
  
  // Filter for user-specific notifications
  const userNotifications = useMemo(() => 
    notifications.filter(n => n.persona === 'user'),
    [notifications]
  );

  const unreadUserCount = useMemo(() => 
    userNotifications.filter(n => !n.read).length,
    [userNotifications]
  );

  const getIcon = (type = '') => {
    if (type.includes('order') || type.includes('delivery')) return Truck;
    if (type.includes('payment') || type.includes('wallet')) return CreditCard;
    if (type.includes('item')) return Package;
    return Bell;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col font-['Poppins',sans-serif] text-slate-900 bg-[#f8fafc]">
      <main className="flex-1 pb-36 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 mb-2">
                <Bell size={13} className="text-slate-700" />
                <span>Activity & Alerts</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Notifications
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
                Real-time updates about your pickup schedules, dry cleaning progress, and credits.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              {unreadUserCount > 0 && (
                <span className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
                  {unreadUserCount} Unread
                </span>
              )}
              {userNotifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {userNotifications.length > 0 ? (
              userNotifications.map((notif) => {
                const IconComponent = getIcon(notif.type);
                const isUnread = !notif.read;

                return (
                  <motion.div 
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => markAsRead(notif.id)}
                    className={cn(
                      "bg-white rounded-2xl border p-4 sm:p-5 flex items-start gap-4 transition-all cursor-pointer group shadow-2xs hover:shadow-xs",
                      isUnread ? "border-slate-300 bg-white" : "border-slate-200/80 bg-slate-50/50 opacity-80"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isUnread ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-200 text-slate-500"
                    )}>
                      <IconComponent size={18} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn("text-xs sm:text-sm tracking-tight", isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-normal leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-slate-900 mt-2 shrink-0" />
                    )}
                  </motion.div>
                );
              })
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-3 shadow-2xs max-w-md mx-auto">
                <Bell size={36} className="mx-auto text-slate-300" />
                <h3 className="text-base font-semibold text-slate-800">No notifications right now</h3>
                <p className="text-xs text-slate-500">
                  You're all caught up! Order status updates and announcements will appear here.
                </p>
                <button
                  onClick={() => navigate('/user/home')}
                  className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Explore Services
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
};

export default NotificationsPage;
