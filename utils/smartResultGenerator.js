const GameSettings = require('../models/GameSettings');

/**
 * Smart Result Generator
 * Generates results based on winning percentage settings
 */

// Get game settings
async function getGameSettings(gameType) {
  let settings = await GameSettings.findOne({ gameType });
  
  if (!settings) {
    // Create default if not exists
    settings = new GameSettings({ 
      gameType, 
      winningPercentage: 70 
    });
    await settings.save();
  }
  
  return settings;
}

// Calculate bet distribution for 2D game
async function calculate2DBetDistribution(drawDate, drawTime) {
  const Ticket = require('../models/Ticket');
  
  const tickets = await Ticket.find({ 
    drawDate: drawDate, 
    drawTime: drawTime,
    status: 'active'
  });
  
  const distribution = {};
  let totalPoints = 0;
  
  tickets.forEach(ticket => {
    totalPoints += ticket.totalPoints;
    ticket.numbers.forEach(num => {
      if (!distribution[num.number]) {
        distribution[num.number] = { 
          bets: 0, 
          points: 0, 
          potentialPayout: 0 
        };
      }
      distribution[num.number].bets += num.quantity;
      distribution[num.number].points += num.quantity * 2;
      distribution[num.number].potentialPayout += num.quantity * 180; // 90x multiplier
    });
  });
  
  return { distribution, totalPoints };
}

// Calculate bet distribution for 12D game
async function calculate12DBetDistribution(drawDate, drawTime) {
  const Ticket12D = require('../models/Ticket12D');
  
  const tickets = await Ticket12D.find({ 
    drawDate: drawDate, 
    drawTime: drawTime,
    status: 'active'
  });
  
  const distribution = {};
  let totalPoints = 0;
  
  tickets.forEach(ticket => {
    totalPoints += ticket.totalPoints;
    ticket.selections.forEach(sel => {
      if (!distribution[sel.image]) {
        distribution[sel.image] = { 
          bets: 0, 
          points: 0, 
          potentialPayout: 0 
        };
      }
      distribution[sel.image].bets += sel.quantity;
      distribution[sel.image].points += sel.quantity * 10;
      distribution[sel.image].potentialPayout += sel.quantity * 100; // 10x multiplier
    });
  });
  
  return { distribution, totalPoints };
}

// Calculate bet distribution for 100D game
async function calculate100DBetDistribution(drawDate, drawTime) {
  const Ticket100D = require('../models/Ticket100D');
  
  const tickets = await Ticket100D.find({ 
    drawDate: drawDate, 
    drawTime: drawTime,
    status: 'active'
  });
  
  const distribution = {};
  let totalPoints = 0;
  
  tickets.forEach(ticket => {
    totalPoints += ticket.totalPoints;
    ticket.numbers.forEach(num => {
      if (!distribution[num.number]) {
        distribution[num.number] = { 
          bets: 0, 
          points: 0, 
          potentialPayout: 0 
        };
      }
      distribution[num.number].bets += num.quantity;
      distribution[num.number].points += num.quantity * 2;
      distribution[num.number].potentialPayout += num.quantity * 180; // 90x multiplier
    });
  });
  
  return { distribution, totalPoints };
}

// Generate smart result for 2D game
async function generateSmart2DResult(drawDate, drawTime) {
  try {
    const settings = await getGameSettings('2D');
    const { distribution, totalPoints } = await calculate2DBetDistribution(drawDate, drawTime);
    
    if (totalPoints === 0) {
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      return random;
    }
    
    const maxAllowedPayout = totalPoints * (settings.winningPercentage / 100);
    
    // Get all possible numbers (00-99)
    const allNumbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
    
    // Sort numbers by potential payout (lowest first - best for house)
    const sortedNumbers = allNumbers.map(num => ({
      number: num,
      payout: distribution[num]?.potentialPayout || 0,
      bets: distribution[num]?.bets || 0
    })).sort((a, b) => a.payout - b.payout);
    
    // Find numbers within allowed payout range
    const validNumbers = sortedNumbers.filter(n => n.payout <= maxAllowedPayout);
    
    if (validNumbers.length > 0) {
      // Prefer numbers with lower payouts (better for house)
      // But add some randomness to avoid patterns
      const topCandidates = validNumbers.slice(0, Math.max(10, Math.floor(validNumbers.length * 0.3)));
      const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      return selected.number;
    }
    
    // If no valid numbers (all exceed limit), pick the one with lowest payout
    const selected = sortedNumbers[0];
    return selected.number;
    
  } catch (error) {
    console.error('Error generating smart 2D result:', error);
    // Fallback to random
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return random;
  }
}

