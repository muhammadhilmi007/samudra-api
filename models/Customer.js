const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  nama: {
    type: String,
    required: [true, 'Nama pelanggan harus diisi'],
    trim: true
  },
  tipe: {
    type: String,
    enum: ['pengirim', 'penerima', 'keduanya'],
    required: [true, 'Tipe pelanggan harus diisi']
  },
  alamat: {
    type: String,
    required: [true, 'Alamat harus diisi']
  },
  kelurahan: {
    type: String,
    required: [true, 'Kelurahan harus diisi']
  },
  kecamatan: {
    type: String,
    required: [true, 'Kecamatan harus diisi']
  },
  kota: {
    type: String,
    required: [true, 'Kota harus diisi']
  },
  provinsi: {
    type: String,
    required: [true, 'Provinsi harus diisi']
  },
  telepon: {
    type: String,
    required: [true, 'Telepon harus diisi']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Email tidak valid'
    ]
  },
  perusahaan: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Pembuat data harus diisi']
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
CustomerSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Customer', CustomerSchema);