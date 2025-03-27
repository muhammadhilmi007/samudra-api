// models/Vehicle.js
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
    ref: 'User',
    required: [true, 'Supir harus diisi']
  },
  noTeleponSupir: {
    type: String,
    required: [true, 'Nomor telepon supir harus diisi']
  },
  noKTPSupir: {
    type: String,
    required: [true, 'Nomor KTP supir harus diisi']
  },
  fotoKTPSupir: {
    type: String
  },
  fotoSupir: {
    type: String
  },
  alamatSupir: {
    type: String,
    required: [true, 'Alamat supir harus diisi']
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

// Update updatedAt on update
VehicleSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Virtual properties for displaying formatted type in frontend
VehicleSchema.virtual('tipeDisplay').get(function() {
  return this.tipe === 'lansir' ? 'Lansir' : 'Antar Cabang';
});

// Make virtuals available when converting to JSON
VehicleSchema.set('toJSON', { virtuals: true });
VehicleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);