// Generate smart result for 12D game
async function generateSmart12DResult(drawDate, drawTime) {
  try {
    const settings = await getGameSettings('12D');
    const { distribution, totalPoints } = await calculate12DBetDistribution(drawDate, drawTime);
    
    if (totalPoints === 0) {
      const images = ['umbrella', 'book', 'basket', 'butterfly', 'bucket', 'football', 'goat', 'spinning-top', 'rose', 'sun', 'bird', 'rabbit'];
      const random = images[Math.floor(Math.random() * images.length)];
      return random;
    }
    
    const maxAllowedPayout = totalPoints * (settings.winningPercentage / 100);
    
    // All possible images (matching the model enum)
    const allImages = ['umbrella', 'book', 'basket', 'butterfly', 'bucket', 'football', 'goat', 'spinning-top', 'rose', 'sun', 'bird', 'rabbit'];
    
    // Sort images by potential payout (lowest first)
    const sortedImages = allImages.map(img => ({
      image: img,
      payout: distribution[img]?.potentialPayout || 0,
      bets: distribution[img]?.bets || 0
    })).sort((a, b) => a.payout - b.payout);
    
    // Find images within allowed payout range
    const validImages = sortedImages.filter(i => i.payout <= maxAllowedPayout);
    
    if (validImages.length > 0) {
      // Prefer images with lower payouts
      const topCandidates = validImages.slice(0, Math.max(3, Math.floor(validImages.length * 0.4)));
      const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      return selected.image;
    }
    
    // If no valid images, pick the one with lowest payout
    const selected = sortedImages[0];
    return selected.image;
    
  } catch (error) {
    console.error('Error generating smart 12D result:', error);
    // Fallback to random
    const images = ['umbrella', 'book', 'basket', 'butterfly', 'bucket', 'football', 'goat', 'spinning-top', 'rose', 'sun', 'bird', 'rabbit'];
    const random = images[Math.floor(Math.random() * images.length)];
    return random;
  }
}

// Generate smart result for 100D game
async function generateSmart100DResult(drawDate, drawTime, blockStart) {
  try {
    const settings = await getGameSettings('100D');
    const { distribution, totalPoints } = await calculate100DBetDistribution(drawDate, drawTime);
    
    if (totalPoints === 0) {
      const min = blockStart;
      const max = blockStart + 99;
      const random = Math.floor(Math.random() * (max - min + 1)) + min;
      return random;
    }
    
    const maxAllowedPayout = totalPoints * (settings.winningPercentage / 100);
    
    // All possible numbers in this block
    const allNumbers = Array.from({ length: 100 }, (_, i) => (blockStart + i).toString());
    
    // Sort numbers by potential payout (lowest first)
    const sortedNumbers = allNumbers.map(num => ({
      number: num,
      payout: distribution[num]?.potentialPayout || 0,
      bets: distribution[num]?.bets || 0
    })).sort((a, b) => a.payout - b.payout);
    
    // Find numbers within allowed payout range
    const validNumbers = sortedNumbers.filter(n => n.payout <= maxAllowedPayout);
    
    if (validNumbers.length > 0) {
      // Prefer numbers with lower payouts
      const topCandidates = validNumbers.slice(0, Math.max(10, Math.floor(validNumbers.length * 0.3)));
      const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      return parseInt(selected.number);
    }
    
    // If no valid numbers, pick the one with lowest payout
    const selected = sortedNumbers[0];
    return parseInt(selected.number);
    
  } catch (error) {
    console.error('Error generating smart 100D result:', error);
    // Fallback to random
    const min = blockStart;
    const max = blockStart + 99;
    const random = Math.floor(Math.random() * (max - min + 1)) + min;
    return random;
  }
}

