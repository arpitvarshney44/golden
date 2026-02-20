const express = require('express');
const router = express.Router();
const LotteryResult12D = require('../models/LotteryResult12D');

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

// Generate random result (1-12)
function generateRandomResult() {
  const resultNumber = Math.floor(Math.random() * 12) + 1;
  return {
    resultNumber,
    result: resultMapping[resultNumber]
  };
}

// Generate 12D result for a specific time slot
router.post('/generate-result', async (req, res) => {
  try {
    const { drawDate, drawTime, session } = req.body;
    
    // Check if result already exists for this time
    const existingResult = await LotteryResult12D.findOne({ 
      drawDate: new Date(drawDate), 
      drawTime 
    });
    
    if (existingResult) {
      return res.json({
        success: true,
        message: 'Result already exists',
        result: existingResult
      });
    }
    
    // Generate random result
    const { resultNumber, result } = generateRandomResult();
    
    // Create new result
    const newResult = new LotteryResult12D({
      drawDate: new Date(drawDate),
      drawTime,
      result,
      resultNumber,
      session: session || 1
    });
    
    await newResult.save();
    
    // Emit socket event for real-time update
    if (global.io) {
      global.io.emit('new12DResult', newResult);
    }
    
    res.json({
      success: true,
      message: 'Result generated successfully',
      result: newResult
    });
    
  } catch (error) {
    console.error('Error generating 12D result:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get latest 12D result
router.get('/latest', async (req, res) => {
  try {
    const latestResult = await LotteryResult12D.findOne()
      .sort({ createdAt: -1 });
    
    if (!latestResult) {
      return res.json({ 
        success: false, 
        message: 'No results found' 
      });
    }
    
    res.json({
      success: true,
      result: latestResult
    });
    
  } catch (error) {
    console.error('Error fetching latest 12D result:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get 12D results history
router.get('/history', async (req, res) => {
  try {
    const { date } = req.query;
    
    let query = {};
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.drawDate = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // No limit - get all results for the day
    const results = await LotteryResult12D.find(query)
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      results: results
    });
    
  } catch (error) {
    console.error('Error fetching 12D history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get today's 12D results
router.get('/today', async (req, res) => {
  try {
    const { getISTDateMidnight } = require('../utils/timezone');
    const today = getISTDateMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const results = await LotteryResult12D.find({
      drawDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      results: results
    });
    
  } catch (error) {
    console.error('Error fetching today\'s 12D results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Check winning tickets for 12D (called after result generation)
async function checkWinningTickets(drawDate, drawTime, winningImage) {
    try {
        const Ticket12D = require('../models/Ticket12D');
        
        // Create date range for the draw date (entire day)
        const startOfDay = new Date(drawDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(drawDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        console.log(`[12D] Checking tickets for drawTime: ${drawTime}, date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
        
        // Find all active 12D tickets for this draw
        const tickets = await Ticket12D.find({
            drawDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            drawTime: drawTime,
            status: 'active',
            winStatus: 'pending'
        });
        
        console.log(`[12D] Found ${tickets.length} tickets to check for ${drawTime} on ${drawDate.toDateString()}`);
        
        for (const ticket of tickets) {
            let won = false;
            let winAmount = 0;
            
            // Check if any of the ticket selections match the winning image
            for (const selection of ticket.selections) {
                if (selection.image === winningImage) {
                    won = true;
                    // 100 points per quantity (10 points bet = 100 points win)
                    winAmount += selection.quantity * 100;
                }
            }
            
            // Update ticket status
            if (won) {
                ticket.winStatus = 'won';
                ticket.status = 'won';
                ticket.winAmount = winAmount;
                console.log(`[12D] Ticket ${ticket.serialId} WON! Amount: ${winAmount}`);
            } else {
                ticket.winStatus = 'loss';
                ticket.status = 'lost';
            }
            
            await ticket.save();
        }
        
        console.log(`[12D] Checked ${tickets.length} tickets for draw ${drawTime}, winning image: ${winningImage}`);
        
    } catch (error) {
        console.error('Error checking 12D winning tickets:', error);
    }
}

module.exports = router;
module.exports.checkWinningTickets = checkWinningTickets;
