// controllers/rolePermissionController.js
const RolePermission = require('../models/RolePermission');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const asyncHandler = require('../middlewares/asyncHandler');

// @desc      Get all role-permission mappings
// @route     GET /api/role-permissions
// @access    Private
exports.getRolePermissions = asyncHandler(async (req, res) => {
  // Filter based on query parameters
  const filter = {};
  
  if (req.query.roleId) {
    filter.roleId = req.query.roleId;
  }
  
  if (req.query.permissionId) {
    filter.permissionId = req.query.permissionId;
  }
  
  // Get all role-permission mappings
  const rolePermissions = await RolePermission.find(filter)
    .populate('roleId', 'namaRole kodeRole')
    .populate('permissionId', 'name code category');
  
  res.status(200).json({
    success: true,
    count: rolePermissions.length,
    data: rolePermissions
  });
});

// @desc      Get role-permissions by role
// @route     GET /api/role-permissions/by-role/:roleId
// @access    Private
exports.getRolePermissionsByRole = asyncHandler(async (req, res) => {
  // Check if role exists
  const role = await Role.findById(req.params.roleId);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Get all permissions for this role
  const rolePermissions = await RolePermission.find({ roleId: req.params.roleId })
    .populate('permissionId', 'name code description category isActive');
  
  // Get all permissions to include those not assigned
  const allPermissions = await Permission.find().sort({ category: 1, name: 1 });
  
  // Create a map of assigned permissions
  const assignedPermissionMap = {};
  rolePermissions.forEach(rp => {
    if (rp.permissionId) {
      assignedPermissionMap[rp.permissionId._id.toString()] = rp;
    }
  });
  
  // Create a complete list with all permissions
  const completePermissions = allPermissions.map(permission => {
    const rolePermission = assignedPermissionMap[permission._id.toString()];
    
    if (rolePermission) {
      return {
        _id: rolePermission._id,
        roleId: req.params.roleId,
        permissionId: permission._id,
        permission: {
          _id: permission._id,
          name: permission.name,
          code: permission.code,
          description: permission.description,
          category: permission.category,
          isActive: permission.isActive
        },
        assigned: true
      };
    } else {
      return {
        roleId: req.params.roleId,
        permissionId: permission._id,
        permission: {
          _id: permission._id,
          name: permission.name,
          code: permission.code,
          description: permission.description,
          category: permission.category,
          isActive: permission.isActive
        },
        assigned: false
      };
    }
  });
  
  // Group by category
  const permissionsByCategory = {};
  
  completePermissions.forEach(item => {
    const category = item.permission.category;
    if (!permissionsByCategory[category]) {
      permissionsByCategory[category] = [];
    }
    permissionsByCategory[category].push(item);
  });
  
  res.status(200).json({
    success: true,
    data: {
      roleId: req.params.roleId,
      roleName: role.namaRole,
      roleCode: role.kodeRole,
      permissionsByCategory
    }
  });
});

// @desc      Get role-permissions by permission
// @route     GET /api/role-permissions/by-permission/:permissionId
// @access    Private
exports.getRolePermissionsByPermission = asyncHandler(async (req, res) => {
  // Check if permission exists
  const permission = await Permission.findById(req.params.permissionId);
  
  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Permission tidak ditemukan'
    });
  }
  
  // Get all roles with this permission
  const rolePermissions = await RolePermission.find({ permissionId: req.params.permissionId })
    .populate('roleId', 'namaRole kodeRole deskripsi isActive');
  
  res.status(200).json({
    success: true,
    count: rolePermissions.length,
    data: {
      permissionId: req.params.permissionId,
      permissionName: permission.name,
      permissionCode: permission.code,
      roles: rolePermissions.map(rp => ({
        _id: rp._id,
        roleId: rp.roleId._id,
        roleName: rp.roleId.namaRole,
        roleCode: rp.roleId.kodeRole,
        roleDescription: rp.roleId.deskripsi,
        isActive: rp.roleId.isActive
      }))
    }
  });
});

// @desc      Create role-permission mapping
// @route     POST /api/role-permissions
// @access    Private
exports.createRolePermission = asyncHandler(async (req, res) => {
  const { roleId, permissionId } = req.body;
  
  // Check if role exists
  const role = await Role.findById(roleId);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Check if permission exists
  const permission = await Permission.findById(permissionId);
  
  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Permission tidak ditemukan'
    });
  }
  
  // Check if mapping already exists
  const existingMapping = await RolePermission.findOne({ roleId, permissionId });
  
  if (existingMapping) {
    return res.status(400).json({
      success: false,
      message: 'Mapping role-permission ini sudah ada'
    });
  }
  
  // Create mapping
  const rolePermission = await RolePermission.create({
    roleId,
    permissionId
  });
  
  // Populate references for response
  await rolePermission.populate('roleId', 'namaRole kodeRole');
  await rolePermission.populate('permissionId', 'name code category');
  
  res.status(201).json({
    success: true,
    data: rolePermission
  });
});

// @desc      Delete role-permission mapping
// @route     DELETE /api/role-permissions/:id
// @access    Private
exports.deleteRolePermission = asyncHandler(async (req, res) => {
  const rolePermission = await RolePermission.findById(req.params.id);
  
  if (!rolePermission) {
    return res.status(404).json({
      success: false,
      message: 'Role-permission mapping tidak ditemukan'
    });
  }
  
  await rolePermission.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Role-permission mapping berhasil dihapus'
  });
});

// @desc      Batch update role permissions
// @route     POST /api/role-permissions/batch
// @access    Private
exports.batchUpdateRolePermissions = asyncHandler(async (req, res) => {
  const { roleId, permissions } = req.body;
  
  if (!roleId || !Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      message: 'roleId dan permissions (array) harus diisi'
    });
  }
  
  // Check if role exists
  const role = await Role.findById(roleId);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Get current permissions for this role
  const currentRolePermissions = await RolePermission.find({ roleId });
  const currentPermissionIds = new Set(
    currentRolePermissions.map(rp => rp.permissionId.toString())
  );
  
  // Determine permissions to add and remove
  const newPermissionIds = new Set(permissions);
  
  const permissionsToAdd = [...newPermissionIds].filter(
    id => !currentPermissionIds.has(id)
  );
  
  const permissionsToRemove = [...currentPermissionIds].filter(
    id => !newPermissionIds.has(id)
  );
  
  // Add new permissions
  const addPromises = permissionsToAdd.map(async (permissionId) => {
    // Verify permission exists
    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return {
        success: false,
        permissionId,
        message: 'Permission tidak ditemukan'
      };
    }
    
    // Create mapping
    const rolePermission = await RolePermission.create({
      roleId,
      permissionId
    });
    
    return {
      success: true,
      _id: rolePermission._id,
      permissionId
    };
  });
  
  // Remove permissions
  const removePromises = permissionsToRemove.map(async (permissionId) => {
    const rolePermission = await RolePermission.findOne({
      roleId,
      permissionId
    });
    
    if (rolePermission) {
      await rolePermission.deleteOne();
    }
    
    return {
      success: true,
      permissionId
    };
  });
  
  // Execute all operations
  const [addResults, removeResults] = await Promise.all([
    Promise.all(addPromises),
    Promise.all(removePromises)
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      added: addResults,
      removed: removeResults
    }
  });
});