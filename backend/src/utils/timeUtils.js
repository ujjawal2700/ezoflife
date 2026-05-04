/**
 * Calculates trigger time (2 hours before slot start)
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeSlot - e.g., "10:00 AM - 12:00 PM"
 * @returns {Date|null}
 */
export const calculateTriggerTime = (dateStr, timeSlot) => {
    if (!dateStr || !timeSlot) return null;
    try {
        const startTimeStr = timeSlot.split('-')[0].trim();
        const [time, modifier] = startTimeStr.split(' ');
        let [hours, minutes] = time.split(':');
        
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        
        const dateObj = new Date(dateStr);
        dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        
        // Trigger is 2 hours before
        return new Date(dateObj.getTime() - (2 * 60 * 60 * 1000));
    } catch (e) {
        console.error('Error calculating trigger time:', e);
        return null;
    }
};
