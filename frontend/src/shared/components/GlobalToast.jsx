import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNotificationStore from '../stores/notificationStore';
import { safeStorage } from '@/lib/safeStorage';

/**
 * Global Toast Manager (Phase 4 Requirement)
 * Provides tactile, ephemeral feedback for all triggers.
 * PERSISTENT & SMART FIX: 
 * 1. Uses localStorage to track processed IDs.
 * 2. ONLY toasts notifications created in the last 15 seconds.
 * 3. STRICT CHECK: If rawDate is missing or invalid, do not toast (prevents stale DB data from toasting).
 */
const GlobalToast = () => {
    const notifications = useNotificationStore(state => state.notifications);
    const [activeToast, setActiveToast] = useState(null);
    
    const [lastShownId, setLastShownId] = useState(() => {
        return safeStorage.getItem('last_processed_toast_id') || null;
    });

    useEffect(() => {
        if (notifications.length > 0) {
            const latest = notifications[0];
            
            // 1. Check if ID is different from what we last showed
            const isNewId = latest.id !== lastShownId;
            
            // 2. Freshness Check (STRICT)
            // If rawDate is missing or ancient, it's likely a bulk DB fetch on refresh.
            if (!latest.rawDate) {
                // If it's a new ID but has no date, just mark it as seen and skip toast
                if (isNewId) {
                    setLastShownId(latest.id);
                    safeStorage.setItem('last_processed_toast_id', latest.id);
                }
                return;
            }

            const createdTime = new Date(latest.rawDate).getTime();
            const now = Date.now();
            const ageInSeconds = (now - createdTime) / 1000;
            const isRecent = ageInSeconds < 15; // Only toast if within last 15 seconds

            console.log(`[Toast Debug] ID: ${latest.id}, Age: ${ageInSeconds.toFixed(1)}s, New: ${isNewId}, Recent: ${isRecent}`);

            if (isNewId && isRecent) {
                setActiveToast(latest);
                setLastShownId(latest.id);
                localStorage.setItem('last_processed_toast_id', latest.id);
                
                const timer = setTimeout(() => {
                    setActiveToast(null);
                }, 5000);

                return () => clearTimeout(timer);
            } else if (isNewId) {
                // Mark as seen so it doesn't trigger again, even if not recent
                setLastShownId(latest.id);
                localStorage.setItem('last_processed_toast_id', latest.id);
            }
        }
    }, [notifications, lastShownId]);

    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[90%] md:max-w-md pointer-events-none">
            <AnimatePresence>
                {activeToast && (
                    <motion.div
                        initial={{ y: -100, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -100, opacity: 0, scale: 0.9 }}
                        className="bg-slate-950 text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-4 pointer-events-auto premium-reflection"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-primary-gradient flex items-center justify-center text-primary border border-white/5">
                            <span className="material-symbols-outlined text-emerald-400">notifications_active</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5 italic">Real-time Signal Detected</p>
                            <h4 className="text-xs font-black tracking-tight leading-tight mb-1 truncate">{activeToast.title}</h4>
                            <p className="text-[10px] font-bold text-slate-400 leading-tight line-clamp-1 opacity-80 uppercase">{activeToast.message}</p>
                        </div>
                        <button 
                            onClick={() => setActiveToast(null)}
                            className="p-2 text-slate-500 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalToast;
