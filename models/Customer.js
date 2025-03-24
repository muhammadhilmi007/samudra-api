// models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  nama: {
    type: String,
    required: [true, 'Nama pelanggan harus diisi'],
    trim: true
  },
  tipe: {
    type: String,
    enum: {
      values: ['pengirim', 'penerima', 'keduanya'],
      message: '{VALUE} bukan tipe pelanggan yang valid (pengirim/penerima/keduanya)'
    },
    required: [true, 'Tipe pelanggan harus diisi'],
    lowercase: true, // Ensure consistency for types
    set: v => v.toLowerCase() // Additional safety for case normalization
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

// Create index for efficient querying
CustomerSchema.index({ nama: 1 });
CustomerSchema.index({ telepon: 1 });
CustomerSchema.index({ cabangId: 1 });
CustomerSchema.index({ tipe: 1 });
CustomerSchema.index({ createdAt: -1 });

// Update updatedAt on update
CustomerSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Virtual for full address
CustomerSchema.virtual('alamatLengkap').get(function() {
  return `${this.alamat}, ${this.kelurahan}, ${this.kecamatan}, ${this.kota}, ${this.provinsi}`;
});

// Ensure virtuals are included when converting to JSON
CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Customer', CustomerSchema);