const express = require('express');
const router = express.Router();
const LotteryResult = require('../models/LotteryResult');

// Get results by type
router.get('/results/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { date } = req.query;
    
    let query = { type: type.toUpperCase() };
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // No limit - get all results for the entire day
    const results = await LotteryResult.find(query)
      .sort({ date: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get latest result
router.get('/latest/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const result = await LotteryResult.findOne({ type: type.toUpperCase() })
      .sort({ date: -1 });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get latest 100D results (all 30 results)
router.get('/latest-100d', async (req, res) => {
  try {
    // Get the latest timestamp
    const latestResult = await LotteryResult.findOne({ type: '100D' })
      .sort({ date: -1 });
    
    if (!latestResult) {
      return res.json({ results: [], grouped: {} });
    }

    // Get all 30 results from that timestamp
    const results = await LotteryResult.find({ 
      type: '100D',
      date: latestResult.date
    }).sort({ range: 1, block: 1 });

    // Group by range for easier frontend display
    const grouped = {
      '1000': results.filter(r => r.range === '1000'),
      '3000': results.filter(r => r.range === '3000'),
      '5000': results.filter(r => r.range === '5000')
    };

    res.json({
      results: results,
      grouped: grouped,
      timestamp: latestResult.date,
      time: latestResult.time
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get 100D results history (last 10 draws)
router.get('/history-100d', async (req, res) => {
  try {
    // Get all results, sorted by date descending
    const results = await LotteryResult.find({ type: '100D' })
      .sort({ date: -1 })
      .limit(300); // Get last 300 results (10 draws x 30 numbers each)

    // Group by timestamp
    const grouped = {};
    results.forEach(result => {
      const key = result.date.toISOString();
      if (!grouped[key]) {
        grouped[key] = {
          timestamp: result.date,
          time: result.time,
          results: []
        };
      }
      grouped[key].results.push({
        range: result.range,
        result: result.result,
        block: result.block
      });
    });

    // Return all grouped draws (sorted by timestamp descending)
    const allDraws = Object.values(grouped).sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    res.json(allDraws);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manual trigger for result generation (admin only)
router.post('/generate-result', async (req, res) => {
  try {
    const { triggerManualResult } = require('../scheduler/resultScheduler');
    const results = await triggerManualResult();
    res.json({ 
      success: true, 
      message: 'Results generated successfully',
      results: results 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check winning tickets for 2D (called after result generation)
async function checkWinningTickets(drawDate, drawTime, winningNumber) {
    try {
        const Ticket = require('../models/Ticket');
        
        // Create date range for the draw date (entire day)
        const startOfDay = new Date(drawDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(drawDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Find all active 2D tickets for this draw
        const tickets = await Ticket.find({
            drawDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            drawTime,
            status: 'active',
            winStatus: 'pending'
        });
        
        console.log(`Found ${tickets.length} 2D tickets to check for ${drawTime} on ${drawDate.toDateString()}`);
        
        for (const ticket of tickets) {
            let won = false;
            let winAmount = 0;
            
            // Check if any of the ticket numbers match the winning number
            for (const num of ticket.numbers) {
                if (num.number.toString() === winningNumber.toString()) {
                    won = true;
                    winAmount += num.quantity * 180; // 90x multiplier (2 points per quantity * 90)
                }
            }
            
            // Update ticket status
            if (won) {
                ticket.winStatus = 'won';
                ticket.status = 'won';
                ticket.winAmount = winAmount;
            } else {
                ticket.winStatus = 'loss';
                ticket.status = 'lost';
            }
            
            await ticket.save();
        }
        
        console.log(`Checked ${tickets.length} 2D tickets for draw ${drawTime}, winning number: ${winningNumber}`);
        
    } catch (error) {
        console.error('Error checking 2D winning tickets:', error);
    }
}

module.exports = router;
module.exports.checkWinningTickets = checkWinningTickets;
