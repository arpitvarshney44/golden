const express = require('express');
const router = express.Router();
const Ticket3D = require('../models/Ticket3D');
const User = require('../models/User');

// Generate unique serial ID
function generateSerialId() {
  return '3D' + Date.now().toString() + Math.floor(Math.random() * 1000);
}

// Generate barcode number (10 digits)
function generateBarcodeNumber() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Create new 3D ticket
router.post('/create', async (req, res) => {
  try {
    const { loginId, bets, drawDate, drawTime, selectedOptions } = req.body;
    
    // Validate input
    if (!loginId || !bets || bets.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate selectedOptions
    if (!selectedOptions || selectedOptions.length === 0) {
      return res.status(400).json({ message: 'Please select at least one option (A, B, or C)' });
    }

    // Calculate totals
    let totalQuantity = 0;
    const validBets = [];
    
    bets.forEach(bet => {
      if (bet.quantity > 0) {
        totalQuantity += parseInt(bet.quantity);
        validBets.push({
          playType: bet.playType,
          number: bet.number,
          quantity: parseInt(bet.quantity),
          pointsPerBet: bet.pointsPerBet || 10,
          option: bet.option || 'A' // Store the option for each bet
        });
      }
    });

    // Calculate total points (10 points per quantity by default)
    const totalPoints = validBets.reduce((sum, bet) => {
      return sum + (bet.quantity * bet.pointsPerBet);
    }, 0);

    // Find user by loginId
    const user = await User.findOne({ loginId: loginId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < totalPoints) {
      return res.status(400).json({ 
        message: 'Insufficient points',
        required: totalPoints,
        available: user.balance
      });
    }

    // Generate ticket
    const serialId = generateSerialId();
    const barcodeNumber = generateBarcodeNumber();
    
    // Calculate valid until date (10 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 10);

    const ticket = new Ticket3D({
      serialId,
      barcodeNumber,
      userId: user._id,
      loginId: user.loginId,
      drawDate: drawDate || new Date(),
      drawTime: drawTime || '09:00:00 AM',
      selectedOptions: selectedOptions,
      totalQuantity,
      totalPoints,
      bets: validBets,
      validUntil
    });

    await ticket.save();

    // Deduct points from user balance
    const oldBalance = user.balance;
    user.balance -= totalPoints;
    
    console.log(`User ${user.loginId} - Old balance: ${oldBalance}, Deducting: ${totalPoints}, New balance: ${user.balance}`);
    
    // Save with validation disabled for password field
    const savedUser = await user.save({ validateModifiedOnly: true });
    
    console.log(`Balance saved to DB: ${savedUser.balance}`);
    
    // Verify the save by fetching again
    const verifyUser = await User.findOne({ loginId: loginId });
    console.log(`Verified balance from DB: ${verifyUser.balance}`);

    res.json({
      success: true,
      ticket: ticket,
      remainingPoints: verifyUser.balance
    });

  } catch (error) {
    console.error('Error creating 3D ticket:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ticket by barcode
router.get('/barcode/:barcodeNumber', async (req, res) => {
  try {
    const ticket = await Ticket3D.findOne({ barcodeNumber: req.params.barcodeNumber })
      .populate('userId', 'loginId balance');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ticket by ID
router.get('/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket3D.findById(req.params.ticketId)
      .populate('userId', 'loginId balance');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // If ticket is still pending, check if result is available and update status
    if (ticket.winStatus === 'pending' && ticket.status === 'active') {
      const LotteryResult3D = require('../models/LotteryResult3D');
      
      const result = await LotteryResult3D.findOne({
        drawDate: ticket.drawDate,
        drawTime: ticket.drawTime
      });
      
      if (result) {
        const { checkWinningTickets } = require('./lottery3d');
        await checkWinningTickets(ticket.drawDate, ticket.drawTime, result.resultA, result.resultB, result.resultC);
        
        // Reload ticket to get updated status
        const updatedTicket = await Ticket3D.findById(req.params.ticketId)
          .populate('userId', 'loginId balance');
        return res.json(updatedTicket);
      }
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tickets by loginId
router.get('/login/:loginId', async (req, res) => {
  try {
    const user = await User.findOne({ loginId: req.params.loginId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const tickets = await Ticket3D.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel ticket
router.post('/cancel/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket3D.findById(req.params.ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.status !== 'active') {
      return res.status(400).json({ message: 'Ticket cannot be cancelled' });
    }

    ticket.status = 'cancelled';
    await ticket.save();

    // Refund points to user
    const user = await User.findById(ticket.userId);
    if (user) {
      user.balance += ticket.totalPoints;
      await user.save({ validateModifiedOnly: true });
    }

    res.json({
      success: true,
      message: 'Ticket cancelled successfully',
      refundedPoints: ticket.totalPoints,
      newBalance: user.balance
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Claim winning
router.put('/claim/:ticketId', async (req, res) => {
  try {
    console.log('[3D Claim] Attempting to claim ticket:', req.params.ticketId);
    
    const ticket = await Ticket3D.findById(req.params.ticketId);
    
    if (!ticket) {
      console.log('[3D Claim] Ticket not found:', req.params.ticketId);
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    console.log('[3D Claim] Ticket found:', ticket.serialId, 'Status:', ticket.status, 'Claimed:', ticket.claimed);

    if (ticket.status !== 'won') {
      return res.status(400).json({ success: false, message: 'This ticket has no winnings to claim' });
    }

    if (ticket.claimed) {
      return res.status(400).json({ success: false, message: 'Winning already claimed' });
    }

    // Add winning amount to user balance
    const user = await User.findById(ticket.userId);
    if (!user) {
      console.log('[3D Claim] User not found:', ticket.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('[3D Claim] User found:', user.loginId, 'Current balance:', user.balance, 'Win amount:', ticket.winAmount);

    user.balance += ticket.winAmount;
    await user.save({ validateModifiedOnly: true });

    // Mark as claimed (skip validation to avoid selectedOptions validation error)
    ticket.claimed = true;
    ticket.claimedAt = new Date();
    await ticket.save({ validateModifiedOnly: true });

    console.log('[3D Claim] Claim successful! New balance:', user.balance);

    res.json({
      success: true,
      message: 'Winning claimed successfully',
      winAmount: ticket.winAmount,
      newBalance: user.balance
    });

  } catch (error) {
    console.error('[3D Claim] Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
