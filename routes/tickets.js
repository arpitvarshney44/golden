const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');

// Generate unique serial ID
function generateSerialId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

// Generate barcode number (10 digits)
function generateBarcodeNumber() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Create new ticket
router.post('/create', async (req, res) => {
  try {
    const { loginId, numbers, drawDate, drawTime, desk, gameType } = req.body;
    
    // Validate input
    if (!loginId || !numbers || numbers.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Calculate totals
    let totalQuantity = 0;
    const validNumbers = [];
    
    numbers.forEach(item => {
      if (item.quantity > 0) {
        totalQuantity += parseInt(item.quantity);
        validNumbers.push({
          number: item.number,
          quantity: parseInt(item.quantity)
        });
      }
    });

    const totalPoints = totalQuantity * 2; // 2 points per quantity

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

    const ticket = new Ticket({
      serialId,
      barcodeNumber,
      userId: user._id,
      loginId: user.loginId,
      desk: desk || '',
      gameType: gameType || '2D',
      drawDate: drawDate || new Date(),
      drawTime: drawTime || '07:30:00 PM',
      totalQuantity,
      totalPoints,
      numbers: validNumbers,
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
    console.error('Error creating ticket:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ticket by barcode
router.get('/barcode/:barcodeNumber', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ barcodeNumber: req.params.barcodeNumber })
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
    const ticket = await Ticket.findById(req.params.ticketId)
      .populate('userId', 'loginId balance');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // If ticket is still pending, check if result is available and update status
    if (ticket.winStatus === 'pending' && ticket.status === 'active') {
      const LotteryResult = require('../models/LotteryResult');
      
      const result = await LotteryResult.findOne({
        date: ticket.drawDate,
        time: ticket.drawTime
      });
      
      if (result) {
        let won = false;
        let winAmount = 0;
        
        for (const num of ticket.numbers) {
          if (result.result === num.number.toString()) {
            won = true;
            winAmount += num.quantity * 180;
          }
        }
        
        ticket.winStatus = won ? 'won' : 'loss';
        if (won) {
          ticket.winAmount = winAmount;
        }
        await ticket.save();
      }
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ticket by serial ID
router.get('/serial/:serialId', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ serialId: req.params.serialId })
      .populate('userId', 'loginId balance');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user tickets
router.get('/user/:userId', async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(tickets);
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

    const tickets = await Ticket.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel ticket
router.post('/cancel/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    
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
      await user.save();
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

// Claim ticket (check win/loss) - OLD ENDPOINT, DEPRECATED
router.post('/:ticketId/claim', async (req, res) => {
  try {
    const { winStatus, winningNumbers } = req.body;
    const ticket = await Ticket.findById(req.params.ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.winStatus = winStatus;
    ticket.winningNumbers = winningNumbers || [];
    ticket.claimedAt = new Date();
    
    if (winStatus === 'won') {
      ticket.status = 'won';
    } else {
      ticket.status = 'lost';
    }
    
    await ticket.save();

    res.json({
      success: true,
      message: winStatus === 'won' ? 'Congratulations! You won!' : 'No win this time',
      ticket: ticket
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Claim winning - NEW ENDPOINT (matches other games)
router.put('/claim/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.winStatus !== 'won') {
      return res.status(400).json({ message: 'This ticket has no winnings to claim' });
    }

    if (ticket.claimedAt) {
      return res.status(400).json({ message: 'Winning already claimed' });
    }

    // Add winning amount to user balance
    const user = await User.findById(ticket.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.balance += ticket.winAmount || 0;
    await user.save({ validateModifiedOnly: true });

    // Mark as claimed and update status
    ticket.claimedAt = new Date();
    ticket.status = 'won';
    await ticket.save();

    res.json({
      success: true,
      message: 'Winning claimed successfully',
      winAmount: ticket.winAmount || 0,
      newBalance: user.balance
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
