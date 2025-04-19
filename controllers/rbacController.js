const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const UserRole = require('../models/UserRole');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * @desc    Get all roles
 * @route   GET /api/rbac/roles
 * @access  Private (Admin only)
 */
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ namaRole: 1 });

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get roles',
      error: error.message
    });
  }
};

/**
 * @desc    Get single role
 * @route   GET /api/rbac/roles/:id
 * @access  Private (Admin only)
 */
exports.getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Get permissions assigned to this role
    const rolePermissions = await RolePermission.find({ roleId: role._id })
      .populate('permissionId', 'name code description category isActive');

    const permissions = rolePermissions.map(rp => rp.permissionId);

    res.status(200).json({
      success: true,
      data: {
        role,
        permissions
      }
    });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get role',
      error: error.message
    });
  }
};

/**
 * @desc    Create new role
 * @route   POST /api/rbac/roles
 * @access  Private (Admin only)
 */
exports.createRole = async (req, res) => {
  try {
    const { namaRole, kodeRole, description, isActive = true, permissions = [] } = req.body;

    // Check if role code already exists
    const existingRole = await Role.findOne({ kodeRole });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role code already exists'
      });
    }

    // Create role
    const role = await Role.create({
      namaRole,
      kodeRole,
      description,
      isActive
    });

    // Assign permissions to role
    if (permissions.length > 0) {
      const rolePermissions = permissions.map(permissionId => ({
        roleId: role._id,
        permissionId
      }));

      await RolePermission.insertMany(rolePermissions);
    }

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
};

/**
 * @desc    Update role
 * @route   PUT /api/rbac/roles/:id
 * @access  Private (Admin only)
 */
exports.updateRole = async (req, res) => {
  try {
    const { namaRole, kodeRole, description, isActive, permissions = [] } = req.body;

    // Check if role exists
    let role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if role code already exists (if changing code)
    if (kodeRole && kodeRole !== role.kodeRole) {
      const existingRole = await Role.findOne({ kodeRole });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role code already exists'
        });
      }
    }

    // Update role
    role = await Role.findByIdAndUpdate(
      req.params.id,
      {
        namaRole: namaRole || role.namaRole,
        kodeRole: kodeRole || role.kodeRole,
        description: description || role.description,
        isActive: isActive !== undefined ? isActive : role.isActive
      },
      { new: true, runValidators: true }
    );

    // Update role permissions
    if (permissions.length > 0) {
      // Remove existing permissions
      await RolePermission.deleteMany({ roleId: role._id });

      // Add new permissions
      const rolePermissions = permissions.map(permissionId => ({
        roleId: role._id,
        permissionId
      }));

      await RolePermission.insertMany(rolePermissions);
    }

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
};

/**
 * @desc    Delete role
 * @route   DELETE /api/rbac/roles/:id
 * @access  Private (Admin only)
 */
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if role is assigned to any users
    const userRoles = await UserRole.find({ roleId: role._id });
    if (userRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role that is assigned to users',
        usersCount: userRoles.length
      });
    }

    // Delete role permissions
    await RolePermission.deleteMany({ roleId: role._id });

    // Delete role
    await role.remove();

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message
    });
  }
};

/**
 * @desc    Get all permissions
 * @route   GET /api/rbac/permissions
 * @access  Private (Admin only)
 */
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ category: 1, name: 1 });

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: permissions.length,
      data: {
        all: permissions,
        byCategory: groupedPermissions
      }
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get permissions',
      error: error.message
    });
  }
};

/**
 * @desc    Create new permission
 * @route   POST /api/rbac/permissions
 * @access  Private (Admin only)
 */
exports.createPermission = async (req, res) => {
  try {
    const { name, code, description, category, isActive = true } = req.body;

    // Check if permission code already exists
    const existingPermission = await Permission.findOne({ code });
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Permission code already exists'
      });
    }

    // Create permission
    const permission = await Permission.create({
      name,
      code,
      description,
      category,
      isActive
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: permission
    });
  } catch (error) {
    console.error('Create permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create permission',
      error: error.message
    });
  }
};

