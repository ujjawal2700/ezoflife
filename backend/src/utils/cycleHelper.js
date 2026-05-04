
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Gets the next occurrence of a specific day of the week.
 * @param {string} dayName - Name of the day (e.g., 'Sunday')
 * @returns {Date}
 */
export const getNextDeliveryDate = (dayName) => {
    const targetDay = DAYS.indexOf(dayName);
    if (targetDay === -1) throw new Error('Invalid day name');

    const now = new Date();
    const resultDate = new Date();
    resultDate.setHours(23, 59, 59, 999); // Set to end of day

    const currentDay = now.getDay();
    let daysUntilTarget = (targetDay - currentDay + 7) % 7;

    // If today is the target day, we need to decide if it's for today or next week.
    // For our logic, if it's Saturday night cutoff for Sunday delivery:
    // If today is Sunday, the window for THIS Sunday is closed, so we go to NEXT Sunday.
    if (daysUntilTarget === 0) {
        daysUntilTarget = 7;
    }

    resultDate.setDate(now.getDate() + daysUntilTarget);
    return resultDate;
};

/**
 * Generates a Cycle ID based on the delivery date.
 * Format: YYYY-DAY-WEEKNUMBER
 */
export const generateCycleId = (deliveryDate) => {
    const year = deliveryDate.getFullYear();
    const day = DAYS[deliveryDate.getDay()].toUpperCase().substring(0, 3);
    
    // Get week number
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (deliveryDate - firstDayOfYear) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

    return `${year}-${day}-${weekNum}`;
};

/**
 * Checks if current time is before the cutoff for a delivery day.
 * Cutoff is usually 24 hours before the delivery day (e.g., Saturday night for Sunday delivery).
 */
export const isBeforeCutoff = (deliveryDate, cutoffHours = 24) => {
    const now = new Date();
    const cutoffTime = new Date(deliveryDate);
    cutoffTime.setHours(cutoffTime.getHours() - cutoffHours);
    return now < cutoffTime;
};
