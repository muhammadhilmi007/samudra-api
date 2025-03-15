const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  noPolisi: {
    type: String,
    required: [true, 'Nomor polisi harus diisi'],
    unique: true,
    trim: true
  },
  namaKendaraan: {
    type: String,
    required: [true, 'Nama kendaraan harus diisi']
  },
  supirId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  noTeleponSupir: {
    type: String
  },
  noKTPSupir: {
    type: String
  },
  fotoKTPSupir: {
    type: String
  },
  fotoSupir: {
    type: String
  },
  alamatSupir: {
    type: String
  },
  kenekId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  noTeleponKenek: {
    type: String
  },
  noKTPKenek: {
    type: String
  },
  fotoKTPKenek: {
    type: String
  },
  fotoKenek: {
    type: String
  },
  alamatKenek: {
    type: String
  },
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
  },
  tipe: {
    type: String,
    enum: ['lansir', 'antar_cabang'],
    required: [true, 'Tipe kendaraan harus diisi']
  },
  grup: {
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
VehicleSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Vehicle', VehicleSchema);