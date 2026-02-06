const mongoose = require('mongoose');

const ticket12DSchema = new mongoose.Schema({
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
  selections: [{
    image: String,      // umbrella, book, basket, etc.
    quantity: Number
  }],
  status: {
    type: String,
    enum: ['active', 'cancelled', 'won', 'lost'],
    default: 'active'
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

module.exports = mongoose.model('Ticket12D', ticket12DSchema);
