const mongoose = require('mongoose');

const PendingPackageSchema = new mongoose.Schema({
  sttId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STT',
    required: [true, 'STT harus diisi']
  },
  cabangAsalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang asal harus diisi']
  },
  cabangTujuanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang tujuan harus diisi']
  },
  alasanPending: {
    type: String,
    required: [true, 'Alasan pending harus diisi']
  },
  action: {
    type: String,
    required: [true, 'Tindakan harus diisi']
  },
  status: {
    type: String,
    enum: ['PENDING', 'RESOLVED'],
    default: 'PENDING'
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
PendingPackageSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('PendingPackage', PendingPackageSchema);