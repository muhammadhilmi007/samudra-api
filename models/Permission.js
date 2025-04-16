// models/Permission.js
const mongoose = require('mongoose');

// Define permission categories
const PERMISSION_CATEGORIES = [
  'dashboard',
  'user_management',
  'branch_management',
  'division_management',
  'role_management',
  'customer_management',
  'reports',
  'finances',
  'vehicles',
  'stt_management',
  'loadings',
  'deliveries',
  'returns',
  'pickups',
  'collections',
  'truck_queues',
  'menu_management'
];

const PermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nama permission harus diisi'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Kode permission harus diisi'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[a-z0-9_]+$/.test(v);
      },
      message: 'Kode permission hanya boleh berisi huruf kecil, angka, dan underscore'
    }
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Kategori permission harus diisi'],
    enum: PERMISSION_CATEGORIES
  },
  isActive: {
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

// Update updatedAt on update
PermissionSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Export the permission categories as a static property
PermissionSchema.statics.PERMISSION_CATEGORIES = PERMISSION_CATEGORIES;

module.exports = mongoose.model('Permission', PermissionSchema);