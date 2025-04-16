// controllers/menuAccessController.js
const MenuAccess = require('../models/MenuAccess');
const Menu = require('../models/Menu');
const Role = require('../models/Role');
const asyncHandler = require('../middlewares/asyncHandler');

// @desc      Get all menu access entries
// @route     GET /api/menu-access
// @access    Private
exports.getMenuAccesses = asyncHandler(async (req, res) => {
  // Filter based on query parameters
  const filter = {};
  
  if (req.query.roleId) {
    filter.roleId = req.query.roleId;
  }
  
  if (req.query.menuId) {
    filter.menuId = req.query.menuId;
  }
  
  // Get all menu access entries
  const menuAccesses = await MenuAccess.find(filter)
    .populate('roleId', 'namaRole kodeRole')
    .populate('menuId', 'name code path');
  
  res.status(200).json({
    success: true,
    count: menuAccesses.length,
    data: menuAccesses
  });
});

// @desc      Get menu access by role
// @route     GET /api/menu-access/by-role/:roleId
// @access    Private
exports.getMenuAccessByRole = asyncHandler(async (req, res) => {
  // Check if role exists
  const role = await Role.findById(req.params.roleId);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Get all menu access entries for this role
  const menuAccesses = await MenuAccess.find({ roleId: req.params.roleId })
    .populate('menuId', 'name code path parentId order isActive');
  
  // Get all menus to include those without access
  const allMenus = await Menu.find().sort({ order: 1 });
  
  // Create a map of menu accesses
  const menuAccessMap = {};
  menuAccesses.forEach(access => {
    menuAccessMap[access.menuId._id.toString()] = {
      _id: access._id,
      canView: access.canView,
      canCreate: access.canCreate,
      canEdit: access.canEdit,
      canDelete: access.canDelete,
      menu: access.menuId
    };
  });
  
  // Create a complete list with all menus
  const completeMenuAccess = allMenus.map(menu => {
    const access = menuAccessMap[menu._id.toString()];
    
    if (access) {
      return {
        _id: access._id,
        roleId: req.params.roleId,
        menuId: menu._id,
        canView: access.canView,
        canCreate: access.canCreate,
        canEdit: access.canEdit,
        canDelete: access.canDelete,
        menu: {
          _id: menu._id,
          name: menu.name,
          code: menu.code,
          path: menu.path,
          parentId: menu.parentId,
          order: menu.order,
          isActive: menu.isActive
        }
      };
    } else {
      return {
        roleId: req.params.roleId,
        menuId: menu._id,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        menu: {
          _id: menu._id,
          name: menu.name,
          code: menu.code,
          path: menu.path,
          parentId: menu.parentId,
          order: menu.order,
          isActive: menu.isActive
        }
      };
    }
  });
  
  res.status(200).json({
    success: true,
    count: completeMenuAccess.length,
    data: completeMenuAccess
  });
});

// @desc      Get menu access by menu
// @route     GET /api/menu-access/by-menu/:menuId
// @access    Private
exports.getMenuAccessByMenu = asyncHandler(async (req, res) => {
  // Check if menu exists
  const menu = await Menu.findById(req.params.menuId);
  
  if (!menu) {
    return res.status(404).json({
      success: false,
      message: 'Menu tidak ditemukan'
    });
  }
  
  // Get all menu access entries for this menu
  const menuAccesses = await MenuAccess.find({ menuId: req.params.menuId })
    .populate('roleId', 'namaRole kodeRole');
  
  // Get all roles to include those without access
  const allRoles = await Role.find().sort({ namaRole: 1 });
  
  // Create a map of menu accesses
  const menuAccessMap = {};
  menuAccesses.forEach(access => {
    menuAccessMap[access.roleId._id.toString()] = {
      _id: access._id,
      canView: access.canView,
      canCreate: access.canCreate,
      canEdit: access.canEdit,
      canDelete: access.canDelete,
      role: access.roleId
    };
  });
  
  // Create a complete list with all roles
  const completeMenuAccess = allRoles.map(role => {
    const access = menuAccessMap[role._id.toString()];
    
    if (access) {
      return {
        _id: access._id,
        roleId: role._id,
        menuId: req.params.menuId,
        canView: access.canView,
        canCreate: access.canCreate,
        canEdit: access.canEdit,
        canDelete: access.canDelete,
        role: {
          _id: role._id,
          namaRole: role.namaRole,
          kodeRole: role.kodeRole
        }
      };
    } else {
      return {
        roleId: role._id,
        menuId: req.params.menuId,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        role: {
          _id: role._id,
          namaRole: role.namaRole,
          kodeRole: role.kodeRole
        }
      };
    }
  });
  
  res.status(200).json({
    success: true,
    count: completeMenuAccess.length,
    data: completeMenuAccess
  });
});

