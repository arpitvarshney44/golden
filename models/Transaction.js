const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  loginId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['addition', 'deduction'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  performedBy: {
    type: String,
    default: 'admin'
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
