// models/STTTracking.js
const mongoose = require('mongoose');

const STTTrackingSchema = new mongoose.Schema({
  sttId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT',
    required: [true, 'STT ID harus diisi']
  },
  status: {
    type: String,
    enum: ['PENDING', 'MUAT', 'TRANSIT', 'LANSIR', 'TERKIRIM', 'RETURN'],
    required: [true, 'Status harus diisi']
  },
  location: {
    type: String,
    required: [true, 'Lokasi harus diisi']
  },
  notes: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID harus diisi']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for efficient querying
STTTrackingSchema.index({ sttId: 1 });
STTTrackingSchema.index({ createdAt: 1 });
STTTrackingSchema.index({ status: 1 });

module.exports = mongoose.model('STTTracking', STTTrackingSchema);