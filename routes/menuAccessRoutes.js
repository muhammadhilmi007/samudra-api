// routes/menuAccessRoutes.js
const express = require('express');
const {
  getMenuAccesses,
  getMenuAccessByRole,
  getMenuAccessByMenu,
  getMenuAccess,
  createOrUpdateMenuAccess,
  updateMenuAccess,
  deleteMenuAccess,
  batchUpdateMenuAccessForRole
} = require('../controllers/menuAccessController');
const { protect, checkPermission } = require('../middlewares/auth');
const { validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get menu access by role
router.get(
  '/by-role/:roleId',
  checkPermission('manage_menus', 'manage_roles', 'view_roles'),
  validateObjectId('roleId'),
  getMenuAccessByRole
);

// Get menu access by menu
router.get(
  '/by-menu/:menuId',
  checkPermission('manage_menus', 'view_menus'),
  validateObjectId('menuId'),
  getMenuAccessByMenu
);

// Batch update menu access for a role
router.put(
  '/batch/role/:roleId',
  checkPermission('manage_menus', 'manage_roles'),
  validateObjectId('roleId'),
  batchUpdateMenuAccessForRole
);

// Standard CRUD routes
router
  .route('/')
  .get(
    checkPermission('manage_menus', 'manage_roles', 'view_roles'),
    getMenuAccesses
  )
  .post(
    checkPermission('manage_menus', 'manage_roles'),
    createOrUpdateMenuAccess
  );

router
  .route('/:id')
  .get(
    checkPermission('manage_menus', 'manage_roles', 'view_roles'),
    validateObjectId('id'),
    getMenuAccess
  )
  .put(
    checkPermission('manage_menus', 'manage_roles'),
    validateObjectId('id'),
    updateMenuAccess
  )
  .delete(
    checkPermission('manage_menus', 'manage_roles'),
    validateObjectId('id'),
    deleteMenuAccess
  );

module.exports = router;