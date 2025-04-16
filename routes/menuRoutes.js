// routes/menuRoutes.js
const express = require('express');
const {
  getMenus,
  getMenuTree,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
  getUserMenus
} = require('../controllers/menuController');
const { protect, checkPermission } = require('../middlewares/auth');
const { getUserMenus: getUserMenusMiddleware } = require('../middlewares/menuAuth');
const { validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get user's accessible menus
router.get(
  '/user',
  getUserMenusMiddleware,
  getUserMenus
);

// Menu tree structure
router.get(
  '/tree',
  checkPermission('manage_menus', 'view_menus'),
  getMenuTree
);

// Standard CRUD routes
router
  .route('/')
  .get(
    checkPermission('manage_menus', 'view_menus'),
    getMenus
  )
  .post(
    checkPermission('manage_menus'),
    createMenu
  );

router
  .route('/:id')
  .get(
    checkPermission('manage_menus', 'view_menus'),
    validateObjectId('id'),
    getMenu
  )
  .put(
    checkPermission('manage_menus'),
    validateObjectId('id'),
    updateMenu
  )
  .delete(
    checkPermission('manage_menus'),
    validateObjectId('id'),
    deleteMenu
  );

module.exports = router;