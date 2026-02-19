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
      console.log('12D: Outside operating hours (9 AM - 10:00 PM IST)');
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
      console.log('12D: Result already exists for', drawTime, 'IST');
      return;
    }
    
    // Generate smart result based on bets and winning percentage
    const result = await generateSmart12DResult(drawDate, drawTime);
    const resultNumber = imageToNumber[result] || 1;
    
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
    
    console.log(`✅ 12D Result generated at ${drawTime} IST: ${result} (${resultNumber})`);
    
    console.log(`12D Result generated: ${result} (${resultNumber}) at ${drawTime} IST, Session ${session}`);
    
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
  console.log('12D Result Scheduler started');
  
  // Run every 5 minutes at 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 minutes past the hour
  // Between 9 AM and 10 PM
  cron.schedule('*/5 9-21 * * *', async () => {
    console.log('12D: Generating result...');
    await generate12DResult();
  });
  
  // Also run at 10:00 PM (22:00) for the last draw
  cron.schedule('0 22 * * *', async () => {
    console.log('12D: Generating final result of the day...');
    await generate12DResult();
  });
  
  console.log('12D: Scheduler configured for every 5 minutes (9 AM - 10 PM)');
}

module.exports = { start12DScheduler, generate12DResult };
