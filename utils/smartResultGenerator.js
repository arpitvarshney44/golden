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
    console.log('\n========================================');
    console.log('🎯 2D SMART RESULT GENERATION STARTED');
    console.log('========================================');
    console.log(`📅 Draw Date: ${drawDate}`);
    console.log(`⏰ Draw Time: ${drawTime}`);
    
    const settings = await getGameSettings('2D');
    console.log(`⚙️  Winning Percentage Setting: ${settings.winningPercentage}%`);
    
    const { distribution, totalPoints } = await calculate2DBetDistribution(drawDate, drawTime);
    console.log(`💰 Total Points Collected: ${totalPoints}`);
    
    if (totalPoints === 0) {
      console.log('⚠️  No bets placed for this draw');
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      console.log(`🎲 Generating random result: ${random}`);
      console.log('========================================\n');
      return random;
    }
    
    const maxAllowedPayout = totalPoints * (settings.winningPercentage / 100);
    console.log(`📊 Maximum Allowed Payout: ${maxAllowedPayout.toFixed(2)} (${settings.winningPercentage}% of ${totalPoints})`);
    console.log(`🏦 House Edge: ${(100 - settings.winningPercentage)}%`);
    
    // Get all possible numbers (00-99)
    const allNumbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
    
    // Sort numbers by potential payout (lowest first - best for house)
    const sortedNumbers = allNumbers.map(num => ({
      number: num,
      payout: distribution[num]?.potentialPayout || 0,
      bets: distribution[num]?.bets || 0
    })).sort((a, b) => a.payout - b.payout);
    
    // Show top 5 most bet numbers
    const topBetNumbers = [...sortedNumbers].sort((a, b) => b.bets - a.bets).slice(0, 5);
    console.log('\n📈 Top 5 Most Bet Numbers:');
    topBetNumbers.forEach((n, i) => {
      console.log(`   ${i + 1}. Number ${n.number}: ${n.bets} bets, Payout: ${n.payout}`);
    });
    
    // Show top 5 least bet numbers
    const leastBetNumbers = sortedNumbers.slice(0, 5);
    console.log('\n📉 Top 5 Least Bet Numbers (Best for House):');
    leastBetNumbers.forEach((n, i) => {
      console.log(`   ${i + 1}. Number ${n.number}: ${n.bets} bets, Payout: ${n.payout}`);
    });
    
    // Find numbers within allowed payout range
    const validNumbers = sortedNumbers.filter(n => n.payout <= maxAllowedPayout);
    console.log(`\n✅ Valid Numbers (within payout limit): ${validNumbers.length}/100`);
    
    if (validNumbers.length > 0) {
      // Prefer numbers with lower payouts (better for house)
      // But add some randomness to avoid patterns
      const topCandidates = validNumbers.slice(0, Math.max(10, Math.floor(validNumbers.length * 0.3)));
      console.log(`🎯 Top Candidates Selected: ${topCandidates.length} numbers`);
      
      const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      
      console.log('\n🎊 RESULT SELECTED:');
      console.log(`   Number: ${selected.number}`);
      console.log(`   Bets on this number: ${selected.bets}`);
      console.log(`   Payout if wins: ${selected.payout}`);
      console.log(`   House profit: ${totalPoints - selected.payout}`);
      console.log(`   Actual payout %: ${((selected.payout / totalPoints) * 100).toFixed(2)}%`);
      console.log('========================================\n');
      
      return selected.number;
    }
    
    // If no valid numbers (all exceed limit), pick the one with lowest payout
    console.log('\n⚠️  WARNING: All numbers exceed payout limit!');
    console.log('🔧 Selecting number with lowest payout to minimize loss');
    const selected = sortedNumbers[0];
    console.log(`   Number: ${selected.number}`);
    console.log(`   Payout: ${selected.payout}`);
    console.log(`   Loss: ${selected.payout - totalPoints}`);
    console.log('========================================\n');
    return selected.number;
    
  } catch (error) {
    console.error('❌ Error generating smart 2D result:', error);
    // Fallback to random
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    console.log(`🎲 Fallback to random: ${random}`);
    console.log('========================================\n');
    return random;
  }
}

