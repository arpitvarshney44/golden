// Timezone utility for India Standard Time (IST)
// IST is UTC+5:30

/**
 * Get current date/time in IST
 * @returns {Date} Date object adjusted to IST
 */
function getISTDate() {
    const now = new Date();
    
    // Convert to IST (UTC+5:30)
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istTime = new Date(utcTime + istOffset);
    
    return istTime;
}

/**
 * Format time in IST as HH:MM:SS AM/PM
 * @param {Date} date - Date object (optional, defaults to current IST time)
 * @returns {string} Formatted time string
 */
function formatISTTime(date = null) {
    const istDate = date || getISTDate();
    
    return istDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
}

/**
 * Format time in IST as HH:MM
 * @param {Date} date - Date object (optional, defaults to current IST time)
 * @returns {string} Formatted time string
 */
function formatISTTimeShort(date = null) {
    const istDate = date || getISTDate();
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Get IST date at midnight (00:00:00)
 * @returns {Date} Date object for today at midnight IST
 */
function getISTDateMidnight() {
    const istDate = getISTDate();
    istDate.setHours(0, 0, 0, 0);
    return istDate;
}

/**
 * Get current IST hours (0-23)
 * @returns {number} Current hour in IST
 */
function getISTHours() {
    return getISTDate().getHours();
}

/**
 * Get current IST minutes (0-59)
 * @returns {number} Current minutes in IST
 */
function getISTMinutes() {
    return getISTDate().getMinutes();
}

/**
 * Check if current IST time is within operating hours (9 AM - 10 PM)
 * @returns {boolean} True if within operating hours
 */
function isWithinOperatingHours() {
    const hours = getISTHours();
    return hours >= 9 && hours < 22;
}

module.exports = {
    getISTDate,
    formatISTTime,
    formatISTTimeShort,
    getISTDateMidnight,
    getISTHours,
    getISTMinutes,
    isWithinOperatingHours
};
