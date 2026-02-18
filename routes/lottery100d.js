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
        const Ticket100D = require('../models/Ticket100D');
        
        // Create date range for the draw date (entire day)
        const startOfDay = new Date(drawDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(drawDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Find all active 100D tickets for this draw
        const tickets = await Ticket100D.find({
            drawDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            drawTime,
            status: 'active',
            winStatus: 'pending'
        });
        
        console.log(`Found ${tickets.length} 100D tickets to check for ${drawTime} on ${drawDate.toDateString()}`);
        
        for (const ticket of tickets) {
            let won = false;
            let winAmount = 0;
            
            // Check if any of the ticket numbers match the winning number
            for (const item of ticket.numbers) {
                if (parseInt(item.number) === winningNumber) {
                    won = true;
                    winAmount += item.quantity * 180; // 90x multiplier (2 points per quantity * 90)
                }
            }
            
            // Update ticket status
            if (won) {
                ticket.winStatus = 'won';
                ticket.status = 'won';
                ticket.winAmount = winAmount;
            } else {
                ticket.winStatus = 'loss';
                ticket.status = 'lost';
            }
            
            await ticket.save();
        }
        
        console.log(`Checked ${tickets.length} 100D tickets for draw ${drawTime}, winning number: ${winningNumber}`);
        
    } catch (error) {
        console.error('Error checking 100D winning tickets:', error);
    }
}

module.exports = router;
module.exports.checkWinningTickets = checkWinningTickets;