// Generate smart result for 12D game
async function generateSmart12DResult(drawDate, drawTime) {
  try {
    console.log('\n========================================');
    console.log('🎯 12D SMART RESULT GENERATION STARTED');
    console.log('========================================');
    console.log(`📅 Draw Date: ${drawDate}`);
    console.log(`⏰ Draw Time: ${drawTime}`);
    
    const settings = await getGameSettings('12D');
    console.log(`⚙️  Winning Percentage Setting: ${settings.winningPercentage}%`);
    
    const { distribution, totalPoints } = await calculate12DBetDistribution(drawDate, drawTime);
    console.log(`💰 Total Points Collected: ${totalPoints}`);
    
    if (totalPoints === 0) {
      console.log('⚠️  No bets placed for this draw');
      const images = ['umbrella', 'book', 'basket', 'butterfly', 'bucket', 'football', 'goat', 'spinning-top', 'rose', 'sun', 'bird', 'rabbit'];
      const random = images[Math.floor(Math.random() * images.length)];
      console.log(`🎲 Generating random result: ${random}`);
      console.log('========================================\n');
      return random;
    }
    
    const maxAllowedPayout = totalPoints * (settings.winningPercentage / 100);
    console.log(`📊 Maximum Allowed Payout: ${maxAllowedPayout.toFixed(2)} (${settings.winningPercentage}% of ${totalPoints})`);
    console.log(`🏦 House Edge: ${(100 - settings.winningPercentage)}%`);
    
    // All possible images (matching the model enum)
    const allImages = ['umbrella', 'book', 'basket', 'butterfly', 'bucket', 'football', 'goat', 'spinning-top', 'rose', 'sun', 'bird', 'rabbit'];
    
    // Sort images by potential payout (lowest first)
    const sortedImages = allImages.map(img => ({
      image: img,
      payout: distribution[img]?.potentialPayout || 0,
      bets: distribution[img]?.bets || 0
    })).sort((a, b) => a.payout - b.payout);
    
    // Show all images with bet info
    console.log('\n📊 All Images Bet Distribution:');
    sortedImages.forEach((img, i) => {
      const status = img.payout <= maxAllowedPayout ? '✅' : '❌';
      console.log(`   ${status} ${img.image.padEnd(15)}: ${img.bets} bets, Payout: ${img.payout}`);
    });
    
    // Find images within allowed payout range
    const validImages = sortedImages.filter(i => i.payout <= maxAllowedPayout);
    console.log(`\n✅ Valid Images (within payout limit): ${validImages.length}/12`);
    
    if (validImages.length > 0) {
      // Prefer images with lower payouts
      const topCandidates = validImages.slice(0, Math.max(3, Math.floor(validImages.length * 0.4)));
      console.log(`🎯 Top Candidates Selected: ${topCandidates.length} images`);
      console.log('   Candidates:', topCandidates.map(c => c.image).join(', '));
      
      const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      
      console.log('\n🎊 RESULT SELECTED:');
      console.log(`   Image: ${selected.image}`);
      console.log(`   Bets on this image: ${selected.bets}`);
      console.log(`   Payout if wins: ${selected.payout}`);
      console.log(`   House profit: ${totalPoints - selected.payout}`);
      console.log(`   Actual payout %: ${((selected.payout / totalPoints) * 100).toFixed(2)}%`);
      console.log('========================================\n');
      
      return selected.image;
    }
    
    // If no valid images, pick the one with lowest payout
    console.log('\n⚠️  WARNING: All images exceed payout limit!');
    console.log('🔧 Selecting image with lowest payout to minimize loss');
    const selected = sortedImages[0];
    console.log(`   Image: ${selected.image}`);
    console.log(`   Payout: ${selected.payout}`);
    console.log(`   Loss: ${selected.payout - totalPoints}`);
    console.log('========================================\n');
    return selected.image;
    
  } catch (error) {
    console.error('❌ Error generating smart 12D result:', error);
    // Fallback to random
    const images = ['umbrella', 'book', 'basket', 'butterfly', 'bucket', 'football', 'goat', 'spinning-top', 'rose', 'sun', 'bird', 'rabbit'];
    const random = images[Math.floor(Math.random() * images.length)];
    console.log(`🎲 Fallback to random: ${random}`);
    console.log('========================================\n');
    return random;
  }
}

