const mongoose = require('mongoose');

const PickupRequestSchema = new mongoose.Schema({
  tanggal: {
    type: Date,
    required: [true, 'Tanggal harus diisi'],
    default: Date.now
  },
  pengirimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Pengirim harus diisi']
  },
  alamatPengambilan: {
    type: String,
    required: [true, 'Alamat pengambilan harus diisi']
  },
  tujuan: {
    type: String,
    required: [true, 'Tujuan harus diisi']
  },
  jumlahColly: {
    type: Number,
    required: [true, 'Jumlah colly harus diisi'],
    min: [1, 'Jumlah colly minimal 1']
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
  status: {
    type: String,
    enum: ['PENDING', 'FINISH'],
    default: 'PENDING'
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
PickupRequestSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('PickupRequest', PickupRequestSchema);