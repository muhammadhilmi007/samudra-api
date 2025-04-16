// middlewares/menuAuth.js
const Menu = require('../models/Menu');
const MenuAccess = require('../models/MenuAccess');
const asyncHandler = require('./asyncHandler');

// Middleware to check if user has access to a specific menu
exports.checkMenuAccess = (menuCode, accessType = 'view') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Akses tidak diizinkan, silakan login terlebih dahulu'
      });
    }

    try {
      // Find the menu by code
      const menu = await Menu.findOne({ code: menuCode, isActive: true });
      
      if (!menu) {
        return res.status(404).json({
          success: false,
          message: 'Menu tidak ditemukan'
        });
      }

      // Check if user has required permissions for the menu
      if (menu.requiredPermissions && menu.requiredPermissions.length > 0) {
        // Make sure user role is populated
        if (!req.user.roleId || !req.user.roleId.permissions) {
          await req.user.populate('roleId', 'permissions');
        }

        const hasRequiredPermission = menu.requiredPermissions.some(permission => 
          req.user.roleId.permissions.includes(permission)
        );

        if (!hasRequiredPermission) {
          return res.status(403).json({
            success: false,
            message: 'Anda tidak memiliki izin untuk mengakses menu ini'
          });
        }
      }

      // Check specific access type in MenuAccess
      const menuAccess = await MenuAccess.findOne({
        roleId: req.user.roleId._id,
        menuId: menu._id
      });

      // If no specific access record, deny access
      if (!menuAccess) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke menu ini'
        });
      }

      // Check specific access type
      let hasAccess = false;
      switch (accessType.toLowerCase()) {
        case 'view':
          hasAccess = menuAccess.canView;
          break;
        case 'create':
          hasAccess = menuAccess.canCreate;
          break;
        case 'edit':
          hasAccess = menuAccess.canEdit;
          break;
        case 'delete':
          hasAccess = menuAccess.canDelete;
          break;
        default:
          hasAccess = menuAccess.canView;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Anda tidak memiliki izin untuk ${getAccessTypeLabel(accessType)} pada menu ini`
        });
      }

      // Add menu to request for potential use in controllers
      req.menu = menu;
      
      next();
    } catch (error) {
      console.error('Error checking menu access:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat memeriksa akses menu',
        error: error.message
      });
    }
  });
};

// Helper function to get human-readable access type label
function getAccessTypeLabel(accessType) {
  switch (accessType.toLowerCase()) {
    case 'view':
      return 'melihat';
    case 'create':
      return 'membuat';
    case 'edit':
      return 'mengedit';
    case 'delete':
      return 'menghapus';
    default:
      return 'mengakses';
  }
}

// Middleware to get user's accessible menus
exports.getUserMenus = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Akses tidak diizinkan, silakan login terlebih dahulu'
    });
  }

  try {
    // Make sure user role is populated
    if (!req.user.roleId || !req.user.roleId.permissions) {
      await req.user.populate('roleId', 'permissions');
    }

    // Get all active top-level menus
    const topLevelMenus = await Menu.find({ 
      parentId: null,
      isActive: true
    }).sort({ order: 1 });

    // Get menu access for this role
    const menuAccesses = await MenuAccess.find({
      roleId: req.user.roleId._id
    });

    // Create a map of menu IDs to access rights
    const menuAccessMap = {};
    menuAccesses.forEach(access => {
      menuAccessMap[access.menuId.toString()] = access;
    });

    // Filter and process menus recursively
    const accessibleMenus = [];
    
    for (const menu of topLevelMenus) {
      const processedMenu = await processMenuWithChildren(
        menu, 
        req.user.roleId.permissions,
        menuAccessMap
      );
      
      if (processedMenu) {
        accessibleMenus.push(processedMenu);
      }
    }

    // Add menus to request object
    req.accessibleMenus = accessibleMenus;
    
    next();
  } catch (error) {
    console.error('Error getting user menus:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil menu pengguna',
      error: error.message
    });
  }
});

// Helper function to process a menu and its children recursively
async function processMenuWithChildren(menu, userPermissions, menuAccessMap) {
  // Check if user has access to this menu
  const menuAccess = menuAccessMap[menu._id.toString()];
  
  if (!menuAccess || !menuAccess.canView) {
    return null;
  }
  
  // Check if user has required permissions
  if (menu.requiredPermissions && menu.requiredPermissions.length > 0) {
    const hasRequiredPermission = menu.requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasRequiredPermission) {
      return null;
    }
  }
  
  // Populate children
  await menu.populate('children');
  
  // Process children recursively
  const accessibleChildren = [];
  
  if (menu.children && menu.children.length > 0) {
    for (const child of menu.children) {
      const processedChild = await processMenuWithChildren(
        child,
        userPermissions,
        menuAccessMap
      );
      
      if (processedChild) {
        accessibleChildren.push(processedChild);
      }
    }
  }
  
  // Create a clean menu object with only necessary fields
  const processedMenu = {
    _id: menu._id,
    name: menu.name,
    code: menu.code,
    path: menu.path,
    icon: menu.icon,
    order: menu.order,
    children: accessibleChildren
  };
  
  return processedMenu;
}