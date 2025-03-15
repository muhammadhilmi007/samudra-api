const mongoose = require('mongoose');

const HeadquarterCashSchema = new mongoose.Schema({
  tanggal: {
    type: Date,
    required: [true, 'Tanggal harus diisi'],
    default: Date.now
  },
  tipeKas: {
    type: String,
    enum: ['Awal', 'Akhir', 'Kecil', 'Rekening', 'Ditangan', 'Bantuan'],
    required: [true, 'Tipe kas harus diisi']
  },
  keterangan: {
    type: String,
    required: [true, 'Keterangan harus diisi']
  },
  debet: {
    type: Number,
    default: 0,
    min: [0, 'Debet tidak boleh negatif']
  },
  kredit: {
    type: Number,
    default: 0,
    min: [0, 'Kredit tidak boleh negatif']
  },
  saldo: {
    type: Number,
    required: [true, 'Saldo harus diisi']
  },
  status: {
    type: String,
    enum: ['DRAFT', 'MERGED'],
    default: 'DRAFT'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User harus diisi']
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
HeadquarterCashSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Calculate saldo before save
HeadquarterCashSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      // Get previous saldo for this tipeKas
      const lastCash = await this.constructor.findOne({
        tipeKas: this.tipeKas
      }).sort({ tanggal: -1, createdAt: -1 });
      
      let previousSaldo = 0;
      
      if (lastCash) {
        previousSaldo = lastCash.saldo;
      }
      
      // Calculate new saldo
      this.saldo = previousSaldo + this.debet - this.kredit;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('HeadquarterCash', HeadquarterCashSchema);