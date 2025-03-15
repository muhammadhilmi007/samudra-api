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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt pada update
PickupSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate nomor pengambilan otomatis sebelum save
PickupSchema.pre('save', async function(next) {
  // Format: PKP-{CABANG_CODE}-{YYMMDD}-{COUNTER}
  if (this.isNew) {
    try {
      const Branch = mongoose.model('Branch');
      const branch = await Branch.findById(this.cabangId);
      
      if (!branch) {
        throw new Error('Cabang tidak ditemukan');
      }
      
      // Ambil kode cabang (3 huruf pertama)
      const branchCode = branch.namaCabang.substring(0, 3).toUpperCase();
      
      // Format tanggal YYMMDD
      const now = new Date();
      const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
      
      // Cari pickup terakhir dengan format yang sama untuk hari ini
      const lastPickup = await this.constructor.findOne({
        noPengambilan: new RegExp(`PKP-${branchCode}-${dateStr}-`)
      }).sort({ noPengambilan: -1 });
      
      let counter = 1;
      
      if (lastPickup) {
        // Extract counter dari nomor terakhir
        const lastCounter = parseInt(lastPickup.noPengambilan.split('-')[3]);
        counter = lastCounter + 1;
      }
      
      // Format counter dengan leading zeros
      const counterStr = counter.toString().padStart(4, '0');
      
      // Set nomor pengambilan
      this.noPengambilan = `PKP-${branchCode}-${dateStr}-${counterStr}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Pickup', PickupSchema);