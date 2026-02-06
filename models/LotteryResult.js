const mongoose = require('mongoose');

const lotteryResultSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['2D', '3D', '12D', '100D'],
    required: true
  },
  result: {
    type: String,
    required: true
  },
  range: {
    type: String,
    enum: ['1000', '3000', '5000'],
    required: function() { return this.type === '100D'; }
  },
  block: {
    type: String,
    required: function() { return this.type === '100D'; }
  },
  date: {
    type: Date,
    default: Date.now
  },
  time: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LotteryResult', lotteryResultSchema);
