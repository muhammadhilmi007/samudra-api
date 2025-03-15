const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  nama: {
    type: String,
    required: [true, 'Nama pegawai harus diisi'],
    trim: true
  },
  jabatan: {
    type: String,
    required: [true, 'Jabatan harus diisi']
  },
  role: {
    type: String,
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
    ],
    required: [true, 'Role harus diisi']
  },
  email: {
    type: String,
    required: [true, 'Email harus diisi'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Email tidak valid'
    ]
  },
  telepon: {
    type: String,
    required: [true, 'Nomor telepon harus diisi']
  },
  alamat: {
    type: String,
    required: [true, 'Alamat harus diisi']
  },
  fotoProfil: {
    type: String,
    default: 'default.jpg'
  },
  dokumen: {
    ktp: String,
    npwp: String,
    lainnya: [String]
  },
  username: {
    type: String,
    required: [true, 'Username harus diisi'],
    unique: true,
    minlength: [3, 'Username minimal 3 karakter']
  },
  password: {
    type: String,
    required: [true, 'Password harus diisi'],
    minlength: [6, 'Password minimal 6 karakter'],
    select: false
  },
  cabangId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Cabang harus diisi']
  },
  aktif: {
    type: Boolean,
    default: true
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

// Enkripsi password menggunakan bcrypt
UserSchema.pre('save', async function(next) {
  // Hanya hash password jika field dimodifikasi
  if (!this.isModified('password')) {
    next();
  }

  // Set updatedAt when document is modified
  this.updatedAt = Date.now();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Update updatedAt pada update
UserSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Sign JWT dan return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);