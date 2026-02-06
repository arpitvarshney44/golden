const express = require('express');
const router = express.Router();
const LotteryResult = require('../models/LotteryResult');

// Get results by type
router.get('/results/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const results = await LotteryResult.find({ type: type.toUpperCase() })
      .sort({ date: -1 })
      .limit(50);
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

module.exports = router;
