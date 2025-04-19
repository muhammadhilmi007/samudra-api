// models/Role.js
const mongoose = require('mongoose');

// Define available permissions
const AVAILABLE_PERMISSIONS = [
  // Dashboard
  'view_dashboard',
  
  // User management
  'manage_employees',
  'manage_branch_employees',
  'view_employees',
  'create_employee',
  'edit_employee',
  'delete_employee',
  
  // Branch & Division management
  'manage_branches',
  'manage_divisions',
  'view_branches',
  'view_divisions',
  'create_branch',
  'edit_branch',
  'delete_branch',
  
  // Role management
  'manage_roles',
  'view_roles',
  'create_role',
  'edit_role',
  'delete_role',
  
  // Customer management
  'manage_customers',
  'view_customers',
  'view_branch_customers',
  'create_customers',
  'create_branch_customers',
  'edit_customers',
  'delete_customers',
  
  // Reports
  'view_reports',
  'view_branch_reports',
  'export_reports',
  
  // Finances
  'manage_finances',
  'view_finances',
  'view_branch_finances',
  'manage_branch_transactions',
  
  // Vehicles
  'manage_vehicles',
  'view_vehicles',
  'view_branch_vehicles',
  'create_vehicle',
  'edit_vehicle',
  'delete_vehicle',
  
  // STT management
  'view_stt',
  'view_branch_stt',
  'create_stt',
  'create_branch_stt',
  'edit_stt',
  'edit_branch_stt',
  'delete_stt',
  'update_branch_stt_status',
  
  // Loadings
  'manage_loadings',
  'manage_branch_loadings',
  'view_branch_loadings',
  
  // Deliveries
  'manage_deliveries',
  'manage_branch_deliveries',
  'view_branch_deliveries',
  'view_assigned_deliveries',
  'update_delivery_status',
  
  // Returns
  'manage_returns',
  'manage_branch_returns',
  
  // Pickups
  'manage_pickups',
  'manage_branch_pickups',
  
  // Collections
  'manage_collections',
  'manage_branch_collections',
  'view_collections',
  
  // Truck Queues
  'manage_truck_queues',
  'manage_branch_truck_queues',
  'view_truck_queues',
  
  // Menu management
  'manage_menus',
  'view_menus',
  'create_menu',
  'edit_menu',
  'delete_menu',
  
  // Permission management
  'manage_permissions',
  'view_permissions',
  
  // Menu Access management
  'manage_menu_access',
  'view_menu_access'
];

const RoleSchema = new mongoose.Schema({
  namaRole: {
    type: String,
    required: [true, 'Nama role harus diisi'],
    unique: true,
    trim: true
  },
  kodeRole: {
    type: String,
    required: [true, 'Kode role harus diisi'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[a-z0-9_]+$/.test(v);
      },
      message: 'Kode role hanya boleh berisi huruf kecil, angka, dan underscore'
    }
  },
  deskripsi: {
    type: String,
    trim: true
  },
  // Keep for backward compatibility
  permissions: {
    type: [String],
    required: true,
    default: [],
    validate: {
      validator: function(values) {
        return values.every(value => AVAILABLE_PERMISSIONS.includes(value));
      },
      message: 'Permission yang diberikan tidak valid'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false,
    description: 'Indicates if this is a system role that cannot be deleted'
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

// Virtual for role permissions (new system)
RoleSchema.virtual('rolePermissions', {
  ref: 'RolePermission',
  localField: '_id',
  foreignField: 'roleId'
});

// Method to check if role has permission (supports both systems)
RoleSchema.methods.hasPermission = async function(permission) {
  // First check legacy permissions array
  if (this.permissions.includes(permission)) {
    return true;
  }
  
  // Then check new permission system
  if (!this.populated('rolePermissions')) {
    await this.populate({
      path: 'rolePermissions',
      populate: {
        path: 'permissionId'
      }
    });
  }
  
  return this.rolePermissions.some(rp =>
    rp.permissionId && rp.permissionId.code === permission
  );
};

// Method to get all permissions (from both systems)
RoleSchema.methods.getAllPermissions = async function() {
  // Start with legacy permissions
  const permissions = new Set(this.permissions);
  
  // Add permissions from new system
  if (!this.populated('rolePermissions')) {
    await this.populate({
      path: 'rolePermissions',
      populate: {
        path: 'permissionId'
      }
    });
  }
  
  this.rolePermissions.forEach(rp => {
    if (rp.permissionId && rp.permissionId.code) {
      permissions.add(rp.permissionId.code);
    }
  });
  
  return Array.from(permissions);
};

// Update updatedAt on update
RoleSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Export the available permissions as a static property
RoleSchema.statics.AVAILABLE_PERMISSIONS = AVAILABLE_PERMISSIONS;

module.exports = mongoose.model('Role', RoleSchema);