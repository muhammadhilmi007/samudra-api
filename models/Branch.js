const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  namaCabang: {
    type: String,
    required: [true, 'Nama cabang harus diisi'],
    trim: true,
    unique: true
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
      default: ''
    },
    telepon: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: '',
      validate: {
        validator: function(v) {
          // Validasi email hanya jika ada nilainya
          if (!v) return true;
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Format email tidak valid'
      }
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
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual untuk menampilkan alamat lengkap
BranchSchema.virtual('alamatLengkap').get(function() {
  return `${this.alamat}, ${this.kelurahan}, ${this.kecamatan}, ${this.kota}, ${this.provinsi}`;
});

// Update updatedAt pada update
BranchSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Middleware untuk validasi custom
BranchSchema.pre('validate', function(next) {
  // Pastikan kontakPenanggungJawab ada
  if (!this.kontakPenanggungJawab) {
    this.kontakPenanggungJawab = {
      nama: '',
      telepon: '',
      email: ''
    };
  }
  
  // Validasi email hanya jika tidak kosong
  if (this.kontakPenanggungJawab.email === '') {
    // Skip validasi email jika kosong
    this.kontakPenanggungJawab.email = '';
  }
  
  next();
});

module.exports = mongoose.model('Branch', BranchSchema);