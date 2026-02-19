const express = require('express');
const router = express.Router();
const LotteryResult = require('../models/LotteryResult');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

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

// Update retailer balance (add/remove points)
router.put('/retailer/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, action } = req.body; // action: 'add' or 'remove'

    const retailer = await User.findById(id);
    if (!retailer) {
      return res.status(404).json({ message: 'Retailer not found' });
    }

    const balanceBefore = retailer.balance;
    let balanceAfter = balanceBefore;

    if (action === 'add') {
      retailer.balance += parseFloat(amount);
      balanceAfter = retailer.balance;
    } else if (action === 'remove') {
      if (retailer.balance < parseFloat(amount)) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      retailer.balance -= parseFloat(amount);
      balanceAfter = retailer.balance;
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "add" or "remove"' });
    }

    await retailer.save();

    // Create transaction record
    const transaction = new Transaction({
      loginId: retailer.loginId,
      type: action === 'add' ? 'addition' : 'deduction',
      amount: parseFloat(amount),
      reason: action === 'add' ? 'Admin Added Points' : 'Admin Removed Points',
      performedBy: 'admin',
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter
    });
    await transaction.save();

    res.json({
      message: `Balance ${action === 'add' ? 'added' : 'removed'} successfully`,
      newBalance: retailer.balance,
      retailer: {
        id: retailer._id,
        loginId: retailer.loginId,
        balance: retailer.balance
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update retailer details
router.put('/retailer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { loginId, password, isActive } = req.body;

    const retailer = await User.findById(id);
    if (!retailer) {
      return res.status(404).json({ message: 'Retailer not found' });
    }

    // Check if new loginId already exists (if changed)
    if (loginId && loginId !== retailer.loginId) {
      const existingUser = await User.findOne({ loginId });
      if (existingUser) {
        return res.status(400).json({ message: 'Login ID already exists' });
      }
      retailer.loginId = loginId;
    }

    // Update password if provided
    if (password && password.trim() !== '') {
      retailer.password = password;
    }

    // Update active status
    if (isActive !== undefined) {
      retailer.isActive = isActive;
    }

    await retailer.save();

    res.json({
      message: 'Retailer updated successfully',
      retailer: {
        id: retailer._id,
        loginId: retailer.loginId,
        balance: retailer.balance,
        isActive: retailer.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


// Get retailer tickets by game type
router.get('/retailer/:loginId/tickets/:gameType', async (req, res) => {
  try {
    const { loginId, gameType } = req.params;
    
    let tickets = [];
    let modelName = '';
    
    // Determine which ticket model to use
    switch(gameType) {
      case '2d':
        const Ticket = require('../models/Ticket');
        tickets = await Ticket.find({ loginId }).sort({ createdAt: -1 });
        modelName = '2D';
        break;
      case '3d':
        const Ticket3D = require('../models/Ticket3D');
        tickets = await Ticket3D.find({ loginId }).sort({ createdAt: -1 });
        modelName = '3D';
        break;
      case '12d':
        const Ticket12D = require('../models/Ticket12D');
        tickets = await Ticket12D.find({ loginId }).sort({ createdAt: -1 });
        modelName = '12D';
        break;
      case '100d':
        const Ticket100D = require('../models/Ticket100D');
        tickets = await Ticket100D.find({ loginId }).sort({ createdAt: -1 });
        modelName = '100D';
        break;
      default:
        return res.status(400).json({ message: 'Invalid game type' });
    }
    
    // Calculate statistics
    const totalTickets = tickets.length;
    const totalPoints = tickets.reduce((sum, t) => sum + t.totalPoints, 0);
    const wonTickets = tickets.filter(t => t.status === 'won').length;
    const totalWinnings = tickets.reduce((sum, t) => sum + (t.winAmount || 0), 0);
    
    res.json({
      gameType: modelName,
      loginId,
      tickets,
      stats: {
        totalTickets,
        totalPoints,
        wonTickets,
        totalWinnings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all tickets summary for a retailer
router.get('/retailer/:loginId/tickets-summary', async (req, res) => {
  try {
    const { loginId } = req.params;
    
    const Ticket = require('../models/Ticket');
    const Ticket3D = require('../models/Ticket3D');
    const Ticket12D = require('../models/Ticket12D');
    const Ticket100D = require('../models/Ticket100D');
    
    // Get tickets from all games
    const tickets2D = await Ticket.find({ loginId });
    const tickets3D = await Ticket3D.find({ loginId });
    const tickets12D = await Ticket12D.find({ loginId });
    const tickets100D = await Ticket100D.find({ loginId });
    
    // Calculate stats for each game
    const summary = {
      '2D': {
        totalTickets: tickets2D.length,
        totalPoints: tickets2D.reduce((sum, t) => sum + t.totalPoints, 0),
        wonTickets: tickets2D.filter(t => t.status === 'won').length,
        totalWinnings: tickets2D.reduce((sum, t) => sum + (t.winAmount || 0), 0)
      },
      '3D': {
        totalTickets: tickets3D.length,
        totalPoints: tickets3D.reduce((sum, t) => sum + t.totalPoints, 0),
        wonTickets: tickets3D.filter(t => t.status === 'won').length,
        totalWinnings: tickets3D.reduce((sum, t) => sum + (t.winAmount || 0), 0)
      },
      '12D': {
        totalTickets: tickets12D.length,
        totalPoints: tickets12D.reduce((sum, t) => sum + t.totalPoints, 0),
        wonTickets: tickets12D.filter(t => t.status === 'won').length,
        totalWinnings: tickets12D.reduce((sum, t) => sum + (t.winAmount || 0), 0)
      },
      '100D': {
        totalTickets: tickets100D.length,
        totalPoints: tickets100D.reduce((sum, t) => sum + t.totalPoints, 0),
        wonTickets: tickets100D.filter(t => t.status === 'won').length,
        totalWinnings: tickets100D.reduce((sum, t) => sum + (t.winAmount || 0), 0)
      }
    };
    
    // Calculate overall totals
    const overall = {
      totalTickets: Object.values(summary).reduce((sum, game) => sum + game.totalTickets, 0),
      totalPoints: Object.values(summary).reduce((sum, game) => sum + game.totalPoints, 0),
      wonTickets: Object.values(summary).reduce((sum, game) => sum + game.wonTickets, 0),
      totalWinnings: Object.values(summary).reduce((sum, game) => sum + game.totalWinnings, 0)
    };
    
    res.json({
      loginId,
      summary,
      overall
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Get wallet history for a retailer
router.get('/retailer/:loginId/wallet-history', async (req, res) => {
  try {
    const { loginId } = req.params;
    
    // Get user
    const user = await User.findOne({ loginId });
    if (!user) {
      return res.status(404).json({ message: 'Retailer not found' });
    }
    
    // Get all tickets from all games
    const Ticket = require('../models/Ticket');
    const Ticket3D = require('../models/Ticket3D');
    const Ticket12D = require('../models/Ticket12D');
    const Ticket100D = require('../models/Ticket100D');
    
    const tickets2D = await Ticket.find({ loginId }).sort({ createdAt: -1 });
    const tickets3D = await Ticket3D.find({ loginId }).sort({ createdAt: -1 });
    const tickets12D = await Ticket12D.find({ loginId }).sort({ createdAt: -1 });
    const tickets100D = await Ticket100D.find({ loginId }).sort({ createdAt: -1 });
    
    // Get admin transactions
    const adminTransactions = await Transaction.find({ loginId }).sort({ createdAt: -1 });
    
    // Create wallet history entries
    const history = [];
    
    // Add admin transactions
    adminTransactions.forEach(trans => {
      history.push({
        type: trans.type,
        amount: trans.amount,
        reason: trans.reason,
        ticketId: 'N/A',
        gameType: 'Admin',
        date: trans.createdAt,
        ticketDetails: null
      });
    });
    
    // Add ticket purchases (deductions)
    tickets2D.forEach(ticket => {
      history.push({
        type: 'deduction',
        amount: ticket.totalPoints,
        reason: '2D Ticket Purchase',
        ticketId: ticket.serialId,
        gameType: '2D',
        date: ticket.createdAt,
        ticketDetails: { ...ticket.toObject(), gameType: '2D' }
      });
    });
    
    tickets3D.forEach(ticket => {
      history.push({
        type: 'deduction',
        amount: ticket.totalPoints,
        reason: '3D Ticket Purchase',
        ticketId: ticket.serialId,
        gameType: '3D',
        date: ticket.createdAt,
        ticketDetails: { ...ticket.toObject(), gameType: '3D' }
      });
    });
    
    tickets12D.forEach(ticket => {
      history.push({
        type: 'deduction',
        amount: ticket.totalPoints,
        reason: '12D Ticket Purchase',
        ticketId: ticket.serialId,
        gameType: '12D',
        date: ticket.createdAt,
        ticketDetails: { ...ticket.toObject(), gameType: '12D' }
      });
    });
    
    tickets100D.forEach(ticket => {
      history.push({
        type: 'deduction',
        amount: ticket.totalPoints,
        reason: '100D Ticket Purchase',
        ticketId: ticket.serialId,
        gameType: '100D',
        date: ticket.createdAt,
        ticketDetails: { ...ticket.toObject(), gameType: '100D' }
      });
    });
    
    // Add winnings (additions)
    tickets2D.forEach(ticket => {
      if (ticket.status === 'won' && ticket.claimed && ticket.winAmount > 0) {
        history.push({
          type: 'addition',
          amount: ticket.winAmount,
          reason: '2D Winning Claimed',
          ticketId: ticket.serialId,
          gameType: '2D',
          date: ticket.claimedAt || ticket.updatedAt,
          ticketDetails: { ...ticket.toObject(), gameType: '2D' }
        });
      }
    });
    
    tickets3D.forEach(ticket => {
      if (ticket.status === 'won' && ticket.claimed && ticket.winAmount > 0) {
        history.push({
          type: 'addition',
          amount: ticket.winAmount,
          reason: '3D Winning Claimed',
          ticketId: ticket.serialId,
          gameType: '3D',
          date: ticket.claimedAt || ticket.updatedAt,
          ticketDetails: { ...ticket.toObject(), gameType: '3D' }
        });
      }
    });
    
    tickets12D.forEach(ticket => {
      if (ticket.status === 'won' && ticket.claimed && ticket.winAmount > 0) {
        history.push({
          type: 'addition',
          amount: ticket.winAmount,
          reason: '12D Winning Claimed',
          ticketId: ticket.serialId,
          gameType: '12D',
          date: ticket.claimedAt || ticket.updatedAt,
          ticketDetails: { ...ticket.toObject(), gameType: '12D' }
        });
      }
    });
    
    tickets100D.forEach(ticket => {
      if (ticket.status === 'won' && ticket.claimed && ticket.winAmount > 0) {
        history.push({
          type: 'addition',
          amount: ticket.winAmount,
          reason: '100D Winning Claimed',
          ticketId: ticket.serialId,
          gameType: '100D',
          date: ticket.claimedAt || ticket.updatedAt,
          ticketDetails: { ...ticket.toObject(), gameType: '100D' }
        });
      }
    });
    
    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      loginId,
      currentBalance: user.balance,
      history
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all retailers wallet history (for admin overview)
router.get('/wallet-history/all', async (req, res) => {
  try {
    const retailers = await User.find({ role: 'user' }).select('loginId balance');
    
    const allHistory = [];
    
    for (const retailer of retailers) {
      const response = await fetch(`http://localhost:5000/api/admin/retailer/${retailer.loginId}/wallet-history`);
      const data = await response.json();
      
      allHistory.push({
        loginId: retailer.loginId,
        balance: retailer.balance,
        historyCount: data.history.length
      });
    }
    
    res.json(allHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Game Settings Routes
const GameSettings = require('../models/GameSettings');

// Get all game settings
router.get('/game-settings', async (req, res) => {
  try {
    let settings = await GameSettings.find();
    
    // If no settings exist, create default ones
    if (settings.length === 0) {
      const defaultSettings = [
        { gameType: '2D', winningPercentage: 70, description: '2D Game winning percentage' },
        { gameType: '3D', winningPercentage: 65, description: '3D Game winning percentage' },
        { gameType: '12D', winningPercentage: 75, description: '12D Game winning percentage' },
        { gameType: '100D', winningPercentage: 60, description: '100D Game winning percentage' }
      ];
      
      settings = await GameSettings.insertMany(defaultSettings);
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update game settings
router.put('/game-settings/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    const { winningPercentage, isActive, description } = req.body;
    
    if (winningPercentage < 0 || winningPercentage > 100) {
      return res.status(400).json({ message: 'Winning percentage must be between 0 and 100' });
    }
    
    let settings = await GameSettings.findOne({ gameType });
    
    if (!settings) {
      settings = new GameSettings({ gameType, winningPercentage, isActive, description });
    } else {
      settings.winningPercentage = winningPercentage;
      if (isActive !== undefined) settings.isActive = isActive;
      if (description !== undefined) settings.description = description;
    }
    
    await settings.save();
    
    res.json({
      message: 'Game settings updated successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get bet statistics for a specific draw
router.get('/bet-stats/:gameType/:drawDate/:drawTime', async (req, res) => {
  try {
    const { gameType, drawDate, drawTime } = req.params;
    
    let tickets = [];
    let totalBets = 0;
    let totalPoints = 0;
    let betDistribution = {};
    
    if (gameType === '2D') {
      const Ticket = require('../models/Ticket');
      tickets = await Ticket.find({ 
        drawDate: new Date(drawDate), 
        drawTime: drawTime,
        status: 'active'
      });
      
      tickets.forEach(ticket => {
        totalPoints += ticket.totalPoints;
        ticket.numbers.forEach(num => {
          if (!betDistribution[num.number]) {
            betDistribution[num.number] = { count: 0, points: 0, potentialPayout: 0 };
          }
          betDistribution[num.number].count += num.quantity;
          betDistribution[num.number].points += num.quantity * 2;
          betDistribution[num.number].potentialPayout += num.quantity * 180; // 90x multiplier
        });
      });
    } else if (gameType === '3D') {
      const Ticket3D = require('../models/Ticket3D');
      tickets = await Ticket3D.find({ 
        drawDate: new Date(drawDate), 
        drawTime: drawTime,
        status: 'active'
      });
      
      tickets.forEach(ticket => {
        totalPoints += ticket.totalPoints;
        // 3D has complex bet types, simplified for now
      });
    } else if (gameType === '12D') {
      const Ticket12D = require('../models/Ticket12D');
      tickets = await Ticket12D.find({ 
        drawDate: new Date(drawDate), 
        drawTime: drawTime,
        status: 'active'
      });
      
      tickets.forEach(ticket => {
        totalPoints += ticket.totalPoints;
        ticket.selections.forEach(sel => {
          if (!betDistribution[sel.image]) {
            betDistribution[sel.image] = { count: 0, points: 0, potentialPayout: 0 };
          }
          betDistribution[sel.image].count += sel.quantity;
          betDistribution[sel.image].points += sel.quantity * 10;
          betDistribution[sel.image].potentialPayout += sel.quantity * 100; // 10x multiplier
        });
      });
    } else if (gameType === '100D') {
      const Ticket100D = require('../models/Ticket100D');
      tickets = await Ticket100D.find({ 
        drawDate: new Date(drawDate), 
        drawTime: drawTime,
        status: 'active'
      });
      
      tickets.forEach(ticket => {
        totalPoints += ticket.totalPoints;
        ticket.numbers.forEach(num => {
          if (!betDistribution[num.number]) {
            betDistribution[num.number] = { count: 0, points: 0, potentialPayout: 0 };
          }
          betDistribution[num.number].count += num.quantity;
          betDistribution[num.number].points += num.quantity * 2;
          betDistribution[num.number].potentialPayout += num.quantity * 180; // 90x multiplier
        });
      });
    }
    
    totalBets = tickets.length;
    
    // Sort by potential payout (highest first)
    const sortedDistribution = Object.entries(betDistribution)
      .map(([key, value]) => ({ number: key, ...value }))
      .sort((a, b) => b.potentialPayout - a.potentialPayout);
    
    res.json({
      gameType,
      drawDate,
      drawTime,
      totalBets,
      totalPoints,
      betDistribution: sortedDistribution
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
