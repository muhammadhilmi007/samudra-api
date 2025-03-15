const mongoose = require('mongoose');

const BankStatementSchema = new mongoose.Schema({
  tanggal: {
    type: Date,
    required: [true, 'Tanggal harus diisi'],
    default: Date.now
  },
  bank: {
    type: String,
    required: [true, 'Nama bank harus diisi']
  },
  noRekening: {
    type: String,
    required: [true, 'Nomor rekening harus diisi']
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
    enum: ['VALIDATED', 'UNVALIDATED'],
    default: 'UNVALIDATED'
  },
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
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
BankStatementSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Calculate saldo before save
BankStatementSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      // Get previous saldo for this bank, rekening and cabang
      const lastStatement = await this.constructor.findOne({
        bank: this.bank,
        noRekening: this.noRekening,
        cabangId: this.cabangId
      }).sort({ tanggal: -1, createdAt: -1 });
      
      let previousSaldo = 0;
      
      if (lastStatement) {
        previousSaldo = lastStatement.saldo;
      }
      
      // Calculate new saldo
      this.saldo = previousSaldo + this.debet - this.kredit;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('BankStatement', BankStatementSchema);