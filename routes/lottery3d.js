const express = require('express');
const router = express.Router();
const LotteryResult3D = require('../models/LotteryResult3D');
const Ticket3D = require('../models/Ticket3D');
const User = require('../models/User');

// Payout multipliers for each play type (per 10 points bet)
const PAYOUT_MULTIPLIERS = {
  'straight': 900,        // 900 x 10 = 9000
  'box-3-way': 300,       // 300 x 10 = 3000
  'box-6-way': 150,       // 150 x 10 = 1500
  'front-pair': 90,       // 90 x 10 = 900
  'back-pair': 90,        // 90 x 10 = 900
  'split-pair': 90,       // 90 x 10 = 900
  'any-pair': 30          // 30 x 10 = 300
};

// Check if a bet wins based on play type
function checkWin(playType, betNumber, resultNumber) {
  const bet = betNumber.split('');
  const result = resultNumber.split('');
  
  switch (playType) {
    case 'straight':
      // Exact match
      return betNumber === resultNumber;
      
    case 'box-3-way':
      // Two same digits + one different, any order
      // e.g., bet 112 wins with 112, 121, 211
      const betSorted = bet.slice().sort().join('');
      const resultSorted = result.slice().sort().join('');
      return betSorted === resultSorted;
      
    case 'box-6-way':
      // Three different digits, any order
      // e.g., bet 123 wins with 123, 132, 213, 231, 312, 321
      const betSorted6 = bet.slice().sort().join('');
      const resultSorted6 = result.slice().sort().join('');
      return betSorted6 === resultSorted6;
      
    case 'front-pair':
      // First two digits match (e.g., 12X matches 12Y)
      return bet[0] === result[0] && bet[1] === result[1];
      
    case 'back-pair':
      // Last two digits match (e.g., X23 matches Y23)
      return bet[1] === result[1] && bet[2] === result[2];
      
    case 'split-pair':
      // First and last digits match (e.g., 1X3 matches 1Y3)
      return bet[0] === result[0] && bet[2] === result[2];
      
    case 'any-pair':
      // Any two digits match in any position
      // e.g., X23 matches Y23, 2Y3, or 23Y
      const betDigits = bet.filter(d => d !== 'X');
      if (betDigits.length !== 2) return false;
      
      // Check if both bet digits appear in result
      return betDigits.every(digit => result.includes(digit));
      
    default:
      return false;
  }
}

// Check winning tickets after result is generated
async function checkWinningTickets(drawDate, drawTime, resultA, resultB, resultC) {
  try {
    console.log(`Checking 3D winning tickets for ${drawTime}, results: A=${resultA}, B=${resultB}, C=${resultC}`);
    
    const tickets = await Ticket3D.find({
      drawDate: drawDate,
      drawTime: drawTime,
      status: 'active',
      winStatus: 'pending'
    });
    
    console.log(`Found ${tickets.length} tickets to check`);
    
    for (const ticket of tickets) {
      let totalWinAmount = 0;
      let hasWon = false;
      
      // Check each bet on the ticket against selected options only
      for (const bet of ticket.bets) {
        // Check against result A if selected
        if (ticket.selectedOptions.includes('A') && checkWin(bet.playType, bet.number, resultA)) {
          hasWon = true;
          const multiplier = PAYOUT_MULTIPLIERS[bet.playType];
          const winAmount = multiplier * bet.quantity * bet.pointsPerBet;
          totalWinAmount += winAmount;
          console.log(`Winning bet (A): ${bet.playType} ${bet.number} x${bet.quantity} = ${winAmount} points`);
        }
        
        // Check against result B if selected
        if (ticket.selectedOptions.includes('B') && checkWin(bet.playType, bet.number, resultB)) {
          hasWon = true;
          const multiplier = PAYOUT_MULTIPLIERS[bet.playType];
          const winAmount = multiplier * bet.quantity * bet.pointsPerBet;
          totalWinAmount += winAmount;
          console.log(`Winning bet (B): ${bet.playType} ${bet.number} x${bet.quantity} = ${winAmount} points`);
        }
        
        // Check against result C if selected
        if (ticket.selectedOptions.includes('C') && checkWin(bet.playType, bet.number, resultC)) {
          hasWon = true;
          const multiplier = PAYOUT_MULTIPLIERS[bet.playType];
          const winAmount = multiplier * bet.quantity * bet.pointsPerBet;
          totalWinAmount += winAmount;
          console.log(`Winning bet (C): ${bet.playType} ${bet.number} x${bet.quantity} = ${winAmount} points`);
        }
      }
      
      // Update ticket status
      if (hasWon) {
        ticket.winStatus = 'won';
        ticket.status = 'won';
        ticket.winAmount = totalWinAmount;
        
        console.log(`Ticket ${ticket.serialId} won ${totalWinAmount} points!`);
      } else {
        ticket.winStatus = 'loss';
        ticket.status = 'lost';
      }
      
      await ticket.save();
    }
    
    console.log('3D winning tickets check completed');
    
  } catch (error) {
    console.error('Error checking 3D winning tickets:', error);
  }
}

// Get latest results
router.get('/results/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const results = await LotteryResult3D.find()
      .sort({ drawDate: -1, session: -1, createdAt: -1 })
      .limit(limit);
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get results by date
router.get('/results/date/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // No limit - get all results for the entire day
    const results = await LotteryResult3D.find({
      drawDate: {
        $gte: date,
        $lt: nextDay
      }
    }).sort({ createdAt: -1 });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get result by date and time
router.get('/results/:date/:time', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    
    const result = await LotteryResult3D.findOne({
      drawDate: date,
      drawTime: req.params.time
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manual result generation (for testing)
router.post('/results/generate', async (req, res) => {
  try {
    const { generate3DResult } = require('../scheduler/result3dScheduler');
    const result = await generate3DResult();
    
    if (!result) {
      return res.status(400).json({ message: 'Could not generate result' });
    }
    
    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
module.exports.checkWinningTickets = checkWinningTickets;
