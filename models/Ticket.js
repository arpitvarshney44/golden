const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
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
  desk: {
    type: String,
    default: ''
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
  winningNumbers: [{
    type: String
  }],
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

module.exports = mongoose.model('Ticket', ticketSchema);
