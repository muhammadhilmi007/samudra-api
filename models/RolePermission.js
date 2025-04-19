// models/RolePermission.js
const mongoose = require('mongoose');

const RolePermissionSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role harus diisi']
  },
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: [true, 'Permission harus diisi']
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

// Compound index to ensure unique role-permission combinations
RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

// Update updatedAt on update
RolePermissionSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Virtual for role data
RolePermissionSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true
});

// Virtual for permission data
RolePermissionSchema.virtual('permission', {
  ref: 'Permission',
  localField: 'permissionId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('RolePermission', RolePermissionSchema);