const express = require('express');
const router = express.Router();
const LotteryResult = require('../models/LotteryResult');
const User = require('../models/User');

// Create retailer account (admin only)
router.post('/create-retailer', async (req, res) => {
  try {
    const { loginId, password, balance, isActive } = req.body;

    // Check if retailer already exists
    const existingUser = await User.findOne({ loginId });
    if (existingUser) {
      return res.status(400).json({ message: 'Login ID already exists' });
    }

    // Create new retailer
    const newRetailer = new User({
      loginId,
      password,
      role: 'user',
      balance: balance || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await newRetailer.save();

    res.status(201).json({
      message: 'Retailer created successfully',
      retailer: {
        id: newRetailer._id,
        loginId: newRetailer.loginId,
        balance: newRetailer.balance,
        isActive: newRetailer.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all retailers (admin only)
router.get('/retailers', async (req, res) => {
  try {
    const retailers = await User.find({ role: 'user' }).select('-password');
    res.json(retailers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete retailer (admin only)
router.delete('/retailer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const retailer = await User.findById(id);
    if (!retailer) {
      return res.status(404).json({ message: 'Retailer not found' });
    }
    
    await User.findByIdAndDelete(id);
    
    res.json({ message: 'Retailer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add lottery result (admin only)
router.post('/results', async (req, res) => {
  try {
    const { type, result, time } = req.body;
    const newResult = new LotteryResult({ type, result, time });
    await newResult.save();
    res.status(201).json(newResult);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
