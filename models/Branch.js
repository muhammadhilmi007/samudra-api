const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  namaCabang: {
    type: String,
    required: [true, 'Nama cabang harus diisi'],
    trim: true
  },
  divisiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Division',
    required: [true, 'Divisi harus diisi']
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
  kontakPenanggungJawab: {
    nama: {
      type: String,
      required: [true, 'Nama penanggung jawab harus diisi']
    },
    telepon: {
      type: String,
      required: [true, 'Telepon penanggung jawab harus diisi']
    },
    email: {
      type: String
    }
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
BranchSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Branch', BranchSchema);