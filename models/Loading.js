const mongoose = require('mongoose');

const LoadingSchema = new mongoose.Schema({
  idMuat: {
    type: String,
    required: [true, 'ID Muat harus diisi'],
    unique: true
  },
  sttIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT',
    required: [true, 'STT harus diisi']
  }],
  antrianTruckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TruckQueue',
    required: [true, 'Antrian truck harus diisi']
  },
  checkerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Checker harus diisi']
  },
  waktuBerangkat: {
    type: Date
  },
  waktuSampai: {
    type: Date
  },
  keterangan: {
    type: String
  },
  status: {
    type: String,
    enum: ['MUAT', 'BERANGKAT', 'SAMPAI'],
    default: 'MUAT'
  },
  cabangMuatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang muat harus diisi']
  },
  cabangBongkarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang bongkar harus diisi']
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
LoadingSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate ID Muat otomatis sebelum save
LoadingSchema.pre('save', async function(next) {
  // Format: MT-{CABANG_MUAT_CODE}-{YYMMDD}-{COUNTER}
  if (this.isNew) {
    try {
      const Branch = mongoose.model('Branch');
      const branch = await Branch.findById(this.cabangMuatId);
      
      if (!branch) {
        throw new Error('Cabang muat tidak ditemukan');
      }
      
      // Ambil kode cabang (3 huruf pertama)
      const branchCode = branch.namaCabang.substring(0, 3).toUpperCase();
      
      // Format tanggal YYMMDD
      const now = new Date();
      const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
      
      // Cari muat terakhir dengan format yang sama untuk hari ini
      const lastLoading = await this.constructor.findOne({
        idMuat: new RegExp(`MT-${branchCode}-${dateStr}-`)
      }).sort({ idMuat: -1 });
      
      let counter = 1;
      
      if (lastLoading) {
        // Extract counter dari nomor terakhir
        const lastCounter = parseInt(lastLoading.idMuat.split('-')[3]);
        counter = lastCounter + 1;
      }
      
      // Format counter dengan leading zeros
      const counterStr = counter.toString().padStart(4, '0');
      
      // Set ID Muat
      this.idMuat = `MT-${branchCode}-${dateStr}-${counterStr}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Loading', LoadingSchema);