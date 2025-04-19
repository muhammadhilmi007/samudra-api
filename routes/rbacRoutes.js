const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const { protect, authorizeRole } = require('../middlewares/auth');

// Role routes
router.route('/roles')
  .get(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.getRoles)
  .post(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.createRole);

router.route('/roles/:id')
  .get(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.getRole)
  .put(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.updateRole)
  .delete(protect, authorizeRole(['direktur']), rbacController.deleteRole);

// Permission routes
router.route('/permissions')
  .get(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.getPermissions)
  .post(protect, authorizeRole(['direktur']), rbacController.createPermission);

router.route('/permissions/:id')
  .put(protect, authorizeRole(['direktur']), rbacController.updatePermission)
  .delete(protect, authorizeRole(['direktur']), rbacController.deletePermission);

// Role-Permission management
router.route('/roles/:id/permissions')
  .get(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.getRolePermissions)
  .post(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.assignPermissionsToRole);

// Role-User management
router.route('/roles/:id/users')
  .get(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.getRoleUsers);

// User-Role management
router.route('/users/:id/roles')
  .get(protect, authorizeRole(['manajer_admin', 'direktur']), rbacController.getUserRoles);

module.exports = router;
