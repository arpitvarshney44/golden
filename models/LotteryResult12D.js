const mongoose = require('mongoose');

const lotteryResult12DSchema = new mongoose.Schema({
  drawDate: {
    type: Date,
    required: true
  },
  drawTime: {
    type: String,
    required: true
  },
  result: {
    type: String,
    required: true,
    enum: ['umbrella', 'book', 'basket', 'butterfly', 'bucket', 'football', 'goat', 'spinning-top', 'rose', 'sun', 'bird', 'rabbit']
  },
  resultNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  session: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for unique draw time per day
lotteryResult12DSchema.index({ drawDate: 1, drawTime: 1 }, { unique: true });

module.exports = mongoose.model('LotteryResult12D', lotteryResult12DSchema);