/**
 * @desc    Update permission
 * @route   PUT /api/rbac/permissions/:id
 * @access  Private (Admin only)
 */
exports.updatePermission = async (req, res) => {
  try {
    const { name, code, description, category, isActive } = req.body;

    // Check if permission exists
    let permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    // Check if permission code already exists (if changing code)
    if (code && code !== permission.code) {
      const existingPermission = await Permission.findOne({ code });
      if (existingPermission) {
        return res.status(400).json({
          success: false,
          message: 'Permission code already exists'
        });
      }
    }

    // Update permission
    permission = await Permission.findByIdAndUpdate(
      req.params.id,
      {
        name: name || permission.name,
        code: code || permission.code,
        description: description || permission.description,
        category: category || permission.category,
        isActive: isActive !== undefined ? isActive : permission.isActive
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Permission updated successfully',
      data: permission
    });
  } catch (error) {
    console.error('Update permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update permission',
      error: error.message
    });
  }
};

/**
 * @desc    Delete permission
 * @route   DELETE /api/rbac/permissions/:id
 * @access  Private (Admin only)
 */
exports.deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    // Check if permission is assigned to any roles
    const rolePermissions = await RolePermission.find({ permissionId: permission._id });
    if (rolePermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete permission that is assigned to roles',
        rolesCount: rolePermissions.length
      });
    }

    // Delete permission
    await permission.remove();

    res.status(200).json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete permission',
      error: error.message
    });
  }
};

/**
 * @desc    Assign permissions to role
 * @route   POST /api/rbac/roles/:id/permissions
 * @access  Private (Admin only)
 */
exports.assignPermissionsToRole = async (req, res) => {
  try {
    const { permissions } = req.body;
    const roleId = req.params.id;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Remove existing permissions
    await RolePermission.deleteMany({ roleId });

    // Add new permissions
    if (permissions && permissions.length > 0) {
      const rolePermissions = permissions.map(permissionId => ({
        roleId,
        permissionId
      }));

      await RolePermission.insertMany(rolePermissions);
    }

    res.status(200).json({
      success: true,
      message: 'Permissions assigned to role successfully'
    });
  } catch (error) {
    console.error('Assign permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign permissions',
      error: error.message
    });
  }
};

/**
 * @desc    Get permissions assigned to role
 * @route   GET /api/rbac/roles/:id/permissions
 * @access  Private (Admin only)
 */
exports.getRolePermissions = async (req, res) => {
  try {
    const roleId = req.params.id;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Get permissions assigned to role
    const rolePermissions = await RolePermission.find({ roleId })
      .populate('permissionId', 'name code description category isActive');

    const permissions = rolePermissions.map(rp => rp.permissionId);

    res.status(200).json({
      success: true,
      count: permissions.length,
      data: permissions
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get role permissions',
      error: error.message
    });
  }
};

/**
 * @desc    Get users assigned to role
 * @route   GET /api/rbac/roles/:id/users
 * @access  Private (Admin only)
 */
exports.getRoleUsers = async (req, res) => {
  try {
    const roleId = req.params.id;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Get users assigned to role
    const userRoles = await UserRole.find({ roleId })
      .populate({
        path: 'userId',
        select: 'nama username email jabatan cabangId aktif',
        populate: {
          path: 'cabangId',
          select: 'namaCabang'
        }
      });

    const users = userRoles.map(ur => ({
      ...ur.userId._doc,
      isPrimary: ur.isPrimary
    }));

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get role users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get role users',
      error: error.message
    });
  }
};

/**
 * @desc    Get roles assigned to user
 * @route   GET /api/rbac/users/:id/roles
 * @access  Private (Admin only)
 */
exports.getUserRoles = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get roles assigned to user
    const userRoles = await UserRole.find({ userId })
      .populate('roleId', 'namaRole kodeRole description isActive');

    const roles = userRoles.map(ur => ({
      ...ur.roleId._doc,
      isPrimary: ur.isPrimary
    }));

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (error) {
    console.error('Get user roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user roles',
      error: error.message
    });
  }
};
