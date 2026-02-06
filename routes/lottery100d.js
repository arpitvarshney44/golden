const express = require('express');
const router = express.Router();
const LotteryResult100D = require('../models/LotteryResult100D');
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth');

// Get results with filters (PUBLIC - no auth required)
router.get('/results', async (req, res) => {
    try {
        const { date, range } = req.query;
        
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
        
        if (range) {
            query.range = range;
        }
        
        const results = await LotteryResult100D.find(query)
            .sort({ drawDate: -1, blockNumber: -1 })
            .limit(1000);
        
        res.json({ results });
        
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get latest results (PUBLIC - no auth required)
router.get('/latest', async (req, res) => {
    try {
        const results = await LotteryResult100D.find()
            .sort({ drawDate: -1, blockNumber: -1 })
            .limit(100);
        
        res.json({ results });
        
    } catch (error) {
        console.error('Error fetching latest results:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Check winning tickets (called after result generation)
async function checkWinningTickets(drawDate, drawTime, winningNumber) {
    try {
        // Find all active 100D tickets for this draw
        const tickets = await Ticket.find({
            drawDate,
            drawTime,
            gameType: '100D',
            status: 'active'
        });
        
        for (const ticket of tickets) {
            let won = false;
            let winAmount = 0;
            const winningNumbersFound = [];
            
            // Check if any of the ticket numbers match the winning number
            ticket.numbers.forEach(item => {
                if (parseInt(item.number) === winningNumber) {
                    won = true;
                    winAmount += item.quantity * 2 * 80; // quantity * 2 points * 80x payout
                    winningNumbersFound.push(item.number);
                }
            });
            
            if (won) {
                ticket.status = 'won';
                ticket.winStatus = 'won';
                ticket.winningNumbers = winningNumbersFound;
                // Note: winAmount is stored as totalPoints equivalent
            } else {
                ticket.status = 'lost';
                ticket.winStatus = 'loss';
            }
            
            await ticket.save();
        }
        
        console.log(`Checked ${tickets.length} 100D tickets for draw ${drawTime}`);
        
    } catch (error) {
        console.error('Error checking winning tickets:', error);
    }
}

module.exports = router;
module.exports.checkWinningTickets = checkWinningTickets;
