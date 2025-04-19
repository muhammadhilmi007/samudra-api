// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
  // Keep for backward compatibility but mark as deprecated
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role harus diisi']
  },
  // Keep for backward compatibility but mark as deprecated
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
UserSchema.methods.getSignedJwtToken = async function() {
  // Get all user roles for inclusion in the token
  const userRoles = await this.getRoles();
  const roleIds = userRoles.map(ur => ur.roleId._id.toString());
  const roleCodes = userRoles.map(ur => ur.roleId.kodeRole);
  
  // Get primary role
  const primaryRole = await this.getPrimaryRole();
  const primaryRoleId = primaryRole ? primaryRole._id.toString() : null;
  
  return jwt.sign(
    {
      id: this._id,
      role: this.role, // Keep for backward compatibility
      roles: roleCodes, // Add all role codes
      roleIds: roleIds, // Add all role IDs
      primaryRoleId: primaryRoleId, // Add primary role ID
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

// Method to get all user roles
UserSchema.methods.getRoles = async function() {
  const UserRole = mongoose.model('UserRole');
  return await UserRole.find({ userId: this._id }).populate('roleId');
};

// Method to get primary role
UserSchema.methods.getPrimaryRole = async function() {
  const UserRole = mongoose.model('UserRole');
  const primaryUserRole = await UserRole.findOne({
    userId: this._id,
    isPrimary: true
  }).populate('roleId');
  
  if (primaryUserRole) {
    return primaryUserRole.roleId;
  }
  
  // Fallback to legacy roleId if no primary role found
  return this.roleId;
};

// Method to get all permissions from all roles
UserSchema.methods.getAllPermissions = async function() {
  const UserRole = mongoose.model('UserRole');
  const RolePermission = mongoose.model('RolePermission');
  const Role = mongoose.model('Role');
  
  // Get all user roles
  const userRoles = await UserRole.find({ userId: this._id })
    .populate({
      path: 'roleId',
      match: { isActive: true }
    });
  
  // Filter out inactive roles and extract role IDs
  const roleIds = userRoles
    .filter(ur => ur.roleId)
    .map(ur => ur.roleId._id);
  
  // Add legacy roleId if it exists
  if (this.roleId) {
    // Check if the legacy role is active
    const legacyRole = await Role.findById(this.roleId);
    if (legacyRole && legacyRole.isActive) {
      roleIds.push(this.roleId);
    }
  }
  
  // Get all permissions for these roles
  const rolePermissions = await RolePermission.find({
    roleId: { $in: roleIds }
  }).populate({
    path: 'permissionId',
    match: { isActive: true }
  });
  
  // Extract unique permission codes
  const permissions = new Set();
  rolePermissions.forEach(rp => {
    if (rp.permissionId && rp.permissionId.code) {
      permissions.add(rp.permissionId.code);
    }
  });
  
  // Also include legacy permissions from Role model
  if (this.roleId && this.populated('roleData') && this.roleData.permissions) {
    this.roleData.permissions.forEach(p => permissions.add(p));
  } else if (this.roleId) {
    // If roleData is not populated, fetch it
    const role = await Role.findById(this.roleId);
    if (role && role.permissions) {
      role.permissions.forEach(p => permissions.add(p));
    }
  }
  
  return Array.from(permissions);
};

// Method to check if user has permission
UserSchema.methods.hasPermission = async function(permission) {
  // First try the new permission system
  const permissions = await this.getAllPermissions();
  
  // Direct permission check
  if (permissions.includes(permission)) {
    return true;
  }
  
  // Check for wildcard permissions (e.g., manage_all_*)
  const wildcardPermissions = permissions.filter(p => p.includes('_all_'));
  
  // Extract resource type from permission (e.g., 'view_employees' -> 'employees')
  const parts = permission.split('_');
  if (parts.length >= 2) {
    const action = parts[0]; // e.g., 'view'
    const resource = parts.slice(1).join('_'); // e.g., 'employees'
    
    // Check for wildcard permissions like 'manage_all_resources'
    const hasWildcardPermission = wildcardPermissions.some(wp => {
      const wpParts = wp.split('_');
      if (wpParts.length < 3) return false;
      
      const wpAction = wpParts[0]; // e.g., 'manage'
      const wpResource = wpParts.slice(2).join('_'); // e.g., 'resources'
      
      // 'manage' action includes all other actions
      const actionMatches = wpAction === 'manage' || wpAction === action;
      
      // Check if resource matches (singular/plural handling)
      let resourceMatches = false;
      if (resource.endsWith('s') && wpResource === resource) {
        resourceMatches = true;
      } else if (wpResource.endsWith('s') && wpResource === `${resource}s`) {
        resourceMatches = true;
      }
      
      return actionMatches && resourceMatches;
    });
    
    if (hasWildcardPermission) {
      return true;
    }
    
    // Check for branch-specific permissions
    if (permission.includes('_branch_') ||
        (resource.includes('branch') && !permission.includes('_all_'))) {
      const branchPermission = `${action}_branch_${resource}`;
      const managePermission = `manage_branch_${resource}`;
      
      if (permissions.includes(branchPermission) || permissions.includes(managePermission)) {
        return true;
      }
    }
  }
  
  // Fallback to legacy permission check
  if (!this.populated('roleData')) {
    await this.populate('roleData');
  }
  
  return this.roleData && this.roleData.permissions && this.roleData.permissions.includes(permission);
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