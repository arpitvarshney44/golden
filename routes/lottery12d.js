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
    const { date, limit = 50 } = req.query;
    
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
    
    const results = await LotteryResult12D.find(query)
      .sort({ drawDate: -1, drawTime: -1 })
      .limit(parseInt(limit));
    
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const results = await LotteryResult12D.find({
      drawDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ drawTime: -1 });
    
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

module.exports = router;
