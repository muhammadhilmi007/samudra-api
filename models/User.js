// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const UserSchema = new mongoose.Schema({
  nama: {
    type: String,
    required: [true, 'Nama pegawai harus diisi'],
    trim: true,
    maxlength: [100, 'Nama maksimal 100 karakter']
  },
  jabatan: {
    type: String,
    required: [true, 'Jabatan harus diisi'],
    maxlength: [50, 'Jabatan maksimal 50 karakter']
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role harus diisi']
  },
  // Kode role disimpan langsung untuk memudahkan pengecekan akses
  role: {
    type: String,
    required: [true, 'Kode role harus diisi']
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null/empty values
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Format email tidak valid'
    ],
    lowercase: true,
    trim: true
  },
  telepon: {
    type: String,
    required: [true, 'Nomor telepon harus diisi'],
    match: [
      /^(\+62|62|0)8[1-9][0-9]{6,9}$/,
      'Format nomor telepon tidak valid (contoh: 081234567890)'
    ],
    trim: true
  },
  alamat: {
    type: String,
    required: [true, 'Alamat harus diisi'],
    maxlength: [255, 'Alamat maksimal 255 karakter']
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
    minlength: [5, 'Username minimal 5 karakter'],
    maxlength: [20, 'Username maksimal 20 karakter'],
    match: [
      /^[a-zA-Z0-9_]+$/,
      'Username hanya boleh berisi huruf, angka, dan underscore'
    ],
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password harus diisi'],
    minlength: [6, 'Password minimal 6 karakter'],
    select: false // Don't return password in queries
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
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
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

// Middleware: Encrypt password before save
UserSchema.pre('save', async function(next) {
  // Set updatedAt when document is modified
  this.updatedAt = Date.now();

  // Only hash password if it was modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Set updatedAt on update
UserSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Method to generate JWT token
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      username: this.username,
      cabangId: this.cabangId
    },
    process.env.JWT_SECRET || config.jwt.secret,
    {
      expiresIn: process.env.JWT_EXPIRE || config.jwt.expire
    }
  );
};

// Method to compare passwords
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate password reset token
UserSchema.methods.getResetPasswordToken = function() {
  // Generate a random token
  const resetToken = crypto
    .randomBytes(20)
    .toString('hex');

  // Hash the token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiration (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  // Return the unhashed token (the hashed one is stored in DB)
  return resetToken;
};

// Method to check if user has permission
UserSchema.methods.hasPermission = async function(permission) {
  // Populate the role if not already populated
  if (!this.populated('roleData')) {
    await this.populate('roleData');
  }
  
  // Check if user has the specified permission
  return this.roleData && this.roleData.permissions.includes(permission);
};

// Method to check if user is active
UserSchema.methods.isActive = function() {
  return this.aktif === true;
};

// Method to check if user belongs to a specific branch
UserSchema.methods.isInBranch = function(branchId) {
  return this.cabangId.toString() === branchId.toString();
};

// Create index for faster querying
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ cabangId: 1 });
UserSchema.index({ roleId: 1 });

module.exports = mongoose.model('User', UserSchema);