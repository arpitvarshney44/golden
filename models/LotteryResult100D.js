const mongoose = require('mongoose');

const lotteryResult100DSchema = new mongoose.Schema({
    drawDate: {
        type: Date,
        required: true
    },
    drawTime: {
        type: String,
        required: true
    },
    winningNumber: {
        type: Number,
        required: true,
        min: 0,
        max: 9999
    },
    range: {
        type: String,
        required: true
    },
    blockNumber: {
        type: Number,
        required: true
    },
    gameType: {
        type: String,
        default: '100D'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
lotteryResult100DSchema.index({ drawDate: 1, drawTime: 1 });
lotteryResult100DSchema.index({ winningNumber: 1 });

module.exports = mongoose.model('LotteryResult100D', lotteryResult100DSchema);
