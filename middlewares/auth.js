const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");
const Permission = require("../models/Permission");
const UserRole = require("../models/UserRole");
const RolePermission = require("../models/RolePermission");
const MenuAccess = require("../models/MenuAccess");
const config = require("../config/config");
const asyncHandler = require("./asyncHandler");
const Pickup = require("../models/Pickup");
const { default: mongoose } = require("mongoose");

// Protect routes - middleware to require login
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Get token from header (format: Bearer {token})
    token = req.headers.authorization.split(" ")[1];
  }
  // Also allow token from cookie for web app
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses tidak diizinkan, silakan login terlebih dahulu",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || config.jwt.secret
    );

    // Get user from the token with legacy role data
    const user = await User.findById(decoded.id)
      .populate("roleId", "namaRole kodeRole permissions isActive")
      .populate("cabangId", "namaCabang kota provinsi");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Check if user is active
    if (!user.aktif) {
      return res.status(401).json({
        success: false,
        message: "Akun telah dinonaktifkan, silakan hubungi administrator",
      });
    }

    // Get user roles
    const userRoles = await UserRole.find({ userId: user._id })
      .populate({
        path: "roleId",
        select: "namaRole kodeRole permissions isActive",
        match: { isActive: true }
      });

    // Cache user roles on the user object
    user._userRoles = userRoles.filter(ur => ur.roleId); // Filter out inactive roles

    // Get all permissions for these roles
    const roleIds = userRoles
      .filter(ur => ur.roleId) // Filter out inactive roles
      .map(ur => ur.roleId._id);
    
    // Add legacy roleId if it exists and is active
    if (user.roleId && user.roleId.isActive) {
      // Check if this roleId is already included in the roleIds array
      const roleIdStr = user.roleId._id.toString();
      if (!roleIds.some(id => id.toString() === roleIdStr)) {
        roleIds.push(user.roleId._id);
      }
    }

    // Get role permissions from the new system
    const rolePermissions = await RolePermission.find({
      roleId: { $in: roleIds }
    }).populate({
      path: "permissionId",
      select: "code name category isActive",
      match: { isActive: true }
    });

    // Cache permissions on the user object
    const permissionSet = new Set();
    
    // Add permissions from the new system
    rolePermissions.forEach(rp => {
      if (rp.permissionId && rp.permissionId.code) {
        permissionSet.add(rp.permissionId.code);
      }
    });

    // Also include legacy permissions from Role model
    // First from the primary role
    if (user.roleId && user.roleId.permissions) {
      user.roleId.permissions.forEach(p => permissionSet.add(p));
    }
    
    // Then from all other roles
    userRoles.forEach(ur => {
      if (ur.roleId && ur.roleId.permissions) {
        ur.roleId.permissions.forEach(p => permissionSet.add(p));
      }
    });

    user._permissions = Array.from(permissionSet);

    // Get menu access for all user roles
    const menuAccesses = await MenuAccess.find({
      roleId: { $in: roleIds }
    }).populate({
      path: "menuId",
      select: "name code path icon order requiredPermissions isActive",
      match: { isActive: true }
    });

    // Cache menu access on the user object
    const menuAccessMap = {};
    menuAccesses.forEach(access => {
      if (!access.menuId) return;
      
      const menuId = access.menuId._id.toString();
      if (!menuAccessMap[menuId]) {
        menuAccessMap[menuId] = {
          menuId: access.menuId._id,
          menuCode: access.menuId.code,
          menuName: access.menuId.name,
          menuPath: access.menuId.path,
          menuIcon: access.menuId.icon,
          menuOrder: access.menuId.order,
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

    user._menuAccess = menuAccessMap;

    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Sesi tidak valid, silakan login kembali",
      error: error.message,
    });
  }
});

// Legacy role authorization middleware (redirects to authorizeRole for backward compatibility)
exports.authorize = (...roles) => {
  console.warn('Warning: authorize middleware is deprecated. Use authorizeRole instead.');
  return exports.authorizeRole(...roles);
};

