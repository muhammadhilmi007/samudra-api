const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  namaRole: {
    type: String,
    required: [true, 'Nama role harus diisi'],
    unique: true,
    trim: true
  },
  kodeRole: {
    type: String,
    required: [true, 'Kode role harus diisi'],
    unique: true,
    enum: [
      'direktur',
      'manajer_admin',
      'manajer_keuangan',
      'manajer_pemasaran',
      'manajer_operasional',
      'manajer_sdm',
      'manajer_distribusi',
      'kepala_cabang',
      'kepala_gudang',
      'staff_admin',
      'staff_penjualan',
      'kasir',
      'debt_collector',
      'checker',
      'supir',
      'pelanggan'
    ]
  },
  permissions: {
    type: [String],
    required: true
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
RoleSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Role', RoleSchema);