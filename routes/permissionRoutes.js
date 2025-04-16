// routes/permissionRoutes.js
const express = require('express');
const {
  getPermissions,
  getPermissionsByCategory,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionCategories,
  syncPermissions
} = require('../controllers/permissionController');
const { protect, checkPermission } = require('../middlewares/auth');
const { validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get permissions by category
router.get(
  '/by-category',
  checkPermission('manage_roles', 'view_roles'),
  getPermissionsByCategory
);

// Get permission categories
router.get(
  '/categories',
  checkPermission('manage_roles', 'view_roles'),
  getPermissionCategories
);

// Sync permissions with Role model
router.post(
  '/sync',
  checkPermission('manage_roles'),
  syncPermissions
);

// Standard CRUD routes
router
  .route('/')
  .get(
    checkPermission('manage_roles', 'view_roles'),
    getPermissions
  )
  .post(
    checkPermission('manage_roles'),
    createPermission
  );

router
  .route('/:id')
  .get(
    checkPermission('manage_roles', 'view_roles'),
    validateObjectId('id'),
    getPermission
  )
  .put(
    checkPermission('manage_roles'),
    validateObjectId('id'),
    updatePermission
  )
  .delete(
    checkPermission('manage_roles'),
    validateObjectId('id'),
    deletePermission
  );

module.exports = router;