module.exports = {
  generateSmart2DResult,
  generateSmart12DResult,
  generateSmart100DResult,
  getGameSettings
};


// Calculate bet distribution for 3D game
async function calculate3DBetDistribution(drawDate, drawTime) {
  const Ticket3D = require('../models/Ticket3D');
  
  const tickets = await Ticket3D.find({ 
    drawDate: drawDate, 
    drawTime: drawTime,
    status: 'active'
  });
  
  const distributionA = {};
  const distributionB = {};
  const distributionC = {};
  let totalPoints = 0;
  
  // Payout multipliers for 3D game
  const PAYOUT_MULTIPLIERS = {
    'straight': 900,
    'box-3-way': 300,
    'box-6-way': 150,
    'front-pair': 90,
    'back-pair': 90,
    'split-pair': 90,
    'any-pair': 30
  };
  
  tickets.forEach(ticket => {
    totalPoints += ticket.totalPoints;
    
    ticket.bets.forEach(bet => {
      const multiplier = PAYOUT_MULTIPLIERS[bet.playType] || 0;
      const potentialPayout = multiplier * bet.quantity * bet.pointsPerBet;
      
      // Track bets for each option (A, B, C)
      ticket.selectedOptions.forEach(option => {
        let distribution = option === 'A' ? distributionA : option === 'B' ? distributionB : distributionC;
        
        if (!distribution[bet.number]) {
          distribution[bet.number] = { 
            bets: 0, 
            points: 0, 
            potentialPayout: 0 
          };
        }
        
        distribution[bet.number].bets += bet.quantity;
        distribution[bet.number].points += bet.quantity * bet.pointsPerBet;
        distribution[bet.number].potentialPayout += potentialPayout;
      });
    });
  });
  
  return { distributionA, distributionB, distributionC, totalPoints };
}

// Generate smart result for 3D game (for one option A/B/C)
async function generateSmart3DResult(drawDate, drawTime) {
  try {
    const settings = await getGameSettings('3D');
    const { distributionA, distributionB, distributionC, totalPoints } = await calculate3DBetDistribution(drawDate, drawTime);
    
    if (totalPoints === 0) {
      const resultA = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const resultB = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const resultC = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return { resultA, resultB, resultC };
    }
    
    const maxAllowedPayout = totalPoints * (settings.winningPercentage / 100);
    
    // Generate result for each option (A, B, C)
    const resultA = selectBestNumber(distributionA, maxAllowedPayout / 3, 'A');
    const resultB = selectBestNumber(distributionB, maxAllowedPayout / 3, 'B');
    const resultC = selectBestNumber(distributionC, maxAllowedPayout / 3, 'C');
    
    return { resultA, resultB, resultC };
    
  } catch (error) {
    console.error('Error generating smart 3D result:', error);
    // Fallback to random
    const resultA = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const resultB = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const resultC = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return { resultA, resultB, resultC };
  }
}

// Helper function to select best number from distribution
function selectBestNumber(distribution, maxPayout, option) {
  // All possible 3-digit numbers (000-999)
  const allNumbers = Array.from({ length: 1000 }, (_, i) => i.toString().padStart(3, '0'));
  
  // Sort numbers by potential payout (lowest first)
  const sortedNumbers = allNumbers.map(num => ({
    number: num,
    payout: distribution[num]?.potentialPayout || 0,
    bets: distribution[num]?.bets || 0
  })).sort((a, b) => a.payout - b.payout);
  
  // Find numbers within allowed payout range
  const validNumbers = sortedNumbers.filter(n => n.payout <= maxPayout);
  
  if (validNumbers.length > 0) {
    // Prefer numbers with lower payouts
    const topCandidates = validNumbers.slice(0, Math.max(50, Math.floor(validNumbers.length * 0.3)));
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    return selected.number;
  }
  
  // If no valid numbers, pick the one with lowest payout
  return sortedNumbers[0].number;
}

module.exports = {
  generateSmart2DResult,
  generateSmart12DResult,
  generateSmart100DResult,
  generateSmart3DResult,
  getGameSettings
};
