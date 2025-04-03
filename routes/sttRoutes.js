const express = require('express');
const {
  getSTTs,
  getSTT,
  createSTT,
  updateSTT,
  updateSTTStatus,
  generatePDF,
  trackSTT,
  getSTTsByBranch,
  getSTTsByStatus
} = require('../controllers/sttController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');
const { sttSchema, statusUpdateSchema } = require('../utils/validators');

const router = express.Router();

// Public route for tracking
router.get('/track/:sttNumber', trackSTT);

// Protected routes
router.use(protect);

router
  .route('/')
  .get(getSTTs)
  .post(
    authorize('administrator', 'direktur', 'staff_penjualan', 'kepala_cabang', 'staff_admin'),
    // validateBody(sttSchema),
    createSTT
  );

router
  .route('/:id')
  .get(validateObjectId('id'), getSTT)
  .put(
    validateObjectId('id'),
    authorize('administrator', 'direktur', 'staff_penjualan', 'kepala_cabang', 'staff_admin'),
    // validateBody(sttSchema),
    updateSTT
  );

router
  .route('/:id/status')
  .put(
    validateObjectId('id'),
    authorize('administrator', 'direktur', 'staff_penjualan', 'kepala_cabang', 'staff_admin', 'checker'),
    // validateBody(statusUpdateSchema),
    updateSTTStatus
  );

router
  .route('/generate-pdf/:id')
  .get(validateObjectId('id'), generatePDF);

router
  .route('/by-branch/:branchId')
  .get(validateObjectId('branchId'), getSTTsByBranch);

router
  .route('/by-status/:status')
  .get(getSTTsByStatus);

module.exports = router;