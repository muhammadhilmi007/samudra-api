const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  namaAset: {
    type: String,
    required: [true, 'Nama aset harus diisi'],
    trim: true
  },
  tipeAset: {
    type: String,
    required: [true, 'Tipe aset harus diisi']
  },
  tanggalPembelian: {
    type: Date,
    required: [true, 'Tanggal pembelian harus diisi']
  },
  nilaiPembelian: {
    type: Number,
    required: [true, 'Nilai pembelian harus diisi'],
    min: [0, 'Nilai pembelian tidak boleh negatif']
  },
  nilaiSekarang: {
    type: Number,
    required: [true, 'Nilai sekarang harus diisi'],
    min: [0, 'Nilai sekarang tidak boleh negatif']
  },
  persentasePenyusutan: {
    type: Number,
    required: [true, 'Persentase penyusutan harus diisi'],
    min: [0, 'Persentase penyusutan tidak boleh negatif'],
    max: [100, 'Persentase penyusutan tidak boleh lebih dari 100%']
  },
  statusAset: {
    type: String,
    enum: ['AKTIF', 'DIJUAL', 'RUSAK'],
    default: 'AKTIF'
  },
  lokasiAset: {
    type: String,
    required: [true, 'Lokasi aset harus diisi']
  },
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
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
AssetSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Hitung penyusutan aset
AssetSchema.methods.calculateDepreciation = function(currentDate) {
  const purchaseDate = new Date(this.tanggalPembelian);
  const now = currentDate || new Date();
  
  // Hitung usia aset dalam tahun
  const ageInYears = (now - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
  
  // Hitung faktor penyusutan berdasarkan persentase tahunan
  const depreciationFactor = Math.pow(1 - (this.persentasePenyusutan / 100), ageInYears);
  
  // Hitung nilai sekarang
  const currentValue = this.nilaiPembelian * depreciationFactor;
  
  // Nilai tidak boleh negatif
  return Math.max(0, currentValue);
};

// Update nilai sekarang otomatis sebelum save dan update
AssetSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('nilaiPembelian') || this.isModified('persentasePenyusutan') || this.isModified('tanggalPembelian')) {
    this.nilaiSekarang = this.calculateDepreciation();
  }
  next();
});

module.exports = mongoose.model('Asset', AssetSchema);