const cron = require('node-cron');
const LotteryResult100D = require('../models/LotteryResult100D');
const { checkWinningTickets } = require('../routes/lottery100d');
const { getISTDate, formatISTTime, getISTHours, getISTMinutes } = require('../utils/timezone');
const { generateSmart100DResult } = require('../utils/smartResultGenerator');

// Generate random number in range
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate 100 results (10 from each range: 0xxx, 1xxx, 2xxx, 3xxx, 4xxx, 5xxx, 6xxx, 7xxx, 8xxx, 9xxx)
// Each range has 10 groups of 100 numbers (e.g., 0-99, 100-199, 200-299, etc.)
async function generateResults() {
    try {
        const now = getISTDate();
        const hours = getISTHours();
        const minutes = getISTMinutes();
        
        // Only generate between 9 AM and 10:00 PM (inclusive)
        if (hours < 9 || (hours >= 22 && minutes > 0)) {
            console.log('Outside operating hours (IST)');
            return;
        }
        
        const drawDate = new Date(now);
        drawDate.setSeconds(0);
        drawDate.setMilliseconds(0);
        
        const drawTime = formatISTTime(now);
        
        console.log(`Generating 100D results for ${drawTime} IST`);
        
        // 10 ranges, each with 10 groups of 100 numbers
        const ranges = [
            { start: 0, end: 999, name: '0' },
            { start: 1000, end: 1999, name: '1000' },
            { start: 2000, end: 2999, name: '2000' },
            { start: 3000, end: 3999, name: '3000' },
            { start: 4000, end: 4999, name: '4000' },
            { start: 5000, end: 5999, name: '5000' },
            { start: 6000, end: 6999, name: '6000' },
            { start: 7000, end: 7999, name: '7000' },
            { start: 8000, end: 8999, name: '8000' },
            { start: 9000, end: 9999, name: '9000' }
        ];
        
        const results = [];
        let blockNumber = 1;
        
        // Generate 10 results from each range (one from each 100-number group)
        for (const range of ranges) {
            // Each range has 10 groups of 100 numbers
            // For 0-999: groups are 0-99, 100-199, 200-299, ..., 900-999
            // For 1000-1999: groups are 1000-1099, 1100-1199, ..., 1900-1999
            for (let group = 0; group < 10; group++) {
                const groupStart = range.start + (group * 100);
                const groupEnd = groupStart + 99;
                
                // Generate smart result based on bets and winning percentage
                const winningNumber = await generateSmart100DResult(drawDate, drawTime, groupStart);
                
                const result = new LotteryResult100D({
                    drawDate,
                    drawTime,
                    winningNumber,
                    range: range.name,
                    blockNumber,
                    gameType: '100D'
                });
                
                await result.save();
                results.push(result);
                blockNumber++;
                
                // Check winning tickets for this number
                await checkWinningTickets(drawDate, drawTime, winningNumber);
            }
        }
        
        console.log(`Generated ${results.length} 100D results for ${drawTime} IST`);
        
        // Emit socket event for real-time update
        if (global.io) {
            global.io.emit('100d-results-updated', {
                drawTime,
                drawDate,
                results: results.map(r => ({
                    winningNumber: r.winningNumber,
                    range: r.range,
                    blockNumber: r.blockNumber
                }))
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('Error generating 100D results:', error);
    }
}

// Schedule to run every 15 minutes
function start100DScheduler() {
    console.log('🚀 100D Result Scheduler initializing...');
    
    // Run every 15 minutes: 00, 15, 30, 45
    cron.schedule('0,15,30,45 9-21 * * *', async () => {
        console.log('⏰ 100D Scheduled trigger activated at', new Date().toISOString());
        await generateResults();
    });
    
    // Also run at 10:00 PM (22:00) for the last draw
    cron.schedule('0 22 * * *', async () => {
        console.log('⏰ 100D Final draw trigger activated at', new Date().toISOString());
        await generateResults();
    });
    
    console.log('✅ 100D scheduler started - will run every 15 minutes from 9 AM to 10:00 PM');
    console.log('📅 Current IST time:', formatISTTime(getISTDate()));
    console.log('🕐 Current IST hour:', getISTHours());
}

module.exports = { start100DScheduler, generateResults };
