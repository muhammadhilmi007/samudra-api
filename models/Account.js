const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  kodeAccount: {
    type: String,
    required: [true, 'Kode akun harus diisi'],
    unique: true,
    trim: true
  },
  namaAccount: {
    type: String,
    required: [true, 'Nama akun harus diisi'],
    trim: true
  },
  tipeAccount: {
    type: String,
    enum: ['Pendapatan', 'Biaya', 'Aset', 'Kewajiban', 'Ekuitas'],
    required: [true, 'Tipe akun harus diisi']
  },
  deskripsi: {
    type: String
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
AccountSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Account', AccountSchema);