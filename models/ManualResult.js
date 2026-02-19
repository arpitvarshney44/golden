const mongoose = require('mongoose');

const manualResultSchema = new mongoose.Schema({
  gameType: {
    type: String,
    required: true,
    enum: ['2D', '3D', '12D', '100D']
  },
  drawDate: {
    type: Date,
    required: true
  },
  drawTime: {
    type: String,
    required: true
  },
  result: {
    type: mongoose.Schema.Types.Mixed, // Can be string, array, or object
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  createdBy: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
});

// Index for quick lookups
manualResultSchema.index({ gameType: 1, drawDate: 1, drawTime: 1 });

module.exports = mongoose.model('ManualResult', manualResultSchema);
