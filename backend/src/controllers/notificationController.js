import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
    try {
        const { userId, role } = req.query;
        if (!userId) return res.status(400).json({ message: 'User ID required' });
        const query = { recipient: userId };
        if (role) query.role = role.toLowerCase();

        const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(20);

        res.status(200).json(notifications);
    } catch (err) {
        console.error('Fetch Notifications Error:', err);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndUpdate(id, { isRead: true });
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Error marking notification' });
    }
};

export const clearAll = async (req, res) => {
    try {
        const { userId, role } = req.query;

        // Without this, a missing role throws on .toLowerCase() and 500s. A
        // missing userId would also match nothing and delete nothing, so both
        // are required explicitly.
        if (!userId || !role) {
            return res.status(400).json({ message: 'userId and role are required' });
        }

        await Notification.deleteMany({ recipient: userId, role: role.toLowerCase() });
        res.status(200).json({ message: 'Notifications cleared' });
    } catch (err) {
        res.status(500).json({ message: 'Error clearing notifications' });
    }
};
