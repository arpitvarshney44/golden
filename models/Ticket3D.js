const mongoose = require('mongoose');

const ticket3DSchema = new mongoose.Schema({
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
  selectedOptions: {
    type: [String],
    required: true,
    enum: ['A', 'B', 'C'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one option (A, B, or C) must be selected'
    }
  },
  bets: [{
    playType: {
      type: String,
      required: true,
      enum: ['straight', 'box-3-way', 'box-6-way', 'front-pair', 'back-pair', 'split-pair', 'any-pair']
    },
    number: {
      type: String,
      required: true,
      match: /^[0-9X]{3}$/  // 3 digits or X
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    pointsPerBet: {
      type: Number,
      required: true,
      default: 10
    }
  }],
  totalQuantity: {
    type: Number,
    required: true
  },
  totalPoints: {
    type: Number,
    required: true
  },
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
  validUntil: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
ticket3DSchema.index({ userId: 1, createdAt: -1 });
ticket3DSchema.index({ loginId: 1, createdAt: -1 });
ticket3DSchema.index({ serialId: 1 });
ticket3DSchema.index({ barcodeNumber: 1 });
ticket3DSchema.index({ drawDate: 1, drawTime: 1 });

module.exports = mongoose.model('Ticket3D', ticket3DSchema);
