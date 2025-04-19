// routes/userRoleRoutes.js
const express = require('express');
const {
  getUserRoles,
  getUserRolesByUser,
  getUserRolesByRole,
  createUserRole,
  updateUserRole,
  deleteUserRole,
  batchUpdateUserRoles
} = require('../controllers/userRoleController');

const { protect, checkPermission } = require('../middlewares/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Get all user-roles
router.get(
  '/',
  checkPermission('manage_employees', 'view_employees', 'manage_roles', 'view_roles'),
  getUserRoles
);

// Get user-roles by user
router.get(
  '/by-user/:userId',
  checkPermission('manage_employees', 'view_employees'),
  getUserRolesByUser
);

// Get user-roles by role
router.get(
  '/by-role/:roleId',
  checkPermission('manage_roles', 'view_roles'),
  getUserRolesByRole
);

// Create user-role mapping
router.post(
  '/',
  checkPermission('manage_employees'),
  createUserRole
);

// Update user-role mapping
router.put(
  '/:id',
  checkPermission('manage_employees'),
  updateUserRole
);

// Delete user-role mapping
router.delete(
  '/:id',
  checkPermission('manage_employees'),
  deleteUserRole
);

// Batch update user roles
router.post(
  '/batch',
  checkPermission('manage_employees'),
  batchUpdateUserRoles
);

module.exports = router;