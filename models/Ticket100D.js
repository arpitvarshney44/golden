const mongoose = require('mongoose');

const ticket100DSchema = new mongoose.Schema({
  serialId: {
    type: String,
    required: true,
    unique: true
  },
  barcodeNumber: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loginId: {
    type: String,
    required: true
  },
  drawDate: {
    type: Date,
    required: true
  },
  drawTime: {
    type: String,
    required: true
  },
  totalQuantity: {
    type: Number,
    required: true
  },
  totalPoints: {
    type: Number,
    required: true
  },
  numbers: [{
    number: String,
    quantity: Number
  }],
  status: {
    type: String,
    enum: ['active', 'cancelled', 'won', 'lost'],
    default: 'active'
  },
  winStatus: {
    type: String,
    enum: ['pending', 'won', 'loss'],
    default: 'pending'
  },
  winAmount: {
    type: Number,
    default: 0
  },
  claimed: {
    type: Boolean,
    default: false
  },
  claimedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ticket100D', ticket100DSchema);
