// controllers/userRoleController.js
const UserRole = require('../models/UserRole');
const User = require('../models/User');
const Role = require('../models/Role');
const asyncHandler = require('../middlewares/asyncHandler');

// @desc      Get all user-role mappings
// @route     GET /api/user-roles
// @access    Private
exports.getUserRoles = asyncHandler(async (req, res) => {
  // Filter based on query parameters
  const filter = {};
  
  if (req.query.userId) {
    filter.userId = req.query.userId;
  }
  
  if (req.query.roleId) {
    filter.roleId = req.query.roleId;
  }
  
  if (req.query.isPrimary !== undefined) {
    filter.isPrimary = req.query.isPrimary === 'true';
  }
  
  // Get all user-role mappings
  const userRoles = await UserRole.find(filter)
    .populate('userId', 'nama username email jabatan')
    .populate('roleId', 'namaRole kodeRole');
  
  res.status(200).json({
    success: true,
    count: userRoles.length,
    data: userRoles
  });
});

// @desc      Get user-roles by user
// @route     GET /api/user-roles/by-user/:userId
// @access    Private
exports.getUserRolesByUser = asyncHandler(async (req, res) => {
  // Check if user exists
  const user = await User.findById(req.params.userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  // Get all roles for this user
  const userRoles = await UserRole.find({ userId: req.params.userId })
    .populate('roleId', 'namaRole kodeRole deskripsi isActive');
  
  // Get all roles to include those not assigned
  const allRoles = await Role.find({ isActive: true }).sort({ namaRole: 1 });
  
  // Create a map of assigned roles
  const assignedRoleMap = {};
  userRoles.forEach(ur => {
    if (ur.roleId) {
      assignedRoleMap[ur.roleId._id.toString()] = ur;
    }
  });
  
  // Create a complete list with all roles
  const completeRoles = allRoles.map(role => {
    const userRole = assignedRoleMap[role._id.toString()];
    
    if (userRole) {
      return {
        _id: userRole._id,
        userId: req.params.userId,
        roleId: role._id,
        isPrimary: userRole.isPrimary,
        role: {
          _id: role._id,
          namaRole: role.namaRole,
          kodeRole: role.kodeRole,
          deskripsi: role.deskripsi,
          isActive: role.isActive
        },
        assigned: true
      };
    } else {
      return {
        userId: req.params.userId,
        roleId: role._id,
        isPrimary: false,
        role: {
          _id: role._id,
          namaRole: role.namaRole,
          kodeRole: role.kodeRole,
          deskripsi: role.deskripsi,
          isActive: role.isActive
        },
        assigned: false
      };
    }
  });
  
  res.status(200).json({
    success: true,
    data: {
      userId: req.params.userId,
      userName: user.nama,
      userUsername: user.username,
      roles: completeRoles
    }
  });
});

// @desc      Get user-roles by role
// @route     GET /api/user-roles/by-role/:roleId
// @access    Private
exports.getUserRolesByRole = asyncHandler(async (req, res) => {
  // Check if role exists
  const role = await Role.findById(req.params.roleId);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Get all users with this role
  const userRoles = await UserRole.find({ roleId: req.params.roleId })
    .populate('userId', 'nama username email jabatan cabangId aktif');
  
  res.status(200).json({
    success: true,
    count: userRoles.length,
    data: {
      roleId: req.params.roleId,
      roleName: role.namaRole,
      roleCode: role.kodeRole,
      users: userRoles.map(ur => ({
        _id: ur._id,
        userId: ur.userId._id,
        userName: ur.userId.nama,
        userUsername: ur.userId.username,
        userEmail: ur.userId.email,
        userJabatan: ur.userId.jabatan,
        userCabangId: ur.userId.cabangId,
        userAktif: ur.userId.aktif,
        isPrimary: ur.isPrimary
      }))
    }
  });
});

// @desc      Create user-role mapping
// @route     POST /api/user-roles
// @access    Private
exports.createUserRole = asyncHandler(async (req, res) => {
  const { userId, roleId, isPrimary } = req.body;
  
  // Check if user exists
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
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
  
  // Check if mapping already exists
  const existingMapping = await UserRole.findOne({ userId, roleId });
  
  if (existingMapping) {
    return res.status(400).json({
      success: false,
      message: 'Mapping user-role ini sudah ada'
    });
  }
  
  // If this is set as primary, unset any existing primary role
  if (isPrimary) {
    await UserRole.updateMany(
      { userId, isPrimary: true },
      { isPrimary: false }
    );
  }
  
  // Create mapping
  const userRole = await UserRole.create({
    userId,
    roleId,
    isPrimary: isPrimary || false
  });
  
  // Populate references for response
  await userRole.populate('userId', 'nama username email jabatan');
  await userRole.populate('roleId', 'namaRole kodeRole');
  
  res.status(201).json({
    success: true,
    data: userRole
  });
});

// @desc      Update user-role mapping
// @route     PUT /api/user-roles/:id
// @access    Private
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { isPrimary } = req.body;
  
  // Find the user-role mapping
  const userRole = await UserRole.findById(req.params.id);
  
  if (!userRole) {
    return res.status(404).json({
      success: false,
      message: 'User-role mapping tidak ditemukan'
    });
  }
  
  // If setting as primary, unset any existing primary role
  if (isPrimary && !userRole.isPrimary) {
    await UserRole.updateMany(
      { userId: userRole.userId, isPrimary: true },
      { isPrimary: false }
    );
  }
  
  // Update the mapping
  userRole.isPrimary = isPrimary;
  await userRole.save();
  
  // Populate references for response
  await userRole.populate('userId', 'nama username email jabatan');
  await userRole.populate('roleId', 'namaRole kodeRole');
  
  res.status(200).json({
    success: true,
    data: userRole
  });
});

