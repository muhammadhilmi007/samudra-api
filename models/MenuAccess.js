// models/MenuAccess.js
const mongoose = require('mongoose');

const MenuAccessSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role harus diisi']
  },
  menuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: [true, 'Menu harus diisi']
  },
  canView: {
    type: Boolean,
    default: true
  },
  canCreate: {
    type: Boolean,
    default: false
  },
  canEdit: {
    type: Boolean,
    default: false
  },
  canDelete: {
    type: Boolean,
    default: false
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

// Compound index to ensure unique role-menu combinations
MenuAccessSchema.index({ roleId: 1, menuId: 1 }, { unique: true });

// Update updatedAt on update
MenuAccessSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Virtual for role data
MenuAccessSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleId',
  foreignField: '_id',
  justOne: true
});

// Virtual for menu data
MenuAccessSchema.virtual('menu', {
  ref: 'Menu',
  localField: 'menuId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('MenuAccess', MenuAccessSchema);