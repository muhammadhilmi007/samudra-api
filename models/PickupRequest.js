// models/PickupRequest.js
const mongoose = require('mongoose');
const { formatNumber, getReverseDateString } = require('../utils/helpers');

const PickupRequestSchema = new mongoose.Schema({
  // Generate sequential request number
  noRequest: {
    type: String,
    unique: true,
    sparse: true
  },
  tanggal: {
    type: Date,
    required: [true, 'Tanggal harus diisi'],
    default: Date.now
  },
  pengirimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Pengirim harus diisi']
  },
  alamatPengambilan: {
    type: String,
    required: [true, 'Alamat pengambilan harus diisi']
  },
  tujuan: {
    type: String,
    required: [true, 'Tujuan harus diisi']
  },
  jumlahColly: {
    type: Number,
    required: [true, 'Jumlah colly harus diisi'],
    min: [1, 'Jumlah colly minimal 1']
  },
  estimasiPengambilan: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User harus diisi']
  },
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
  },
  status: {
    type: String,
    enum: ['PENDING', 'FINISH', 'CANCELLED'],
    default: 'PENDING'
  },
  pickupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pickup',
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on update
PickupRequestSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate request number before saving
PickupRequestSchema.pre('save', async function(next) {
  try {
    // Only generate noRequest if it doesn't exist
    if (!this.noRequest) {
      const PickupRequest = this.constructor;
      // Get the latest request
      const latestRequest = await PickupRequest.findOne({}, { noRequest: 1 })
        .sort({ createdAt: -1 })
        .limit(1);
      
      const today = new Date();
      const dateString = getReverseDateString();
      
      // Format: REQ-DDMMYY-0001
      let sequence = 1;
      if (latestRequest && latestRequest.noRequest) {
        // Extract sequence from the latest request
        const parts = latestRequest.noRequest.split('-');
        if (parts.length === 3) {
          const latestDate = parts[1];
          const latestSequence = parseInt(parts[2] || '0');
          
          if (latestDate === dateString) {
            sequence = latestSequence + 1;
          }
        }
      }
      
      this.noRequest = `REQ-${dateString}-${formatNumber(sequence, 4)}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Create indexes for efficient querying
PickupRequestSchema.index({ tanggal: -1 });
PickupRequestSchema.index({ pengirimId: 1 });
PickupRequestSchema.index({ cabangId: 1 });
PickupRequestSchema.index({ userId: 1 });
PickupRequestSchema.index({ status: 1 });
PickupRequestSchema.index({ noRequest: 1 });
PickupRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PickupRequest', PickupRequestSchema);