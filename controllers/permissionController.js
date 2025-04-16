// controllers/permissionController.js
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const asyncHandler = require('../middlewares/asyncHandler');

// @desc      Get all permissions
// @route     GET /api/permissions
// @access    Private
exports.getPermissions = asyncHandler(async (req, res) => {
  // Filter based on query parameters
  const filter = {};
  
  if (req.query.category) {
    filter.category = req.query.category;
  }
  
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  
  // Search query
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { name: searchRegex },
      { code: searchRegex },
      { description: searchRegex }
    ];
  }
  
  // Get all permissions, sorted by category and name
  const permissions = await Permission.find(filter)
    .sort({ category: 1, name: 1 });
  
  res.status(200).json({
    success: true,
    count: permissions.length,
    data: permissions
  });
});

// @desc      Get permissions by category
// @route     GET /api/permissions/by-category
// @access    Private
exports.getPermissionsByCategory = asyncHandler(async (req, res) => {
  // Get all permissions
  const permissions = await Permission.find({
    ...(req.query.isActive !== undefined ? { isActive: req.query.isActive === 'true' } : {})
  });
  
  // Group permissions by category
  const permissionsByCategory = {};
  
  Permission.PERMISSION_CATEGORIES.forEach(category => {
    permissionsByCategory[category] = permissions.filter(
      permission => permission.category === category
    );
  });
  
  res.status(200).json({
    success: true,
    data: permissionsByCategory
  });
});

// @desc      Get single permission
// @route     GET /api/permissions/:id
// @access    Private
exports.getPermission = asyncHandler(async (req, res) => {
  const permission = await Permission.findById(req.params.id);
  
  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Permission tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: permission
  });
});

// @desc      Create permission
// @route     POST /api/permissions
// @access    Private
exports.createPermission = asyncHandler(async (req, res) => {
  // Check if permission with name or code already exists
  const existingPermission = await Permission.findOne({
    $or: [
      { name: req.body.name },
      { code: req.body.code }
    ]
  });
  
  if (existingPermission) {
    return res.status(400).json({
      success: false,
      message: 'Permission dengan nama atau kode ini sudah ada'
    });
  }
  
  // Create permission
  const permission = await Permission.create(req.body);
  
  res.status(201).json({
    success: true,
    data: permission
  });
});

// @desc      Update permission
// @route     PUT /api/permissions/:id
// @access    Private
exports.updatePermission = asyncHandler(async (req, res) => {
  // Check if permission name or code already exists (for different permission)
  if (req.body.name || req.body.code) {
    const query = { _id: { $ne: req.params.id } };
    
    if (req.body.name) {
      query.name = req.body.name;
    }
    
    if (req.body.code) {
      query.code = req.body.code;
    }
    
    const existingPermission = await Permission.findOne(query);
    
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Permission dengan nama atau kode ini sudah ada'
      });
    }
  }
  
  // Update permission
  const permission = await Permission.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Permission tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: permission
  });
});

// @desc      Delete permission
// @route     DELETE /api/permissions/:id
// @access    Private
exports.deletePermission = asyncHandler(async (req, res) => {
  const permission = await Permission.findById(req.params.id);
  
  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Permission tidak ditemukan'
    });
  }
  
  // Check if permission is used by any role
  const roles = await Role.find({ permissions: permission.code });
  
  if (roles.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Permission sedang digunakan oleh role dan tidak dapat dihapus'
    });
  }
  
  await permission.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Permission berhasil dihapus'
  });
});

// @desc      Get permission categories
// @route     GET /api/permissions/categories
// @access    Private
exports.getPermissionCategories = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: Permission.PERMISSION_CATEGORIES
  });
});

// @desc      Sync permissions with Role model
// @route     POST /api/permissions/sync
// @access    Private
exports.syncPermissions = asyncHandler(async (req, res) => {
  // Get all available permissions from Role model
  const availablePermissions = Role.AVAILABLE_PERMISSIONS;
  
  // Get existing permissions from Permission model
  const existingPermissions = await Permission.find();
  const existingPermissionCodes = existingPermissions.map(p => p.code);
  
  // Find permissions to add
  const permissionsToAdd = availablePermissions.filter(
    code => !existingPermissionCodes.includes(code)
  );
  
  // Create new permissions
  const newPermissions = [];
  
  for (const code of permissionsToAdd) {
    // Generate a readable name from the code
    const name = code
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Determine category based on code prefix
    let category = 'dashboard';
    
    if (code.startsWith('manage_employees') || code.includes('employee')) {
      category = 'user_management';
    } else if (code.includes('branch')) {
      category = 'branch_management';
    } else if (code.includes('division')) {
      category = 'division_management';
    } else if (code.includes('role')) {
      category = 'role_management';
    } else if (code.includes('customer')) {
      category = 'customer_management';
    } else if (code.includes('report')) {
      category = 'reports';
    } else if (code.includes('finance')) {
      category = 'finances';
    } else if (code.includes('vehicle')) {
      category = 'vehicles';
    } else if (code.includes('stt')) {
      category = 'stt_management';
    } else if (code.includes('loading')) {
      category = 'loadings';
    } else if (code.includes('delivery')) {
      category = 'deliveries';
    } else if (code.includes('return')) {
      category = 'returns';
    } else if (code.includes('pickup')) {
      category = 'pickups';
    } else if (code.includes('collection')) {
      category = 'collections';
    } else if (code.includes('truck_queue')) {
      category = 'truck_queues';
    } else if (code.includes('menu')) {
      category = 'menu_management';
    }
    
    // Create the permission
    const newPermission = await Permission.create({
      name,
      code,
      description: `Permission to ${code.replace(/_/g, ' ')}`,
      category,
      isActive: true
    });
    
    newPermissions.push(newPermission);
  }
  
  res.status(200).json({
    success: true,
    count: newPermissions.length,
    data: newPermissions
  });
});