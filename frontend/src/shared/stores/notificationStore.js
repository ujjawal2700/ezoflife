import { create } from 'zustand';
import { notificationApi } from '../../lib/api';

const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async (userId, role) => {
        if (!userId || !role) return;
        set({ isLoading: true });
        try {
            const data = await notificationApi.getNotifications(userId, role);
            if (!Array.isArray(data)) {
                set({ notifications: [], unreadCount: 0, isLoading: false });
                return;
            }

            const mapped = data.filter(n => n).map(n => ({
                id: n._id,
                type: n.type,
                title: n.title,
                message: n.message,
                orderId: n.orderId,
                read: n.isRead,
                timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                rawDate: n.createdAt,
                persona: n.role,
                customer: n.payload?.customer,
                from: n.payload?.from,
                to: n.payload?.to,
                dist: n.payload?.dist,
                pay: n.payload?.pay,
                displayId: n.payload?.displayId,
                payload: n.payload
            }));
            
            set({ 
                notifications: mapped, 
                unreadCount: mapped.filter(n => !n.read).length,
                isLoading: false 
            });
        } catch (err) {
            console.error('Store Fetch Error:', err);
            set({ isLoading: false });
        }
    },

    markAsRead: async (id) => {
        try {
            await notificationApi.markAsRead(id);
            set((state) => ({
                notifications: state.notifications.map((n) => 
                    n.id === id ? { ...n, read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1)
            }));
        } catch (err) {
            console.error('Mark Read Error:', err);
        }
    },

    dismissOrderNotification: (orderId) => {
        set((state) => ({
            notifications: state.notifications.filter((n) => n.orderId !== orderId),
        }));
    },

    clearAll: async (userId, role) => {
        try {
            await notificationApi.clearAll(userId, role);
            set({ notifications: [], unreadCount: 0 });
        } catch (err) {
            console.error('Clear Error:', err);
        }
    },

    addNotification: (type, title, message, role, extraData = {}) => {
        const newNotif = {
            id: Date.now().toString(),
            type,
            title,
            message,
            read: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rawDate: new Date().toISOString(),
            persona: role,
            ...extraData
        };
        set((state) => ({
            notifications: [newNotif, ...state.notifications],
            unreadCount: state.unreadCount + 1
        }));
    }
}));

export default useNotificationStore;
