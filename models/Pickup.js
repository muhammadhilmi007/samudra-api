// models/Pickup.js - Improved pickup model
const mongoose = require('mongoose');

const PickupSchema = new mongoose.Schema({
  // Basic information
  tanggal: {
    type: Date,
    required: [true, 'Tanggal harus diisi'],
    default: Date.now
  },
  noPengambilan: {
    type: String,
    required: [true, 'Nomor pengambilan harus diisi'],
    unique: true,
    trim: true
  },
  pengirimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Pengirim harus diisi']
  },
  alamatPengambilan: {
    type: String,
    required: [true, 'Alamat pengambilan harus diisi'],
    trim: true
  },
  tujuan: {
    type: String,
    required: [true, 'Tujuan harus diisi'],
    trim: true
  },
  jumlahColly: {
    type: Number,
    required: [true, 'Jumlah colly harus diisi'],
    min: [1, 'Jumlah colly minimal 1']
  },
  estimasiPengambilan: {
    type: String,
    trim: true
  },
  
  // Related documents
  sttIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT'
  }],
  
  // Personnel information
  supirId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Supir harus diisi']
  },
  kenekId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Vehicle information
  kendaraanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Kendaraan harus diisi']
  },
  
  // Timestamps
  waktuBerangkat: {
    type: Date
  },
  waktuPulang: {
    type: Date
  },
  
  // Status information
  status: {
    type: String,
    enum: ['PENDING', 'BERANGKAT', 'SELESAI', 'CANCELLED'],
    default: 'PENDING'
  },
  notes: {
    type: String,
    trim: true
  },
  
  // Administrative information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User pembuat harus diisi']
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
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on every update
PickupSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate pickup number automatically before save
PickupSchema.pre('save', async function(next) {
  try {
    // Only generate pickup number for new documents
    if (this.isNew) {
      const Branch = mongoose.model('Branch');
      const branch = await Branch.findById(this.cabangId);
      
      if (!branch) {
        throw new Error('Cabang tidak ditemukan');
      }
      
      // Get branch code (first 3 letters)
      const branchCode = branch.namaCabang.substring(0, 3).toUpperCase();
      
      // Format date YYMMDD
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const dateStr = `${day}${month}${year}`;
      
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
    }
    
    // If status is changed to BERANGKAT, set waktuBerangkat
    if (this.isModified('status') && this.status === 'BERANGKAT' && !this.waktuBerangkat) {
      this.waktuBerangkat = new Date();
    }
    
    // If status is changed to SELESAI, set waktuPulang
    if (this.isModified('status') && this.status === 'SELESAI' && !this.waktuPulang) {
      this.waktuPulang = new Date();
    }
    
    // If this pickup is created from a request, update the request
    if (this.isNew && this.requestId) {
      const PickupRequest = mongoose.model('PickupRequest');
      await PickupRequest.findByIdAndUpdate(
        this.requestId,
        { 
          status: 'FINISH',
          pickupId: this._id
        }
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Create virtual for status display text
PickupSchema.virtual('statusText').get(function() {
  const statusMap = {
    'PENDING': 'Menunggu',
    'BERANGKAT': 'Berangkat',
    'SELESAI': 'Selesai',
    'CANCELLED': 'Dibatalkan'
  };
  
  return statusMap[this.status] || this.status;
});

// Create virtual for formatted date
PickupSchema.virtual('tanggalFormatted').get(function() {
  return this.tanggal ? new Date(this.tanggal).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }) : '';
});

// Create indexes for efficient querying
PickupSchema.index({ noPengambilan: 1 });
PickupSchema.index({ pengirimId: 1 });
PickupSchema.index({ supirId: 1 });
PickupSchema.index({ cabangId: 1 });
PickupSchema.index({ status: 1 });
PickupSchema.index({ tanggal: -1 });
PickupSchema.index({ createdAt: -1 });

// Make virtuals available when converting to JSON or Object
PickupSchema.set('toJSON', { virtuals: true });
PickupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Pickup', PickupSchema);