// @desc      Get single menu access
// @route     GET /api/menu-access/:id
// @access    Private
exports.getMenuAccess = asyncHandler(async (req, res) => {
  const menuAccess = await MenuAccess.findById(req.params.id)
    .populate('roleId', 'namaRole kodeRole')
    .populate('menuId', 'name code path');
  
  if (!menuAccess) {
    return res.status(404).json({
      success: false,
      message: 'Menu access tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: menuAccess
  });
});

// @desc      Create or update menu access
// @route     POST /api/menu-access
// @access    Private
exports.createOrUpdateMenuAccess = asyncHandler(async (req, res) => {
  const { roleId, menuId, canView, canCreate, canEdit, canDelete } = req.body;
  
  // Check if role exists
  const role = await Role.findById(roleId);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Check if menu exists
  const menu = await Menu.findById(menuId);
  
  if (!menu) {
    return res.status(404).json({
      success: false,
      message: 'Menu tidak ditemukan'
    });
  }
  
  // Check if menu access already exists
  let menuAccess = await MenuAccess.findOne({ roleId, menuId });
  
  if (menuAccess) {
    // Update existing menu access
    menuAccess = await MenuAccess.findOneAndUpdate(
      { roleId, menuId },
      { canView, canCreate, canEdit, canDelete },
      {
        new: true,
        runValidators: true
      }
    )
    .populate('roleId', 'namaRole kodeRole')
    .populate('menuId', 'name code path');
    
    res.status(200).json({
      success: true,
      data: menuAccess
    });
  } else {
    // Create new menu access
    menuAccess = await MenuAccess.create({
      roleId,
      menuId,
      canView,
      canCreate,
      canEdit,
      canDelete
    });
    
    // Populate references for response
    menuAccess = await MenuAccess.findById(menuAccess._id)
      .populate('roleId', 'namaRole kodeRole')
      .populate('menuId', 'name code path');
    
    res.status(201).json({
      success: true,
      data: menuAccess
    });
  }
});

// @desc      Update menu access
// @route     PUT /api/menu-access/:id
// @access    Private
exports.updateMenuAccess = asyncHandler(async (req, res) => {
  const { canView, canCreate, canEdit, canDelete } = req.body;
  
  // Update menu access
  const menuAccess = await MenuAccess.findByIdAndUpdate(
    req.params.id,
    { canView, canCreate, canEdit, canDelete },
    {
      new: true,
      runValidators: true
    }
  )
  .populate('roleId', 'namaRole kodeRole')
  .populate('menuId', 'name code path');
  
  if (!menuAccess) {
    return res.status(404).json({
      success: false,
      message: 'Menu access tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: menuAccess
  });
});

// @desc      Delete menu access
// @route     DELETE /api/menu-access/:id
// @access    Private
exports.deleteMenuAccess = asyncHandler(async (req, res) => {
  const menuAccess = await MenuAccess.findById(req.params.id);
  
  if (!menuAccess) {
    return res.status(404).json({
      success: false,
      message: 'Menu access tidak ditemukan'
    });
  }
  
  await menuAccess.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Menu access berhasil dihapus'
  });
});

// @desc      Batch update menu access for a role
// @route     PUT /api/menu-access/batch/role/:roleId
// @access    Private
exports.batchUpdateMenuAccessForRole = asyncHandler(async (req, res) => {
  const { menuAccesses } = req.body;
  
  if (!Array.isArray(menuAccesses)) {
    return res.status(400).json({
      success: false,
      message: 'menuAccesses harus berupa array'
    });
  }
  
  // Check if role exists
  const role = await Role.findById(req.params.roleId);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Process each menu access
  const updatePromises = menuAccesses.map(async (access) => {
    const { menuId, canView, canCreate, canEdit, canDelete } = access;
    
    // Check if menu exists
    const menu = await Menu.findById(menuId);
    
    if (!menu) {
      return {
        success: false,
        menuId,
        message: 'Menu tidak ditemukan'
      };
    }
    
    // Find or create menu access
    let menuAccess = await MenuAccess.findOne({
      roleId: req.params.roleId,
      menuId
    });
    
    if (menuAccess) {
      // Update existing
      menuAccess.canView = canView;
      menuAccess.canCreate = canCreate;
      menuAccess.canEdit = canEdit;
      menuAccess.canDelete = canDelete;
      await menuAccess.save();
    } else {
      // Create new
      menuAccess = await MenuAccess.create({
        roleId: req.params.roleId,
        menuId,
        canView,
        canCreate,
        canEdit,
        canDelete
      });
    }
    
    return {
      success: true,
      menuId,
      _id: menuAccess._id
    };
  });
  
  const results = await Promise.all(updatePromises);
  
  res.status(200).json({
    success: true,
    count: results.length,
    data: results
  });
});