// @desc      Delete user-role mapping
// @route     DELETE /api/user-roles/:id
// @access    Private
exports.deleteUserRole = asyncHandler(async (req, res) => {
  const userRole = await UserRole.findById(req.params.id);
  
  if (!userRole) {
    return res.status(404).json({
      success: false,
      message: 'User-role mapping tidak ditemukan'
    });
  }
  
  // Check if this is the only role for the user
  const userRoleCount = await UserRole.countDocuments({ userId: userRole.userId });
  
  if (userRoleCount <= 1) {
    return res.status(400).json({
      success: false,
      message: 'User harus memiliki minimal satu role'
    });
  }
  
  // If this is the primary role, set another role as primary
  if (userRole.isPrimary) {
    const anotherUserRole = await UserRole.findOne({
      userId: userRole.userId,
      _id: { $ne: userRole._id }
    });
    
    if (anotherUserRole) {
      anotherUserRole.isPrimary = true;
      await anotherUserRole.save();
    }
  }
  
  await userRole.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'User-role mapping berhasil dihapus'
  });
});

// @desc      Batch update user roles
// @route     POST /api/user-roles/batch
// @access    Private
exports.batchUpdateUserRoles = asyncHandler(async (req, res) => {
  const { userId, roles } = req.body;
  
  if (!userId || !Array.isArray(roles)) {
    return res.status(400).json({
      success: false,
      message: 'userId dan roles (array) harus diisi'
    });
  }
  
  // Check if user exists
  const user = await User.findById(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  // Validate roles format
  const validRoles = roles.filter(role => 
    role.roleId && (role.isPrimary === undefined || typeof role.isPrimary === 'boolean')
  );
  
  if (validRoles.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Format roles tidak valid'
    });
  }
  
  // Ensure at least one primary role
  const hasPrimary = validRoles.some(role => role.isPrimary);
  
  if (!hasPrimary) {
    validRoles[0].isPrimary = true;
  }
  
  // Get current roles for this user
  const currentUserRoles = await UserRole.find({ userId });
  const currentRoleIds = new Set(
    currentUserRoles.map(ur => ur.roleId.toString())
  );
  
  // Determine roles to add, update, and remove
  const newRoleMap = new Map(
    validRoles.map(role => [role.roleId, role.isPrimary])
  );
  
  const rolesToAdd = [...newRoleMap.keys()].filter(
    id => !currentRoleIds.has(id)
  );
  
  const rolesToUpdate = [...newRoleMap.keys()].filter(
    id => currentRoleIds.has(id)
  );
  
  const rolesToRemove = [...currentRoleIds].filter(
    id => !newRoleMap.has(id)
  );
  
  // Add new roles
  const addPromises = rolesToAdd.map(async (roleId) => {
    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return {
        success: false,
        roleId,
        message: 'Role tidak ditemukan'
      };
    }
    
    // Create mapping
    const userRole = await UserRole.create({
      userId,
      roleId,
      isPrimary: newRoleMap.get(roleId) || false
    });
    
    return {
      success: true,
      _id: userRole._id,
      roleId,
      isPrimary: userRole.isPrimary
    };
  });
  
  // Update existing roles
  const updatePromises = rolesToUpdate.map(async (roleId) => {
    const userRole = await UserRole.findOne({
      userId,
      roleId
    });
    
    if (userRole) {
      userRole.isPrimary = newRoleMap.get(roleId) || false;
      await userRole.save();
      
      return {
        success: true,
        _id: userRole._id,
        roleId,
        isPrimary: userRole.isPrimary
      };
    }
    
    return {
      success: false,
      roleId,
      message: 'User-role mapping tidak ditemukan'
    };
  });
  
  // Remove roles
  const removePromises = rolesToRemove.map(async (roleId) => {
    const userRole = await UserRole.findOne({
      userId,
      roleId
    });
    
    if (userRole) {
      await userRole.deleteOne();
    }
    
    return {
      success: true,
      roleId
    };
  });
  
  // Execute all operations
  const [addResults, updateResults, removeResults] = await Promise.all([
    Promise.all(addPromises),
    Promise.all(updatePromises),
    Promise.all(removePromises)
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      added: addResults,
      updated: updateResults,
      removed: removeResults
    }
  });
});