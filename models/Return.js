const mongoose = require('mongoose');

const ReturnSchema = new mongoose.Schema({
  idRetur: {
    type: String,
    required: [true, 'ID Retur harus diisi'],
    unique: true
  },
  sttIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT',
    required: [true, 'STT harus diisi']
  }],
  tanggalKirim: {
    type: Date
  },
  tanggalSampai: {
    type: Date
  },
  tandaTerima: {
    type: String
  },
  status: {
    type: String,
    enum: ['PROSES', 'SAMPAI'],
    default: 'PROSES'
  },
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Pembuat harus diisi']
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
ReturnSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate ID Retur otomatis sebelum save
ReturnSchema.pre('save', async function(next) {
  // Format: RT-{CABANG_CODE}-{YYMMDD}-{COUNTER}
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
      
      // Cari retur terakhir dengan format yang sama untuk hari ini
      const lastReturn = await this.constructor.findOne({
        idRetur: new RegExp(`RT-${branchCode}-${dateStr}-`)
      }).sort({ idRetur: -1 });
      
      let counter = 1;
      
      if (lastReturn) {
        // Extract counter dari nomor terakhir
        const lastCounter = parseInt(lastReturn.idRetur.split('-')[3]);
        counter = lastCounter + 1;
      }
      
      // Format counter dengan leading zeros
      const counterStr = counter.toString().padStart(4, '0');
      
      // Set ID Retur
      this.idRetur = `RT-${branchCode}-${dateStr}-${counterStr}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Return', ReturnSchema);