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
// Returns: { wins: boolean, multiplier: number } 
// multiplier is how many times the bet wins (for any-pair with multiple matches)
function checkWin(playType, betNumber, resultNumber) {
  const bet = betNumber.split('');
  const result = resultNumber.split('');
  
  switch (playType) {
    case 'straight':
      // Exact match
      return { wins: betNumber === resultNumber, multiplier: 1 };
      
    case 'box-3-way':
      // Two same digits + one different, any order
      // e.g., bet 112 wins with 112, 121, 211
      const betSorted = bet.slice().sort().join('');
      const resultSorted = result.slice().sort().join('');
      return { wins: betSorted === resultSorted, multiplier: 1 };
      
    case 'box-6-way':
      // Three different digits, any order
      // e.g., bet 123 wins with 123, 132, 213, 231, 312, 321
      const betSorted6 = bet.slice().sort().join('');
      const resultSorted6 = result.slice().sort().join('');
      return { wins: betSorted6 === resultSorted6, multiplier: 1 };
      
    case 'front-pair':
      // First two digits match (e.g., 12X matches 12Y)
      const frontMatch = bet[0] === result[0] && bet[1] === result[1];
      return { wins: frontMatch, multiplier: 1 };
      
    case 'back-pair':
      // Last two digits match (e.g., X23 matches Y23)
      const backMatch = bet[1] === result[1] && bet[2] === result[2];
      return { wins: backMatch, multiplier: 1 };
      
    case 'split-pair':
      // First and last digits match (e.g., 1X3 matches 1Y3)
      const splitMatch = bet[0] === result[0] && bet[2] === result[2];
      return { wins: splitMatch, multiplier: 1 };
      
    case 'any-pair':
      // Any two digits match in any position
      // Count how many pair positions match
      const betDigits = bet.filter(d => d !== 'X');
      if (betDigits.length !== 2) return { wins: false, multiplier: 0 };
      
      // Check if both bet digits appear in result
      const bothPresent = betDigits.every(digit => result.includes(digit));
      if (!bothPresent) return { wins: false, multiplier: 0 };
      
      // Count matching pairs in different positions
      let matchCount = 0;
      const [digit1, digit2] = betDigits;
      
      // Check front pair (positions 0-1)
      if ((result[0] === digit1 && result[1] === digit2) || 
          (result[0] === digit2 && result[1] === digit1)) {
        matchCount++;
      }
      
      // Check back pair (positions 1-2)
      if ((result[1] === digit1 && result[2] === digit2) || 
          (result[1] === digit2 && result[2] === digit1)) {
        matchCount++;
      }
      
      // Check split pair (positions 0-2)
      if ((result[0] === digit1 && result[2] === digit2) || 
          (result[0] === digit2 && result[2] === digit1)) {
        matchCount++;
      }
      
      return { wins: matchCount > 0, multiplier: matchCount };
      
    default:
      return { wins: false, multiplier: 0 };
  }
}

// Check winning tickets after result is generated
async function checkWinningTickets(drawDate, drawTime, resultA, resultB, resultC) {
  try {
    const tickets = await Ticket3D.find({
      drawDate: drawDate,
      drawTime: drawTime,
      status: 'active',
      winStatus: 'pending'
    });
    
    for (const ticket of tickets) {
      let totalWinAmount = 0;
      let hasWon = false;
      
      const numOptions = ticket.selectedOptions.length;
      const numBets = ticket.bets.length;
      
      // If user selected multiple options, each bet should be checked against ONE specific option
      // Distribute bets evenly across selected options
      for (let i = 0; i < ticket.bets.length; i++) {
        const bet = ticket.bets[i];
        
        // Determine which option this bet corresponds to
        let targetOption;
        let targetResult;
        
        if (numOptions === 1) {
          // Only one option selected, use that
          targetOption = ticket.selectedOptions[0];
        } else {
          // Multiple options: distribute bets across options
          // Bet index 0 → first option, Bet index 1 → second option, etc.
          const optionIndex = i % numOptions;
          targetOption = ticket.selectedOptions[optionIndex];
        }
        
        // Get the corresponding result
        if (targetOption === 'A') {
          targetResult = resultA;
        } else if (targetOption === 'B') {
          targetResult = resultB;
        } else if (targetOption === 'C') {
          targetResult = resultC;
        }
        
        // Check if this bet wins against its target result
        const winCheck = checkWin(bet.playType, bet.number, targetResult);
        
        if (winCheck.wins) {
          hasWon = true;
          const multiplier = PAYOUT_MULTIPLIERS[bet.playType];
          // Multiply by winCheck.multiplier for any-pair multiple matches
          const winAmount = multiplier * bet.quantity * bet.pointsPerBet * winCheck.multiplier;
          totalWinAmount += winAmount;
        }
      }
      
      // Update ticket status
      if (hasWon) {
        ticket.winStatus = 'won';
        ticket.status = 'won';
        ticket.winAmount = totalWinAmount;
      } else {
        ticket.winStatus = 'loss';
        ticket.status = 'lost';
      }
      
      await ticket.save();
    }
    
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
