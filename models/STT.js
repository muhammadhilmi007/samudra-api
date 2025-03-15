const mongoose = require('mongoose');

const STTSchema = new mongoose.Schema({
  noSTT: {
    type: String,
    required: [true, 'Nomor STT harus diisi'],
    unique: true
  },
  cabangAsalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang asal harus diisi']
  },
  cabangTujuanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang tujuan harus diisi']
  },
  pengirimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Pengirim harus diisi']
  },
  penerimaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Penerima harus diisi']
  },
  namaBarang: {
    type: String,
    required: [true, 'Nama barang harus diisi']
  },
  komoditi: {
    type: String,
    required: [true, 'Komoditi harus diisi']
  },
  packing: {
    type: String,
    required: [true, 'Jenis packing harus diisi']
  },
  jumlahColly: {
    type: Number,
    required: [true, 'Jumlah colly harus diisi'],
    min: [1, 'Jumlah colly minimal 1']
  },
  berat: {
    type: Number,
    required: [true, 'Berat harus diisi'],
    min: [0.1, 'Berat minimal 0.1 kg']
  },
  hargaPerKilo: {
    type: Number,
    required: [true, 'Harga per kilo harus diisi'],
    min: [0, 'Harga per kilo tidak boleh negatif']
  },
  harga: {
    type: Number,
    required: [true, 'Harga harus diisi'],
    min: [0, 'Harga tidak boleh negatif']
  },
  keterangan: {
    type: String
  },
  kodePenerus: {
    type: String,
    enum: ['70', '71', '72', '73'],
    default: '70'
  },
  penerusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Forwarder'
  },
  paymentType: {
    type: String,
    enum: ['CASH', 'COD', 'CAD'],
    required: [true, 'Metode pembayaran harus diisi']
  },
  status: {
    type: String,
    enum: ['PENDING', 'MUAT', 'TRANSIT', 'LANSIR', 'TERKIRIM', 'RETURN'],
    default: 'PENDING'
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
  barcode: {
    type: String,
    required: [true, 'Barcode harus diisi']
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
STTSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Generate nomor STT dan barcode otomatis sebelum save
STTSchema.pre('save', async function(next) {
  // Format: BRN-DDMMYY-NNNN
  if (this.isNew) {
    try {
      const Branch = mongoose.model('Branch');
      const branch = await Branch.findById(this.cabangAsalId);
      
      if (!branch) {
        throw new Error('Cabang asal tidak ditemukan');
      }
      
      // Ambil kode cabang (3 huruf pertama)
      const branchCode = branch.namaCabang.substring(0, 3).toUpperCase();
      
      // Format tanggal DDMMYY
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const dateStr = `${day}${month}${year}`;
      
      // Cari STT terakhir dengan format yang sama untuk hari ini
      const lastSTT = await this.constructor.findOne({
        noSTT: new RegExp(`${branchCode}-${dateStr}-`)
      }).sort({ noSTT: -1 });
      
      let counter = 1;
      
      if (lastSTT) {
        // Extract counter dari nomor terakhir
        const lastCounter = parseInt(lastSTT.noSTT.split('-')[2]);
        counter = lastCounter + 1;
      }
      
      // Format counter dengan leading zeros
      const counterStr = counter.toString().padStart(4, '0');
      
      // Set nomor STT
      this.noSTT = `${branchCode}-${dateStr}-${counterStr}`;
      
      // Set barcode (sama dengan noSTT)
      this.barcode = this.noSTT;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('STT', STTSchema);