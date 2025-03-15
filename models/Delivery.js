const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
  idLansir: {
    type: String,
    required: [true, 'ID Lansir harus diisi'],
    unique: true
  },
  sttIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT',
    required: [true, 'STT harus diisi']
  }],
  antrianKendaraanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleQueue',
    required: [true, 'Antrian kendaraan harus diisi']
  },
  checkerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Checker harus diisi']
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin harus diisi']
  },
  berangkat: {
    type: Date
  },
  sampai: {
    type: Date
  },
  estimasiLansir: {
    type: String
  },
  kilometerBerangkat: {
    type: Number
  },
  kilometerPulang: {
    type: Number
  },
  namaPenerima: {
    type: String
  },
  keterangan: {
    type: String
  },
  status: {
    type: String,
    enum: ['LANSIR', 'TERKIRIM', 'BELUM SELESAI'],
    default: 'LANSIR'
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
DeliverySchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate ID Lansir otomatis sebelum save
DeliverySchema.pre('save', async function(next) {
  // Format: LN-{CABANG_CODE}-{YYMMDD}-{COUNTER}
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
      
      // Cari lansir terakhir dengan format yang sama untuk hari ini
      const lastDelivery = await this.constructor.findOne({
        idLansir: new RegExp(`LN-${branchCode}-${dateStr}-`)
      }).sort({ idLansir: -1 });
      
      let counter = 1;
      
      if (lastDelivery) {
        // Extract counter dari nomor terakhir
        const lastCounter = parseInt(lastDelivery.idLansir.split('-')[3]);
        counter = lastCounter + 1;
      }
      
      // Format counter dengan leading zeros
      const counterStr = counter.toString().padStart(4, '0');
      
      // Set ID Lansir
      this.idLansir = `LN-${branchCode}-${dateStr}-${counterStr}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Delivery', DeliverySchema);