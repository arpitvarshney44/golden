const cron = require('node-cron');
const LotteryResult = require('../models/LotteryResult');
const { getISTDate, formatISTTime, getISTHours } = require('../utils/timezone');

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

// Generate results for all three ranges (30 results total)
async function generateResults() {
  try {
    const now = getISTDate();
    const hours = getISTHours();
    
    // Only generate results between 9 AM and 10 PM
    if (hours < 9 || hours >= 22) {
      console.log('Outside operating hours (9 AM - 10 PM IST)');
      return;
    }

    const timeString = formatISTTime(now);

    // Generate results for all three major ranges
    const allResults = [];
    const ranges = [1000, 3000, 5000];
    
    for (let rangeStart of ranges) {
      const rangeResults = generateResultsForRange(rangeStart);
      
      // Save each result to database
      for (let item of rangeResults) {
        const result = new LotteryResult({
          type: '100D',
          result: item.result.toString(),
          range: rangeStart.toString(),
          block: item.block.toString(),
          date: now,
          time: timeString
        });
        await result.save();
        allResults.push(result);
      }
    }

    console.log(`✅ ${allResults.length} results generated at ${timeString} IST`);
    console.log(`Range 1000s: ${allResults.slice(0, 10).map(r => r.result).join(', ')}`);
    console.log(`Range 3000s: ${allResults.slice(10, 20).map(r => r.result).join(', ')}`);
    console.log(`Range 5000s: ${allResults.slice(20, 30).map(r => r.result).join(', ')}`);
    
    // Broadcast to connected clients (if using WebSocket)
    if (global.io) {
      global.io.emit('newResult', {
        results: allResults,
        timestamp: now,
        time: timeString
      });
    }

    return allResults;
  } catch (error) {
    console.error('Error generating results:', error);
  }
}

// Schedule results every 15 minutes
function startScheduler() {
  // Run every 15 minutes: at :00, :15, :30, :45
  cron.schedule('0,15,30,45 * * * *', async () => {
    console.log('Running scheduled result generation...');
    await generateResults();
  });

  console.log('Result scheduler started - Running every 15 minutes');
}

// Manual trigger for testing
async function triggerManualResult() {
  console.log('Manual result generation triggered');
  return await generateResults();
}

module.exports = {
  startScheduler,
  triggerManualResult,
  generateResults
};
