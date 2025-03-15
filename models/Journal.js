const mongoose = require('mongoose');

const JournalSchema = new mongoose.Schema({
  tanggal: {
    type: Date,
    required: [true, 'Tanggal harus diisi'],
    default: Date.now
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Akun harus diisi']
  },
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
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
  tipe: {
    type: String,
    enum: ['Lokal', 'Pusat'],
    required: [true, 'Tipe jurnal harus diisi']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User harus diisi']
  },
  sttIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT'
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'FINAL'],
    default: 'DRAFT'
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
JournalSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Validation: a journal entry should have either debet or kredit, not both or none
JournalSchema.pre('save', function(next) {
  if ((this.debet > 0 && this.kredit > 0) || (this.debet === 0 && this.kredit === 0)) {
    return next(new Error('Jurnal harus memiliki nilai debet atau kredit, tidak keduanya atau tidak ada'));
  }
  next();
});

module.exports = mongoose.model('Journal', JournalSchema);