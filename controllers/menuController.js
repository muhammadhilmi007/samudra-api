// controllers/menuController.js
const Menu = require('../models/Menu');
const MenuAccess = require('../models/MenuAccess');
const Role = require('../models/Role');
const asyncHandler = require('../middlewares/asyncHandler');

// @desc      Get all menus
// @route     GET /api/menus
// @access    Private
exports.getMenus = asyncHandler(async (req, res) => {
  // Filter based on query parameters
  const filter = {};
  
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  
  if (req.query.parentId) {
    filter.parentId = req.query.parentId === 'null' ? null : req.query.parentId;
  }
  
  // Get all menus, sorted by order
  const menus = await Menu.find(filter)
    .populate('parentId', 'name code')
    .sort({ order: 1 });
  
  res.status(200).json({
    success: true,
    count: menus.length,
    data: menus
  });
});

// @desc      Get menu tree structure
// @route     GET /api/menus/tree
// @access    Private
exports.getMenuTree = asyncHandler(async (req, res) => {
  // Get all top-level menus
  const topLevelMenus = await Menu.find({ 
    parentId: null,
    ...(req.query.isActive !== undefined ? { isActive: req.query.isActive === 'true' } : {})
  })
  .sort({ order: 1 });
  
  // Build the menu tree recursively
  const menuTree = [];
  
  for (const menu of topLevelMenus) {
    const menuWithChildren = await buildMenuTree(menu);
    menuTree.push(menuWithChildren);
  }
  
  res.status(200).json({
    success: true,
    count: menuTree.length,
    data: menuTree
  });
});

// Helper function to build menu tree recursively
async function buildMenuTree(menu) {
  await menu.populate('children');
  
  const menuObj = menu.toObject();
  
  if (menuObj.children && menuObj.children.length > 0) {
    const childrenWithSubmenus = [];
    
    for (const child of menuObj.children) {
      const childMenu = await Menu.findById(child._id);
      const childWithSubmenus = await buildMenuTree(childMenu);
      childrenWithSubmenus.push(childWithSubmenus);
    }
    
    menuObj.children = childrenWithSubmenus;
  }
  
  return menuObj;
}

// @desc      Get single menu
// @route     GET /api/menus/:id
// @access    Private
exports.getMenu = asyncHandler(async (req, res) => {
  const menu = await Menu.findById(req.params.id)
    .populate('parentId', 'name code');
  
  if (!menu) {
    return res.status(404).json({
      success: false,
      message: 'Menu tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: menu
  });
});

// @desc      Create menu
// @route     POST /api/menus
// @access    Private
exports.createMenu = asyncHandler(async (req, res) => {
  // Check if menu with code already exists
  const existingMenu = await Menu.findOne({ code: req.body.code });
  
  if (existingMenu) {
    return res.status(400).json({
      success: false,
      message: 'Menu dengan kode ini sudah ada'
    });
  }
  
  // Check if parent menu exists if parentId is provided
  if (req.body.parentId) {
    const parentMenu = await Menu.findById(req.body.parentId);
    
    if (!parentMenu) {
      return res.status(404).json({
        success: false,
        message: 'Menu induk tidak ditemukan'
      });
    }
  }
  
  // Create menu
  const menu = await Menu.create(req.body);
  
  // Create menu access entries for all roles
  const roles = await Role.find();
  
  const menuAccessPromises = roles.map(role => {
    return MenuAccess.create({
      roleId: role._id,
      menuId: menu._id,
      canView: role.kodeRole === 'direktur', // Only direktur has full access by default
      canCreate: role.kodeRole === 'direktur',
      canEdit: role.kodeRole === 'direktur',
      canDelete: role.kodeRole === 'direktur'
    });
  });
  
  await Promise.all(menuAccessPromises);
  
  res.status(201).json({
    success: true,
    data: menu
  });
});

// @desc      Update menu
// @route     PUT /api/menus/:id
// @access    Private
exports.updateMenu = asyncHandler(async (req, res) => {
  // Check if menu code already exists (for different menu)
  if (req.body.code) {
    const existingMenu = await Menu.findOne({
      code: req.body.code,
      _id: { $ne: req.params.id }
    });
    
    if (existingMenu) {
      return res.status(400).json({
        success: false,
        message: 'Menu dengan kode ini sudah ada'
      });
    }
  }
  
  // Check if parent menu exists if parentId is provided
  if (req.body.parentId) {
    // Prevent setting parent to itself
    if (req.body.parentId === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Menu tidak dapat menjadi induk dari dirinya sendiri'
      });
    }
    
    const parentMenu = await Menu.findById(req.body.parentId);
    
    if (!parentMenu) {
      return res.status(404).json({
        success: false,
        message: 'Menu induk tidak ditemukan'
      });
    }
    
    // Prevent circular references
    let currentParent = parentMenu;
    while (currentParent.parentId) {
      if (currentParent.parentId.toString() === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Pengaturan ini akan menyebabkan referensi melingkar'
        });
      }
      currentParent = await Menu.findById(currentParent.parentId);
    }
  }
  
  // Update menu
  const menu = await Menu.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate('parentId', 'name code');
  
  if (!menu) {
    return res.status(404).json({
      success: false,
      message: 'Menu tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: menu
  });
});

// @desc      Delete menu
// @route     DELETE /api/menus/:id
// @access    Private
exports.deleteMenu = asyncHandler(async (req, res) => {
  const menu = await Menu.findById(req.params.id);
  
  if (!menu) {
    return res.status(404).json({
      success: false,
      message: 'Menu tidak ditemukan'
    });
  }
  
  // Check if menu has children
  const childMenus = await Menu.find({ parentId: req.params.id });
  
  if (childMenus.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Menu ini memiliki sub-menu dan tidak dapat dihapus'
    });
  }
  
  // Delete menu access entries for this menu
  await MenuAccess.deleteMany({ menuId: req.params.id });
  
  // Delete menu
  await menu.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Menu berhasil dihapus'
  });
});

// @desc      Get user's accessible menus
// @route     GET /api/menus/user
// @access    Private
exports.getUserMenus = asyncHandler(async (req, res) => {
  // The middleware has already populated req.accessibleMenus
  res.status(200).json({
    success: true,
    count: req.accessibleMenus.length,
    data: req.accessibleMenus
  });
});