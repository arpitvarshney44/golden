const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Ticket100D = require('../models/Ticket100D');
const Ticket12D = require('../models/Ticket12D');
const LotteryResult = require('../models/LotteryResult');
const LotteryResult100D = require('../models/LotteryResult100D');
const LotteryResult12D = require('../models/LotteryResult12D');

// Check 2D ticket by barcode
router.get('/2d/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        
        // Find ticket by barcode
        const ticket = await Ticket.findOne({ barcodeNumber: barcode });
        
        if (!ticket) {
            return res.json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        // Check if ticket is cancelled
        if (ticket.status === 'cancelled') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'cancelled',
                message: 'This ticket has been cancelled'
            });
        }
        
        // Check if result exists for this draw
        console.log('Checking 2D ticket:', {
            barcode: ticket.barcodeNumber,
            drawDate: ticket.drawDate,
            drawTime: ticket.drawTime,
            winStatus: ticket.winStatus
        });
        
        const result = await LotteryResult.findOne({
            date: ticket.drawDate,
            time: ticket.drawTime
        });
        
        console.log('Found 2D result:', result ? { result: result.result, time: result.time } : 'No result found');
        
        // If result exists but ticket status not updated, check now
        if (result && ticket.winStatus === 'pending') {
            let isWinner = false;
            let winAmount = 0;
            
            // Check each number in the ticket
            for (const num of ticket.numbers) {
                if (result.result === num.number.toString()) {
                    isWinner = true;
                    // User pays 2 points per quantity, wins 180 points per quantity (90x multiplier)
                    winAmount += num.quantity * 180;
                }
            }
            
            // Update ticket status - use 'loss' not 'lost'
            ticket.winStatus = isWinner ? 'won' : 'loss';
            if (isWinner) {
                ticket.winAmount = winAmount;
            }
            await ticket.save();
        }
        
        // Return ticket status
        if (ticket.winStatus === 'won') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'won',
                winAmount: ticket.winAmount,
                message: `Congratulations! You won ${ticket.winAmount} points!`
            });
        } else if (ticket.winStatus === 'loss') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'lost',
                message: 'Sorry, this ticket did not win'
            });
        } else {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'pending',
                message: 'Result pending for this draw time'
            });
        }
        
    } catch (error) {
        console.error('Error checking 2D ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Check 100D ticket by barcode
router.get('/100d/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        
        // Find ticket by barcode
        const ticket = await Ticket100D.findOne({ barcodeNumber: barcode });
        
        if (!ticket) {
            return res.json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        // Check if ticket is cancelled
        if (ticket.status === 'cancelled') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'cancelled',
                message: 'This ticket has been cancelled'
            });
        }
        
        // Check if result exists for this draw
        console.log('Checking 100D ticket:', {
            barcode: ticket.barcodeNumber,
            drawDate: ticket.drawDate,
            drawTime: ticket.drawTime,
            winStatus: ticket.winStatus,
            numbers: ticket.numbers.map(n => n.number)
        });
        
        let results = await LotteryResult100D.find({
            drawDate: ticket.drawDate,
            drawTime: ticket.drawTime
        });
        
        // If no exact match, try to find by date and similar time
        if (results.length === 0) {
            // Try matching just the date and checking all results for that date
            const allResultsForDate = await LotteryResult100D.find({
                drawDate: ticket.drawDate
            });
            
            // Try to match time more flexibly (e.g., "11:15:00 AM" vs "11:15")
            const ticketTime = ticket.drawTime.replace(/:\d{2}\s*(AM|PM)?$/i, '').trim(); // Remove seconds
            results = allResultsForDate.filter(r => {
                const resultTime = r.drawTime.replace(/:\d{2}\s*(AM|PM)?$/i, '').trim();
                return resultTime === ticketTime || r.drawTime === ticket.drawTime;
            });
            
            console.log('Flexible time match found:', results.length, 'results');
        }
        
        console.log('Found 100D results:', results.length, results.length > 0 ? results.slice(0, 5).map(r => ({ winningNumber: r.winningNumber, drawTime: r.drawTime })) : 'No results found');
        
        // If result exists but ticket status not updated, check now
        if (results.length > 0 && ticket.winStatus === 'pending') {
            let isWinner = false;
            let winAmount = 0;
            
            // Check each number in the ticket against all results
            for (const num of ticket.numbers) {
                for (const result of results) {
                    if (result.winningNumber === parseInt(num.number)) {
                        isWinner = true;
                        // User pays 2 points per quantity, wins 180 points per quantity (90x multiplier)
                        winAmount += num.quantity * 180;
                    }
                }
            }
            
            // Update ticket status - use 'loss' not 'lost'
            ticket.winStatus = isWinner ? 'won' : 'loss';
            if (isWinner) {
                ticket.winAmount = winAmount;
            }
            await ticket.save();
            
            console.log('Updated 100D ticket status:', { winStatus: ticket.winStatus, winAmount: ticket.winAmount });
        }
        
        // Return ticket status
        if (ticket.winStatus === 'won') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'won',
                winAmount: ticket.winAmount,
                message: `Congratulations! You won ${ticket.winAmount} points!`
            });
        } else if (ticket.winStatus === 'loss') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'lost',
                message: 'Sorry, this ticket did not win'
            });
        } else {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'pending',
                message: 'Result pending for this draw time'
            });
        }
        
    } catch (error) {
        console.error('Error checking 100D ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Check 12D ticket by barcode
router.get('/12d/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        
        // Find ticket by barcode
        const ticket = await Ticket12D.findOne({ barcodeNumber: barcode });
        
        if (!ticket) {
            return res.json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        // Check if ticket is cancelled
        if (ticket.status === 'cancelled') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'cancelled',
                message: 'This ticket has been cancelled'
            });
        }
        
        // Check if result exists for this draw
        const result = await LotteryResult12D.findOne({
            drawDate: ticket.drawDate,
            drawTime: ticket.drawTime
        });
        
        // If result exists but ticket status not updated, check now
        if (result && ticket.winStatus === 'pending') {
            let isWinner = false;
            let winAmount = 0;
            
            // Check each selection in the ticket
            for (const selection of ticket.selections) {
                if (result.result === selection.image) {
                    isWinner = true;
                    winAmount += selection.quantity * 10; // 12D win is 10x
                }
            }
            
            // Update ticket status - use 'loss' not 'lost'
            ticket.winStatus = isWinner ? 'won' : 'loss';
            if (isWinner) {
                ticket.winAmount = winAmount;
            }
            await ticket.save();
        }
        
        // Return ticket status
        if (ticket.winStatus === 'won') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'won',
                winAmount: ticket.winAmount,
                message: `Congratulations! You won ${ticket.winAmount} points!`
            });
        } else if (ticket.winStatus === 'loss') {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'lost',
                message: 'Sorry, this ticket did not win'
            });
        } else {
            return res.json({
                success: true,
                ticket: ticket,
                status: 'pending',
                message: 'Result pending for this draw time'
            });
        }
        
    } catch (error) {
        console.error('Error checking 12D ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
