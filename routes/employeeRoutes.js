// routes/employeeRoutes.js
const express = require('express');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByBranch,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/employeeController');

const { protect, authorize, checkPermission } = require('../middlewares/auth');
const { uploadFields } = require('../middlewares/upload');
const { validateObjectId, validateBody } = require('../middlewares/validator');
const { employeeSchema, roleSchema } = require('../validations/employeeValidation');

const router = express.Router();

// Set up file upload config
const uploadConfig = [
  { name: 'fotoProfil', maxCount: 1 },
  { name: 'dokumen.ktp', maxCount: 1 },
  { name: 'dokumen.npwp', maxCount: 1 }
];

// Protect all routes
router.use(protect);

// Employee routes
router
  .route('/')
  .get(getEmployees)
  .post(
    authorize('direktur', 'manajer_admin', 'manajer_sdm', 'kepala_cabang'),
    uploadFields(uploadConfig),
    validateBody(employeeSchema),
    createEmployee
  );

router
  .route('/:id')
  .get(validateObjectId('id'), getEmployeeById)
  .put(
    validateObjectId('id'),
    uploadFields(uploadConfig),
    updateEmployee
  )
  .delete(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateObjectId('id'),
    deleteEmployee
  );

router
  .route('/by-branch/:branchId')
  .get(validateObjectId('branchId'), getEmployeesByBranch);

// Role routes
router
  .route('/roles')
  .get(getRoles)
  .post(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateBody(roleSchema),
    createRole
  );

router
  .route('/roles/:id')
  .get(validateObjectId('id'), getRoleById)
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