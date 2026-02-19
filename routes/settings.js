const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Simple in-memory storage for settings (you can use a Settings model if needed)
let defaultCommissionRate = 10;

// Get default commission rate
router.get('/commission/default', async (req, res) => {
  try {
    res.json({ rate: defaultCommissionRate });
  } catch (error) {
    console.error('Error fetching default commission:', error);
    res.status(500).json({ message: 'Error fetching default commission', error: error.message });
  }
});

// Set default commission rate
router.post('/commission/default', async (req, res) => {
  try {
    const { rate } = req.body;
    
    if (rate === undefined || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'Invalid commission rate. Must be between 0 and 100' });
    }
    
    defaultCommissionRate = parseFloat(rate);
    
    res.json({
      success: true,
      message: 'Default commission rate updated successfully',
      rate: defaultCommissionRate
    });
  } catch (error) {
    console.error('Error updating default commission:', error);
    res.status(500).json({ message: 'Error updating default commission', error: error.message });
  }
});

module.exports = router;