// Permission authorization middleware
exports.checkPermission = (...permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Akses tidak diizinkan, silakan login terlebih dahulu",
      });
    }

    // Special case for drivers accessing their own pickups
    if (req.user.role === 'supir' &&
        req.path.startsWith('/pickups/') &&
        !req.path.includes('/status')) {
      
      // Get pickup ID from URL
      const pickupId = req.path.split('/')[2];
      
      // Check if this pickup belongs to the driver
      const pickup = await Pickup.findById(pickupId);
      
      if (pickup && pickup.supirId.toString() === req.user._id.toString()) {
        return next();
      }
    }

    try {
      // Use cached permissions if available, otherwise fetch them
      let userPermissions;
      if (req.user._permissions) {
        userPermissions = req.user._permissions;
      } else {
        userPermissions = await req.user.getAllPermissions();
        // Cache for future use
        req.user._permissions = userPermissions;
      }
      
      // Check if user has any of the required permissions
      const hasPermission = permissions.some((permission) =>
        userPermissions.includes(permission)
      );

      // If user has direct permission, allow access
      if (hasPermission) {
        // Add permissions to request for potential use in controllers
        req.userPermissions = userPermissions;
        return next();
      }

      // Check for wildcard permissions (e.g., manage_all_*)
      const wildcardPermissions = userPermissions.filter(p => 
        p.includes('_all_') || p.startsWith('manage_')
      );
      
      if (wildcardPermissions.length > 0) {
        // Check if any of the required permissions match a wildcard pattern
        const hasWildcardPermission = permissions.some(permission => {
          // Extract resource type from permission (e.g., 'view_employees' -> 'employees')
          const parts = permission.split('_');
          if (parts.length < 2) return false;
          
          const action = parts[0]; // e.g., 'view'
          const resource = parts.slice(1).join('_'); // e.g., 'employees'
          
          // Check for wildcard permissions like 'manage_all_resources'
          return wildcardPermissions.some(wp => {
            // Check for 'manage_' prefix which grants all permissions on a resource
            if (wp.startsWith('manage_') && !wp.includes('_all_')) {
              const managedResource = wp.substring(7); // Remove 'manage_'
              
              // Check if the managed resource matches the requested resource
              let resourceMatches = false;
              if (resource === managedResource) {
                resourceMatches = true;
              } else if (resource.endsWith('s') && managedResource === resource.slice(0, -1)) {
                resourceMatches = true; // Handle singular/plural
              } else if (managedResource.endsWith('s') && resource === managedResource.slice(0, -1)) {
                resourceMatches = true; // Handle singular/plural
              }
              
              return resourceMatches;
            }
            
            // Check for '_all_' wildcard permissions
            const wpParts = wp.split('_');
            if (wpParts.length < 3) return false;
            
            const wpAction = wpParts[0]; // e.g., 'manage'
            const wpResource = wpParts.slice(2).join('_'); // e.g., 'resources'
            
            // 'manage' action includes all other actions
            const actionMatches = wpAction === 'manage' || wpAction === action;
            
            // Check if resource matches (singular/plural handling)
            let resourceMatches = false;
            if (resource === wpResource) {
              resourceMatches = true;
            } else if (resource.endsWith('s') && wpResource === resource.slice(0, -1)) {
              resourceMatches = true; // Handle singular/plural
            } else if (wpResource.endsWith('s') && resource === wpResource.slice(0, -1)) {
              resourceMatches = true; // Handle singular/plural
            }
            
            return actionMatches && resourceMatches;
          });
        });
        
        if (hasWildcardPermission) {
          // Add permissions to request for potential use in controllers
          req.userPermissions = userPermissions;
          return next();
        }
      }

      // Check for branch-specific permissions
      if (permissions.some(p => p.includes('_branch_'))) {
        const branchPermissions = permissions.map(p => {
          // Convert regular permission to branch-specific permission
          // e.g., 'view_customers' -> 'view_branch_customers'
          const parts = p.split('_');
          if (parts.length < 2) return p;
          
          const action = parts[0];
          const resource = parts.slice(1).join('_');
          
          return `${action}_branch_${resource}`;
        });
        
        // Check if user has any of the branch-specific permissions
        const hasBranchPermission = branchPermissions.some(permission =>
          userPermissions.includes(permission)
        );
        
        if (hasBranchPermission) {
          // Add permissions to request for potential use in controllers
          req.userPermissions = userPermissions;
          return next();
        }
      }

      // If we get here, user doesn't have permission
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin untuk mengakses resource ini",
        requiredPermissions: permissions,
      });
    } catch (error) {
      console.error("Error checking permissions:", error);
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat memeriksa izin",
        error: error.message,
      });
    }
  };
};

