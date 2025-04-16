// models/Menu.js
const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nama menu harus diisi'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Kode menu harus diisi'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[a-z0-9_]+$/.test(v);
      },
      message: 'Kode menu hanya boleh berisi huruf kecil, angka, dan underscore'
    }
  },
  path: {
    type: String,
    required: [true, 'Path menu harus diisi'],
    trim: true
  },
  icon: {
    type: String,
    default: 'circle'
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  requiredPermissions: {
    type: [String],
    default: []
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

// Virtual for child menus
MenuSchema.virtual('children', {
  ref: 'Menu',
  localField: '_id',
  foreignField: 'parentId',
  options: { sort: { order: 1 } }
});

// Update updatedAt on update
MenuSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Method to check if user has access to this menu
MenuSchema.methods.isAccessibleBy = function(userPermissions) {
  // If no permissions required, menu is accessible
  if (!this.requiredPermissions || this.requiredPermissions.length === 0) {
    return true;
  }
  
  // Check if user has any of the required permissions
  return this.requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
};

module.exports = mongoose.model('Menu', MenuSchema);