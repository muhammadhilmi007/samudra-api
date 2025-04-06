// models/Pickup.js - Improve the pickup model

const mongoose = require('mongoose');

const PickupSchema = new mongoose.Schema({
  tanggal: {
    type: Date,
    required: [true, 'Tanggal harus diisi'],
    default: Date.now
  },
  noPengambilan: {
    type: String,
    required: [true, 'Nomor pengambilan harus diisi'],
    unique: true
  },
  pengirimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Pengirim harus diisi']
  },
  sttIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT'
  }],
  supirId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Supir harus diisi']
  },
  kenekId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  kendaraanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Kendaraan harus diisi']
  },
  waktuBerangkat: {
    type: Date
  },
  waktuPulang: {
    type: Date
  },
  estimasiPengambilan: {
    type: String
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
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupRequest'
  },
  status: {
    type: String,
    enum: ['PENDING', 'BERANGKAT', 'SELESAI', 'CANCELLED'],
    default: 'PENDING'
  },
  notes: {
    type: String
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
PickupSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate pickup number automatically before save
PickupSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Branch = mongoose.model('Branch');
      const branch = await Branch.findById(this.cabangId);
      
      if (!branch) {
        throw new Error('Cabang tidak ditemukan');
      }
      
      // Get branch code (first 3 letters)
      const branchCode = branch.namaCabang.substring(0, 3).toUpperCase();
      
      // Format date YYMMDD
      const now = new Date();
      const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
      
      // Find the last pickup with the same format for today
      const lastPickup = await this.constructor.findOne({
        noPengambilan: new RegExp(`PKP-${branchCode}-${dateStr}-`)
      }).sort({ noPengambilan: -1 });
      
      let counter = 1;
      
      if (lastPickup) {
        // Extract counter from last number
        const lastCounter = parseInt(lastPickup.noPengambilan.split('-')[3]);
        counter = lastCounter + 1;
      }
      
      // Format counter with leading zeros
      const counterStr = counter.toString().padStart(4, '0');
      
      // Set pickup number
      this.noPengambilan = `PKP-${branchCode}-${dateStr}-${counterStr}`;

      // If this pickup is created from a request, update the request
      if (this.requestId) {
        try {
          const PickupRequest = mongoose.model('PickupRequest');
          await PickupRequest.findByIdAndUpdate(
            this.requestId,
            { pickupId: this._id }
          );
        } catch (err) {
          console.error('Error updating pickup request:', err);
          // Continue even if updating request fails
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Pickup', PickupSchema);