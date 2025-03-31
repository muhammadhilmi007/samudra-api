// routes/roleRoutes.js (baru, jika belum ada)
const express = require('express');
const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/roleController');
const { protect, authorize } = require('../middlewares/auth');
const { validateObjectId, validateBody } = require('../middlewares/validator');
const { roleSchema } = require('../validations/employeeValidation');

const router = express.Router();

// Protect all routes
router.use(protect);

router
  .route('/')
  .get(getRoles)
  .post(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateBody(roleSchema),
    createRole
  );

router
  .route('/:id')
  .get(validateObjectId('id'), getRole)
  .put(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateObjectId('id'),
    validateBody(roleSchema),
    updateRole
  )
  .delete(
    authorize('direktur'),
    validateObjectId('id'),
    deleteRole
  );

module.exports = router;