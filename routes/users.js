const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all retailers
router.get('/retailers', async (req, res) => {
  try {
    const retailers = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(retailers);
  } catch (error) {
    console.error('Error fetching retailers:', error);
    res.status(500).json({ message: 'Error fetching retailers', error: error.message });
  }
});

// Get specific retailer by loginId
router.get('/retailer/:loginId', async (req, res) => {
  try {
    const retailer = await User.findOne({ 
      loginId: req.params.loginId,
      role: 'user'
    }).select('-password');
    
    if (!retailer) {
      return res.status(404).json({ message: 'Retailer not found' });
    }
    
    res.json(retailer);
  } catch (error) {
    console.error('Error fetching retailer:', error);
    res.status(500).json({ message: 'Error fetching retailer', error: error.message });
  }
});

// Update retailer commission rate
router.put('/retailer/:retailerId/commission', async (req, res) => {
  try {
    const { commissionRate } = req.body;
    
    if (commissionRate === undefined || commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({ message: 'Invalid commission rate. Must be between 0 and 100' });
    }
    
    const retailer = await User.findByIdAndUpdate(
      req.params.retailerId,
      { commissionRate: parseFloat(commissionRate) },
      { new: true }
    ).select('-password');
    
    if (!retailer) {
      return res.status(404).json({ message: 'Retailer not found' });
    }
    
    res.json({
      success: true,
      message: 'Commission rate updated successfully',
      retailer
    });
  } catch (error) {
    console.error('Error updating commission:', error);
    res.status(500).json({ message: 'Error updating commission', error: error.message });
  }
});

// Update retailer status
router.put('/retailer/:retailerId/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active or inactive' });
    }
    
    const retailer = await User.findByIdAndUpdate(
      req.params.retailerId,
      { 
        status: status,
        isActive: status === 'active'
      },
      { new: true }
    ).select('-password');
    
    if (!retailer) {
      return res.status(404).json({ message: 'Retailer not found' });
    }
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      retailer
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
});

module.exports = router;
