const mongoose = require('mongoose');

const gameSettingsSchema = new mongoose.Schema({
  gameType: {
    type: String,
    enum: ['2D', '3D', '12D', '100D'],
    required: true,
    unique: true
  },
  winningPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 70
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GameSettings', gameSettingsSchema);