// Generate smart result for 100D game
async function generateSmart100DResult(drawDate, drawTime, blockStart) {
  try {
    console.log('\n========================================');
    console.log('🎯 100D SMART RESULT GENERATION STARTED');
    console.log('========================================');
    console.log(`📅 Draw Date: ${drawDate}`);
    console.log(`⏰ Draw Time: ${drawTime}`);
    console.log(`🎲 Block Range: ${blockStart} - ${blockStart + 99}`);
    
    const settings = await getGameSettings('100D');
    console.log(`⚙️  Winning Percentage Setting: ${settings.winningPercentage}%`);
    
    const { distribution, totalPoints } = await calculate100DBetDistribution(drawDate, drawTime);
    console.log(`💰 Total Points Collected: ${totalPoints}`);
    
    if (totalPoints === 0) {
      console.log('⚠️  No bets placed for this draw');
      const min = blockStart;
      const max = blockStart + 99;
      const random = Math.floor(Math.random() * (max - min + 1)) + min;
      console.log(`🎲 Generating random result: ${random}`);
      console.log('========================================\n');
      return random;
    }
    
    const maxAllowedPayout = totalPoints * (settings.winningPercentage / 100);
    console.log(`📊 Maximum Allowed Payout: ${maxAllowedPayout.toFixed(2)} (${settings.winningPercentage}% of ${totalPoints})`);
    console.log(`🏦 House Edge: ${(100 - settings.winningPercentage)}%`);
    
    // All possible numbers in this block
    const allNumbers = Array.from({ length: 100 }, (_, i) => (blockStart + i).toString());
    
    // Sort numbers by potential payout (lowest first)
    const sortedNumbers = allNumbers.map(num => ({
      number: num,
      payout: distribution[num]?.potentialPayout || 0,
      bets: distribution[num]?.bets || 0
    })).sort((a, b) => a.payout - b.payout);
    
    // Show top 5 most bet numbers
    const topBetNumbers = [...sortedNumbers].sort((a, b) => b.bets - a.bets).slice(0, 5);
    console.log('\n📈 Top 5 Most Bet Numbers:');
    topBetNumbers.forEach((n, i) => {
      console.log(`   ${i + 1}. Number ${n.number}: ${n.bets} bets, Payout: ${n.payout}`);
    });
    
    // Show top 5 least bet numbers
    const leastBetNumbers = sortedNumbers.slice(0, 5);
    console.log('\n📉 Top 5 Least Bet Numbers (Best for House):');
    leastBetNumbers.forEach((n, i) => {
      console.log(`   ${i + 1}. Number ${n.number}: ${n.bets} bets, Payout: ${n.payout}`);
    });
    
    // Find numbers within allowed payout range
    const validNumbers = sortedNumbers.filter(n => n.payout <= maxAllowedPayout);
    console.log(`\n✅ Valid Numbers (within payout limit): ${validNumbers.length}/100`);
    
    if (validNumbers.length > 0) {
      // Prefer numbers with lower payouts
      const topCandidates = validNumbers.slice(0, Math.max(10, Math.floor(validNumbers.length * 0.3)));
      console.log(`🎯 Top Candidates Selected: ${topCandidates.length} numbers`);
      
      const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      
      console.log('\n🎊 RESULT SELECTED:');
      console.log(`   Number: ${selected.number}`);
      console.log(`   Bets on this number: ${selected.bets}`);
      console.log(`   Payout if wins: ${selected.payout}`);
      console.log(`   House profit: ${totalPoints - selected.payout}`);
      console.log(`   Actual payout %: ${((selected.payout / totalPoints) * 100).toFixed(2)}%`);
      console.log('========================================\n');
      
      return parseInt(selected.number);
    }
    
    // If no valid numbers, pick the one with lowest payout
    console.log('\n⚠️  WARNING: All numbers exceed payout limit!');
    console.log('🔧 Selecting number with lowest payout to minimize loss');
    const selected = sortedNumbers[0];
    console.log(`   Number: ${selected.number}`);
    console.log(`   Payout: ${selected.payout}`);
    console.log(`   Loss: ${selected.payout - totalPoints}`);
    console.log('========================================\n');
    return parseInt(selected.number);
    
  } catch (error) {
    console.error('❌ Error generating smart 100D result:', error);
    // Fallback to random
    const min = blockStart;
    const max = blockStart + 99;
    const random = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`🎲 Fallback to random: ${random}`);
    console.log('========================================\n');
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
    console.log('\n========================================');
    console.log('🎯 3D SMART RESULT GENERATION STARTED');
    console.log('========================================');
    console.log(`📅 Draw Date: ${drawDate}`);
    console.log(`⏰ Draw Time: ${drawTime}`);
    
    const settings = await getGameSettings('3D');
    console.log(`⚙️  Winning Percentage Setting: ${settings.winningPercentage}%`);
    
    const { distributionA, distributionB, distributionC, totalPoints } = await calculate3DBetDistribution(drawDate, drawTime);
    console.log(`💰 Total Points Collected: ${totalPoints}`);
    
    if (totalPoints === 0) {
      console.log('⚠️  No bets placed for this draw');
      const resultA = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const resultB = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const resultC = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      console.log(`🎲 Generating random results: A=${resultA}, B=${resultB}, C=${resultC}`);
      console.log('========================================\n');
      return { resultA, resultB, resultC };
    }
    
    const maxAllowedPayout = totalPoints * (settings.winningPercentage / 100);
    console.log(`📊 Maximum Allowed Payout: ${maxAllowedPayout.toFixed(2)} (${settings.winningPercentage}% of ${totalPoints})`);
    console.log(`🏦 House Edge: ${(100 - settings.winningPercentage)}%`);
    console.log(`📊 Payout per option (A/B/C): ${(maxAllowedPayout / 3).toFixed(2)}`);
    
    // Generate result for each option (A, B, C)
    console.log('\n🎯 Generating Result for Option A:');
    const resultA = selectBestNumber(distributionA, maxAllowedPayout / 3, 'A');
    
    console.log('\n🎯 Generating Result for Option B:');
    const resultB = selectBestNumber(distributionB, maxAllowedPayout / 3, 'B');
    
    console.log('\n🎯 Generating Result for Option C:');
    const resultC = selectBestNumber(distributionC, maxAllowedPayout / 3, 'C');
    
    const totalPayout = (distributionA[resultA]?.potentialPayout || 0) + 
                        (distributionB[resultB]?.potentialPayout || 0) + 
                        (distributionC[resultC]?.potentialPayout || 0);
    
    console.log('\n🎊 FINAL 3D RESULTS:');
    console.log(`   Option A: ${resultA}`);
    console.log(`   Option B: ${resultB}`);
    console.log(`   Option C: ${resultC}`);
    console.log(`   Total Payout: ${totalPayout}`);
    console.log(`   House Profit: ${totalPoints - totalPayout}`);
    console.log(`   Actual Payout %: ${((totalPayout / totalPoints) * 100).toFixed(2)}%`);
    console.log('========================================\n');
    
    return { resultA, resultB, resultC };
    
  } catch (error) {
    console.error('❌ Error generating smart 3D result:', error);
    // Fallback to random
    const resultA = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const resultB = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const resultC = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    console.log(`🎲 Fallback to random: A=${resultA}, B=${resultB}, C=${resultC}`);
    console.log('========================================\n');
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
  
  // Show top 5 most bet numbers
  const topBetNumbers = [...sortedNumbers].sort((a, b) => b.bets - a.bets).slice(0, 5);
  console.log(`   📈 Top 5 Most Bet Numbers for ${option}:`);
  topBetNumbers.forEach((n, i) => {
    console.log(`      ${i + 1}. ${n.number}: ${n.bets} bets, Payout: ${n.payout}`);
  });
  
  // Find numbers within allowed payout range
  const validNumbers = sortedNumbers.filter(n => n.payout <= maxPayout);
  console.log(`   ✅ Valid Numbers: ${validNumbers.length}/1000`);
  
  if (validNumbers.length > 0) {
    // Prefer numbers with lower payouts
    const topCandidates = validNumbers.slice(0, Math.max(50, Math.floor(validNumbers.length * 0.3)));
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    console.log(`   ✨ Selected: ${selected.number} (Bets: ${selected.bets}, Payout: ${selected.payout})`);
    return selected.number;
  }
  
  // If no valid numbers, pick the one with lowest payout
  console.log(`   ⚠️  All exceed limit! Selecting lowest: ${sortedNumbers[0].number}`);
  return sortedNumbers[0].number;
}

module.exports = {
  generateSmart2DResult,
  generateSmart12DResult,
  generateSmart100DResult,
  generateSmart3DResult,
  getGameSettings
};
