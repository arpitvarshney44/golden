const cron = require('node-cron');
const LotteryResult = require('../models/LotteryResult');
const { getISTDate, formatISTTime, getISTHours, getISTMinutes } = require('../utils/timezone');
const { generateSmart2DResult } = require('../utils/smartResultGenerator');

// Generate random result for a specific 100-number block
// e.g., block 1000 generates number between 1000-1099
function generateRandomResultForBlock(blockStart) {
  const min = blockStart;
  const max = blockStart + 99;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate 10 results for each major range (1000s, 3000s, 5000s)
// Each result represents one 100-number block
function generateResultsForRange(rangeStart) {
  const results = [];
  // Generate 10 results: rangeStart+0, rangeStart+100, rangeStart+200, ..., rangeStart+900
  for (let i = 0; i < 10; i++) {
    const blockStart = rangeStart + (i * 100);
    const result = generateRandomResultForBlock(blockStart);
    results.push({
      block: blockStart,
      result: result
    });
  }
  return results;
}

// Generate 2D results (smart generation based on bets)
async function generateResults() {
  try {
    const now = getISTDate();
    const hours = getISTHours();
    const minutes = getISTMinutes();
    
    // Only generate results between 9 AM and 10:00 PM (inclusive)
    if (hours < 9 || (hours >= 22 && minutes > 0)) {
      return;
    }

    const timeString = formatISTTime(now);

    // Check for manual result first
    const { getManualResult } = require('../routes/admin');
    const manualResult = await getManualResult('2D', now, timeString);
    
    let smartResult;
    if (manualResult) {
      // Manual result for 2D is an array of 30 numbers
      // We'll use the first non-null number as the main 2D result
      if (Array.isArray(manualResult)) {
        // Find first non-null value
        const firstValue = manualResult.find(val => val !== null && val !== undefined);
        if (firstValue !== undefined) {
          smartResult = firstValue.toString().padStart(2, '0').slice(-2);
        } else {
          // All values are null, generate smart result
          smartResult = await generateSmart2DResult(now, timeString);
        }
      } else {
        smartResult = manualResult;
      }
    } else {
      // Generate smart 2D result based on bets and winning percentage
      smartResult = await generateSmart2DResult(now, timeString);
    }

    // Generate results for all three major ranges
    const allResults = [];
    const ranges = [1000, 3000, 5000];
    
    // Check if we have manual results array for the 30 numbers
    let manualArray = null;
    if (manualResult && Array.isArray(manualResult) && manualResult.length === 30) {
      manualArray = manualResult;
    }
    
    let arrayIndex = 0;
    for (let rangeStart of ranges) {
      const rangeResults = generateResultsForRange(rangeStart);
      
      // Save each result to database
      for (let item of rangeResults) {
        let finalResult;
        
        // Check if we have a manual value for this position
        if (manualArray && arrayIndex < 30) {
          const manualValue = manualArray[arrayIndex];
          if (manualValue !== null && manualValue !== undefined) {
            finalResult = manualValue;
          } else {
            // Use the randomly generated result if manual value is null
            finalResult = item.result;
          }
          arrayIndex++;
        } else {
          finalResult = item.result;
        }
        
        const result = new LotteryResult({
          type: '100D',
          result: finalResult.toString(),
          range: rangeStart.toString(),
          block: item.block.toString(),
          date: now,
          time: timeString
        });
        await result.save();
        allResults.push(result);
      }
    }

    // Save the main 2D result
    const main2DResult = new LotteryResult({
      type: '2D',
      result: smartResult,
      date: now,
      time: timeString
    });
    await main2DResult.save();
    
    // Check winning tickets for 2D result
    const { checkWinningTickets } = require('../routes/lottery');
    await checkWinningTickets(now, timeString, smartResult);
    
    // Check winning tickets for other results
    for (let result of allResults) {
      await checkWinningTickets(now, timeString, result.result);
    }
    
    // Broadcast to connected clients (if using WebSocket)
    if (global.io) {
      global.io.emit('new2DResult', {
        result: smartResult,
        timestamp: now,
        time: timeString
      });
      
      global.io.emit('newResult', {
        results: allResults,
        timestamp: now,
        time: timeString
      });
    }

    return { main2DResult, allResults };
  } catch (error) {
    console.error('Error generating 2D results:', error);
  }
}

// Schedule results every 15 minutes
function startScheduler() {
  // Run every 15 minutes: at :00, :15, :30, :45
  cron.schedule('0,15,30,45 9-21 * * *', async () => {
    await generateResults();
  });
  
  // Also run at 10:00 PM (22:00) for the last draw
  cron.schedule('0 22 * * *', async () => {
    await generateResults();
  });
}

// Manual trigger for testing
async function triggerManualResult() {
  return await generateResults();
}

module.exports = {
  startScheduler,
  triggerManualResult,
  generateResults
};