// Role authorization middleware (enhanced to support multiple roles)
exports.authorizeRole = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Akses tidak diizinkan, silakan login terlebih dahulu",
      });
    }

    try {
      // Use cached roles if available
      let userRoleCodes = [];
      
      if (req.user._userRoles) {
        // Use cached roles
        userRoleCodes = req.user._userRoles.map(ur => ur.roleId.kodeRole);
      } else {
        // Fetch roles if not cached
        const userRoles = await req.user.getRoles();
        userRoleCodes = userRoles.map(ur => ur.roleId.kodeRole);
        // Cache for future use
        req.user._userRoles = userRoles;
      }
      
      // Also include legacy role if it's not already in the list
      if (req.user.role && !userRoleCodes.includes(req.user.role)) {
        userRoleCodes.push(req.user.role);
      }
      
      // Check if any user role is in the allowed roles
      const hasDirectRole = roles.some(role => userRoleCodes.includes(role));
      
      if (hasDirectRole) {
        return next();
      }
      
      // Check for role hierarchy
      // Import the ROLE_HIERARCHY from rbac.js
      const Role = mongoose.model('Role');
      const ROLE_HIERARCHY = await Role.find({ isActive: true }).sort({ level: -1 }).select('kodeRole level');
      
      // Create a map of role levels
      const roleLevels = {};
      ROLE_HIERARCHY.forEach(role => {
        roleLevels[role.kodeRole] = role.level || 0;
      });
      
      // Check if any user role has higher or equal level than required roles
      const hasHierarchicalRole = userRoleCodes.some(userRole => {
        const userRoleLevel = roleLevels[userRole] || 0;
        return roles.some(requiredRole => {
          const requiredRoleLevel = roleLevels[requiredRole] || 0;
          return userRoleLevel >= requiredRoleLevel;
        });
      });
      
      if (hasHierarchicalRole) {
        return next();
      }
      
      // If we get here, user doesn't have required role
      return res.status(403).json({
        success: false,
        message: `Anda tidak memiliki peran yang diperlukan untuk mengakses resource ini`,
        requiredRoles: roles,
      });
    } catch (error) {
      console.error("Error checking roles:", error);
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat memeriksa peran",
        error: error.message,
      });
    }
  };
};

