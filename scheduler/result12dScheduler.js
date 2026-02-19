const cron = require('node-cron');
const LotteryResult12D = require('../models/LotteryResult12D');
const { getISTDate, formatISTTime, getISTHours, getISTMinutes, getISTDateMidnight } = require('../utils/timezone');
const { generateSmart12DResult } = require('../utils/smartResultGenerator');

// Mapping of result numbers to image names
const resultMapping = {
  1: 'umbrella',
  2: 'book',
  3: 'basket',
  4: 'butterfly',
  5: 'bucket',
  6: 'football',
  7: 'goat',
  8: 'spinning-top',
  9: 'rose',
  10: 'sun',
  11: 'bird',
  12: 'rabbit'
};

// Reverse mapping
const imageToNumber = Object.fromEntries(
  Object.entries(resultMapping).map(([num, img]) => [img, parseInt(num)])
);

// Calculate session number based on time
function calculateSession(hours, minutes) {
  // Starting from 9:00 AM, every 5 minutes is a new session
  const totalMinutes = (hours - 9) * 60 + minutes;
  return Math.floor(totalMinutes / 5) + 1;
}

// Generate 12D result
async function generate12DResult() {
  try {
    const now = getISTDate();
    const hours = getISTHours();
    const minutes = getISTMinutes();
    
    // Only generate between 9 AM and 10:00 PM (inclusive)
    if (hours < 9 || (hours >= 22 && minutes > 0)) {
      return;
    }
    
    // Format draw time
    const drawTime = formatISTTime(now);
    
    // Set draw date to today at midnight
    const drawDate = getISTDateMidnight();
    
    // Check if result already exists
    const existingResult = await LotteryResult12D.findOne({
      drawDate: drawDate,
      drawTime: drawTime
    });
    
    if (existingResult) {
      return;
    }
    
    // Generate smart result based on bets and winning percentage
    const { getManualResult } = require('../routes/admin');
    const manualResult = await getManualResult('12D', drawDate, drawTime);
    
    let result, resultNumber;
    
    if (manualResult) {
      result = manualResult;
      resultNumber = imageToNumber[result] || 1;
    } else {
      // Generate smart result
      result = await generateSmart12DResult(drawDate, drawTime);
      resultNumber = imageToNumber[result] || 1;
    }
    
    // Calculate session
    const session = calculateSession(hours, minutes);
    
    // Create new result
    const newResult = new LotteryResult12D({
      drawDate: drawDate,
      drawTime: drawTime,
      result: result,
      resultNumber: resultNumber,
      session: session
    });
    
    await newResult.save();
    
    // Check winning tickets for this result
    const { checkWinningTickets } = require('../routes/lottery12d');
    await checkWinningTickets(drawDate, drawTime, result);
    
    // Emit socket event for real-time update
    if (global.io) {
      global.io.emit('new12DResult', {
        drawDate: drawDate,
        drawTime: drawTime,
        result: result,
        resultNumber: resultNumber,
        session: session
      });
    }
    
  } catch (error) {
    console.error('Error generating 12D result:', error);
  }
}

// Start 12D scheduler
function start12DScheduler() {
  // Run every 5 minutes at 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 minutes past the hour
  // Between 9 AM and 10 PM
  cron.schedule('*/5 9-21 * * *', async () => {
    await generate12DResult();
  });
  
  // Also run at 10:00 PM (22:00) for the last draw
  cron.schedule('0 22 * * *', async () => {
    await generate12DResult();
  });
}

module.exports = { start12DScheduler, generate12DResult };
