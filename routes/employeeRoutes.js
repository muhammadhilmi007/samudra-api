// routes/employeeRoutes.js
const express = require('express');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByBranch
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadFields } = require('../middlewares/upload');
const { validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Set up file upload config
const uploadConfig = [
  { name: 'fotoProfil', maxCount: 1 },
  { name: 'dokumen.ktp', maxCount: 1 },
  { name: 'dokumen.npwp', maxCount: 1 }
];

// Protect all routes
router.use(protect);

router
  .route('/')
  .get(getEmployees)
  .post(
    authorize('direktur', 'manajer_admin', 'manajer_sdm', 'kepala_cabang'),
    uploadFields(uploadConfig),
    createEmployee
  );

router
  .route('/:id')
  .get(validateObjectId('id'), getEmployeeById)
  .put(
    authorize('direktur', 'manajer_admin', 'manajer_sdm', 'kepala_cabang'),
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

module.exports = router;