// Resource-based access control middleware
exports.checkResourceAccess = (resourceType, accessType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Akses tidak diizinkan, silakan login terlebih dahulu",
      });
    }

    try {
      // Get resource ID from request parameters
      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: "ID resource tidak ditemukan",
        });
      }

      // Check if user has permission based on resource type and access type
      let hasAccess = false;

      // Use cached permissions if available
      let userPermissions;
      if (req.user._permissions) {
        userPermissions = req.user._permissions;
      } else {
        userPermissions = await req.user.getAllPermissions();
        req.user._permissions = userPermissions;
      }

      // Check for super admin permission first
      if (userPermissions.includes('admin_access')) {
        return next();
      }

      // Check for global permission (e.g., manage_all_branches)
      const globalPermissions = [
        `manage_all_${resourceType}s`,
        `${accessType}_all_${resourceType}s`
      ];
      
      // Also check singular form
      if (resourceType.endsWith('s')) {
        globalPermissions.push(`manage_all_${resourceType.slice(0, -1)}s`);
        globalPermissions.push(`${accessType}_all_${resourceType.slice(0, -1)}s`);
      } else {
        globalPermissions.push(`manage_all_${resourceType}s`);
        globalPermissions.push(`${accessType}_all_${resourceType}s`);
      }
      
      if (globalPermissions.some(perm => userPermissions.includes(perm))) {
        return next();
      }

      // Check for branch-level permissions
      const branchPermissions = [
        `manage_branch_${resourceType}s`,
        `${accessType}_branch_${resourceType}s`
      ];
      
      // Also check singular form
      if (resourceType.endsWith('s')) {
        branchPermissions.push(`manage_branch_${resourceType.slice(0, -1)}s`);
        branchPermissions.push(`${accessType}_branch_${resourceType.slice(0, -1)}s`);
      } else {
        branchPermissions.push(`manage_branch_${resourceType}s`);
        branchPermissions.push(`${accessType}_branch_${resourceType}s`);
      }
      
      if (branchPermissions.some(perm => userPermissions.includes(perm))) {
        // For branch-specific resources, check if user belongs to the branch
        if (resourceType === 'branch') {
          if (req.user.isInBranch(resourceId)) {
            return next();
          }
        } else {
          // For other resources, check if they belong to user's branch
          try {
            const ModelName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
            // Handle plural forms
            const FinalModelName = ModelName.endsWith('s') ? ModelName : `${ModelName}`;
            
            const resource = await mongoose.model(FinalModelName).findById(resourceId);
            
            if (resource && resource.cabangId &&
                req.user.cabangId.toString() === resource.cabangId.toString()) {
              return next();
            }
          } catch (err) {
            console.log(`Resource branch check failed: ${err.message}`);
          }
        }
      }

      // Check for specific permission based on access type
      const specificPermissions = [
        `${accessType}_${resourceType}`,
        `manage_${resourceType}`
      ];
      
      // Also check singular/plural forms
      if (resourceType.endsWith('s')) {
        specificPermissions.push(`${accessType}_${resourceType.slice(0, -1)}`);
        specificPermissions.push(`manage_${resourceType.slice(0, -1)}`);
      } else {
        specificPermissions.push(`${accessType}_${resourceType}s`);
        specificPermissions.push(`manage_${resourceType}s`);
      }
      
      if (specificPermissions.some(perm => userPermissions.includes(perm))) {
        return next();
      }

      // Check for owner-based access (if resource has userId field)
      if (req.user._id) {
        try {
          const ModelName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
          // Handle plural forms
          const FinalModelName = ModelName.endsWith('s') ? ModelName : `${ModelName}`;
          
          const resource = await mongoose.model(FinalModelName).findById(resourceId);
          
          // Check if resource belongs to the user
          if (resource) {
            const isOwner = [
              resource.userId && resource.userId.toString() === req.user._id.toString(),
              resource.createdBy && resource.createdBy.toString() === req.user._id.toString(),
              resource.user && resource.user.toString() === req.user._id.toString(),
              resource.owner && resource.owner.toString() === req.user._id.toString()
            ].some(condition => condition === true);
            
            if (isOwner) {
              // Check if user has owner permission
              const ownerPermissions = [
                `${accessType}_own_${resourceType}`,
                `manage_own_${resourceType}`
              ];
              
              // Also check singular/plural forms
              if (resourceType.endsWith('s')) {
                ownerPermissions.push(`${accessType}_own_${resourceType.slice(0, -1)}`);
                ownerPermissions.push(`manage_own_${resourceType.slice(0, -1)}`);
              } else {
                ownerPermissions.push(`${accessType}_own_${resourceType}s`);
                ownerPermissions.push(`manage_own_${resourceType}s`);
              }
              
              if (ownerPermissions.some(perm => userPermissions.includes(perm))) {
                return next();
              }
            }
          }
        } catch (err) {
          // Ignore errors if model doesn't exist or doesn't have userId field
          console.log(`Resource ownership check failed: ${err.message}`);
        }
      }

      // If we get here, user doesn't have access
      return res.status(403).json({
        success: false,
        message: `Anda tidak memiliki izin untuk ${accessType} ${resourceType} ini`,
      });
    } catch (error) {
      console.error("Error checking resource access:", error);
      return res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat memeriksa akses resource",
        error: error.message,
      });
    }
  };
};
