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

      // Get all user permissions
      const userPermissions = await req.user.getAllPermissions();

      // Check if user has required permissions for the menu
      if (menu.requiredPermissions && menu.requiredPermissions.length > 0) {
        const hasRequiredPermission = menu.requiredPermissions.some(permission =>
          userPermissions.includes(permission)
        );

        if (!hasRequiredPermission) {
          return res.status(403).json({
            success: false,
            message: 'Anda tidak memiliki izin untuk mengakses menu ini'
          });
        }
      }

      // Get all user roles
      const userRoles = await req.user.getRoles();
      const roleIds = userRoles.map(ur => ur.roleId._id);
      
      // Also include legacy roleId
      if (req.user.roleId) {
        roleIds.push(req.user.roleId);
      }

      // Check if any role has access to this menu
      const menuAccesses = await MenuAccess.find({
        roleId: { $in: roleIds },
        menuId: menu._id
      });

      // If no specific access record for any role, deny access
      if (menuAccesses.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke menu ini'
        });
      }

      // Check if any role has the specific access type
      let hasAccess = false;
      for (const menuAccess of menuAccesses) {
        switch (accessType.toLowerCase()) {
          case 'view':
            if (menuAccess.canView) hasAccess = true;
            break;
          case 'create':
            if (menuAccess.canCreate) hasAccess = true;
            break;
          case 'edit':
            if (menuAccess.canEdit) hasAccess = true;
            break;
          case 'delete':
            if (menuAccess.canDelete) hasAccess = true;
            break;
          default:
            if (menuAccess.canView) hasAccess = true;
        }
        
        if (hasAccess) break;
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
    // Get all user permissions
    const userPermissions = await req.user.getAllPermissions();

    // Get all active top-level menus
    const topLevelMenus = await Menu.find({
      parentId: null,
      isActive: true
    }).sort({ order: 1 });

    // Get all user roles
    const userRoles = await req.user.getRoles();
    const roleIds = userRoles.map(ur => ur.roleId._id);
    
    // Also include legacy roleId
    if (req.user.roleId) {
      roleIds.push(req.user.roleId);
    }

    // Get menu access for all user roles
    const menuAccesses = await MenuAccess.find({
      roleId: { $in: roleIds }
    });

    // Create a map of menu IDs to access rights
    // If a menu has access from multiple roles, combine the access rights
    const menuAccessMap = {};
    menuAccesses.forEach(access => {
      const menuId = access.menuId.toString();
      if (!menuAccessMap[menuId]) {
        menuAccessMap[menuId] = {
          canView: access.canView,
          canCreate: access.canCreate,
          canEdit: access.canEdit,
          canDelete: access.canDelete
        };
      } else {
        // Combine access rights (OR operation)
        menuAccessMap[menuId].canView = menuAccessMap[menuId].canView || access.canView;
        menuAccessMap[menuId].canCreate = menuAccessMap[menuId].canCreate || access.canCreate;
        menuAccessMap[menuId].canEdit = menuAccessMap[menuId].canEdit || access.canEdit;
        menuAccessMap[menuId].canDelete = menuAccessMap[menuId].canDelete || access.canDelete;
      }
    });

    // Filter and process menus recursively
    const accessibleMenus = [];
    
    for (const menu of topLevelMenus) {
      const processedMenu = await processMenuWithChildren(
        menu,
        userPermissions,
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