
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

/**
 * Calculates the next delivery Date based on supplier application frequencies and selected days/dates.
 */
export const calculateNextDeliveryDateForSupplier = (app) => {
    const now = new Date();
    if (!app || !app.deliveryFrequency || app.deliveryFrequency.length === 0) {
        return getNextDeliveryDate('Sunday');
    }

    const freq = app.deliveryFrequency;
    const DAYS_LOWER = DAYS.map(d => d.toLowerCase());

    // 1. Daily
    if (freq.includes('Daily')) {
        const nextDay = new Date();
        nextDay.setDate(now.getDate() + 1);
        nextDay.setHours(23, 59, 59, 999);
        return nextDay;
    }

    // 2. Thrice a week
    if (freq.includes('Thrice a Week') && app.thriceWeekDays && app.thriceWeekDays.length > 0) {
        const targetDays = app.thriceWeekDays.filter(Boolean).map(d => DAYS_LOWER.indexOf(d.toLowerCase())).filter(idx => idx !== -1);
        if (targetDays.length > 0) {
            let minDiff = 8;
            targetDays.forEach(targetDayIdx => {
                const currentDay = now.getDay();
                let diff = (targetDayIdx - currentDay + 7) % 7;
                if (diff === 0) diff = 7;
                if (diff < minDiff) {
                    minDiff = diff;
                }
            });
            const delivery = new Date();
            delivery.setDate(now.getDate() + minDiff);
            delivery.setHours(23, 59, 59, 999);
            return delivery;
        }
    }

    // 3. Weekly
    if (freq.includes('Weekly')) {
        const dayName = app.weeklyDay || 'Sunday';
        try {
            return getNextDeliveryDate(dayName);
        } catch (e) {
            return getNextDeliveryDate('Sunday');
        }
    }

    // 4. Monthly
    if (freq.includes('Monthly') && app.monthlyDate) {
        const targetDate = parseInt(app.monthlyDate, 10);
        if (!isNaN(targetDate)) {
            const delivery = new Date();
            delivery.setHours(23, 59, 59, 999);
            if (now.getDate() < targetDate) {
                delivery.setDate(targetDate);
            } else {
                delivery.setMonth(delivery.getMonth() + 1);
                delivery.setDate(targetDate);
            }
            return delivery;
        }
    }

    // 5. On-Demand / fallback
    const delivery = new Date();
    delivery.setDate(now.getDate() + 2);
    delivery.setHours(23, 59, 59, 999);
    return delivery;
};
