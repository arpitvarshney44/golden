const mongoose = require('mongoose');

const lotteryResult3DSchema = new mongoose.Schema({
  drawDate: {
    type: Date,
    required: true
  },
  drawTime: {
    type: String,
    required: true
  },
  resultA: {
    type: String,
    required: true,
    match: /^[0-9]{3}$/  // Must be exactly 3 digits
  },
  resultB: {
    type: String,
    required: true,
    match: /^[0-9]{3}$/  // Must be exactly 3 digits
  },
  resultC: {
    type: String,
    required: true,
    match: /^[0-9]{3}$/  // Must be exactly 3 digits
  },
  gameType: {
    type: String,
    default: '3D'
  },
  session: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
lotteryResult3DSchema.index({ drawDate: 1, drawTime: 1 });
lotteryResult3DSchema.index({ drawDate: 1, session: 1 });

module.exports = mongoose.model('LotteryResult3D', lotteryResult3DSchema);
