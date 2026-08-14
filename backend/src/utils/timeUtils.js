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
        let [hours, minutes] = (time || '').split(':');

        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);

        // An unrecognised slot format must degrade to null, not to an Invalid Date.
        // setHours(NaN) does not throw — it silently corrupts the date, which then
        // fails Mongoose casting and 500s the whole order.
        if (Number.isNaN(hours) || Number.isNaN(minutes)) {
            console.warn(`[TRIGGER_TIME] Unrecognised time slot format: "${timeSlot}"`);
            return null;
        }

        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;

        const dateObj = new Date(dateStr);
        if (Number.isNaN(dateObj.valueOf())) {
            console.warn(`[TRIGGER_TIME] Unrecognised date: "${dateStr}"`);
            return null;
        }

        dateObj.setHours(hours, minutes, 0, 0);

        // Trigger is 2 hours before
        return new Date(dateObj.getTime() - (2 * 60 * 60 * 1000));
    } catch (e) {
        console.error('Error calculating trigger time:', e);
        return null;
    }
};
