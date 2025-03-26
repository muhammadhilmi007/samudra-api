// models/User.js
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
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role harus diisi']
  },
  // Tambahkan role untuk menyimpan kode role
  role: {
    type: String,
    required: [true, 'Kode role harus diisi']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Email tidak valid'
    ],
    sparse: true
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
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populates
UserSchema.virtual('cabang', {
  ref: 'Branch',
  localField: 'cabangId',
  foreignField: '_id',
  justOne: true
});

UserSchema.virtual('roleData', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  // Set updatedAt when document is modified
  this.updatedAt = Date.now();

  // Only hash password if it was modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt on update
UserSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id }, 
    process.env.JWT_SECRET || 'samudraerp2024secretkey', 
    {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    }
  );
};

// Match password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user has permission
UserSchema.methods.hasPermission = async function(permission) {
  // Populate the role if not already populated
  await this.populate('roleData');
  
  // Check if user has the role data
  if (!this.roleData) {
    return false;
  }
  
  // Check if the user has the specified permission
  return this.roleData.permissions.includes(permission);
};

module.exports = mongoose.model('User', UserSchema);