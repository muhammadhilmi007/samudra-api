const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
  noPenagihan: {
    type: String,
    required: [true, 'Nomor penagihan harus diisi'],
    unique: true
  },
  pelangganId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Pelanggan harus diisi']
  },
  tipePelanggan: {
    type: String,
    enum: ['Pengirim', 'Penerima'],
    required: [true, 'Tipe pelanggan harus diisi']
  },
  sttIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT',
    required: [true, 'STT harus diisi']
  }],
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
  },
  overdue: {
    type: Boolean,
    default: false
  },
  tanggalBayar: {
    type: Date
  },
  jumlahBayarTermin: [{
    termin: Number,
    tanggal: Date,
    jumlah: Number
  }],
  status: {
    type: String,
    enum: ['LUNAS', 'BELUM LUNAS'],
    default: 'BELUM LUNAS'
  },
  totalTagihan: {
    type: Number,
    required: [true, 'Total tagihan harus diisi'],
    min: [0, 'Total tagihan tidak boleh negatif']
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
CollectionSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate nomor penagihan otomatis sebelum save
CollectionSchema.pre('save', async function(next) {
  // Format: INV-{CABANG_CODE}-{YYMMDD}-{COUNTER}
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
      
      // Cari penagihan terakhir dengan format yang sama untuk hari ini
      const lastCollection = await this.constructor.findOne({
        noPenagihan: new RegExp(`INV-${branchCode}-${dateStr}-`)
      }).sort({ noPenagihan: -1 });
      
      let counter = 1;
      
      if (lastCollection) {
        // Extract counter dari nomor terakhir
        const lastCounter = parseInt(lastCollection.noPenagihan.split('-')[3]);
        counter = lastCounter + 1;
      }
      
      // Format counter dengan leading zeros
      const counterStr = counter.toString().padStart(4, '0');
      
      // Set nomor penagihan
      this.noPenagihan = `INV-${branchCode}-${dateStr}-${counterStr}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Hitung total pembayaran termin
CollectionSchema.methods.calculateTotalPaid = function() {
  if (!this.jumlahBayarTermin || this.jumlahBayarTermin.length === 0) {
    return 0;
  }
  
  return this.jumlahBayarTermin.reduce((total, termin) => total + termin.jumlah, 0);
};

// Check if fully paid
CollectionSchema.methods.isFullyPaid = function() {
  const totalPaid = this.calculateTotalPaid();
  return totalPaid >= this.totalTagihan;
};

module.exports = mongoose.model('Collection', CollectionSchema);