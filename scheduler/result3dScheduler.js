const cron = require('node-cron');
const LotteryResult3D = require('../models/LotteryResult3D');
const { getISTDate, formatISTTime, getISTHours, getISTMinutes, getISTDateMidnight } = require('../utils/timezone');

// Generate random 3-digit number (000-999)
function generateRandom3DNumber() {
  const number = Math.floor(Math.random() * 1000);
  return number.toString().padStart(3, '0');
}

// Calculate session number based on time
function calculateSession(hours, minutes) {
  // Starting from 9:00 AM, every 15 minutes is a new session
  const totalMinutes = (hours - 9) * 60 + minutes;
  return Math.floor(totalMinutes / 15) + 1;
}

// Generate 3D result
async function generate3DResult() {
  try {
    const now = getISTDate();
    const hours = getISTHours();
    const minutes = getISTMinutes();
    
    // Only generate between 9 AM and 10:00 PM (inclusive)
    if (hours < 9 || (hours >= 22 && minutes > 0)) {
      console.log('3D: Outside operating hours (9 AM - 10:00 PM IST)');
      return;
    }
    
    // Format draw time
    const drawTime = formatISTTime(now);
    
    // Set draw date to today at midnight
    const drawDate = getISTDateMidnight();
    
    // Check if result already exists
    const existingResult = await LotteryResult3D.findOne({
      drawDate: drawDate,
      drawTime: drawTime
    });
    
    if (existingResult) {
      console.log('3D: Result already exists for', drawTime, 'IST');
      return;
    }
    
    // Generate random 3-digit results for A, B, C
    const resultA = generateRandom3DNumber();
    const resultB = generateRandom3DNumber();
    const resultC = generateRandom3DNumber();
    
    // Calculate session
    const session = calculateSession(hours, minutes);
    
    // Create new result
    const newResult = new LotteryResult3D({
      drawDate: drawDate,
      drawTime: drawTime,
      resultA: resultA,
      resultB: resultB,
      resultC: resultC,
      session: session
    });
    
    await newResult.save();
    
    console.log(`3D Results generated: A=${resultA}, B=${resultB}, C=${resultC} at ${drawTime} IST, Session ${session}`);
    
    // Check winning tickets for all three results
    const { checkWinningTickets } = require('../routes/lottery3d');
    await checkWinningTickets(drawDate, drawTime, resultA, resultB, resultC);
    
    // Emit socket event for real-time update
    if (global.io) {
      global.io.emit('new3DResult', {
        drawDate: drawDate,
        drawTime: drawTime,
        resultA: resultA,
        resultB: resultB,
        resultC: resultC,
        session: session
      });
    }
    
    return newResult;
    
  } catch (error) {
    console.error('Error generating 3D result:', error);
  }
}

// Start 3D scheduler
function start3DScheduler() {
  console.log('3D Result Scheduler started');
  
  // Run every 15 minutes at 0, 15, 30, 45 minutes past the hour
  // Between 9 AM and 10 PM
  cron.schedule('0,15,30,45 9-21 * * *', async () => {
    console.log('3D: Generating result...');
    await generate3DResult();
  });
  
  // Also run at 10:00 PM (22:00) for the last draw
  cron.schedule('0 22 * * *', async () => {
    console.log('3D: Generating final result of the day...');
    await generate3DResult();
  });
  
  console.log('3D: Scheduler configured for every 15 minutes (9 AM - 10:00 PM)');
}

module.exports = { start3DScheduler, generate3DResult };
