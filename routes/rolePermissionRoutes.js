// routes/rolePermissionRoutes.js
const express = require('express');
const {
  getRolePermissions,
  getRolePermissionsByRole,
  getRolePermissionsByPermission,
  createRolePermission,
  deleteRolePermission,
  batchUpdateRolePermissions
} = require('../controllers/rolePermissionController');

const { protect, checkPermission } = require('../middlewares/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Get all role-permissions
router.get(
  '/',
  checkPermission('manage_permissions', 'view_permissions'),
  getRolePermissions
);

// Get role-permissions by role
router.get(
  '/by-role/:roleId',
  checkPermission('manage_permissions', 'view_permissions', 'manage_roles', 'view_roles'),
  getRolePermissionsByRole
);

// Get role-permissions by permission
router.get(
  '/by-permission/:permissionId',
  checkPermission('manage_permissions', 'view_permissions'),
  getRolePermissionsByPermission
);

// Create role-permission mapping
router.post(
  '/',
  checkPermission('manage_permissions'),
  createRolePermission
);

// Delete role-permission mapping
router.delete(
  '/:id',
  checkPermission('manage_permissions'),
  deleteRolePermission
);

// Batch update role permissions
router.post(
  '/batch',
  checkPermission('manage_permissions', 'manage_roles'),
  batchUpdateRolePermissions
);

module.exports = router;