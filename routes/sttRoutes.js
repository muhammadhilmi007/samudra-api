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

const router = express.Router();

// Public route for tracking
router.get('/track/:sttNumber', trackSTT);

// Protected routes
router.use(protect);

router
  .route('/')
  .get(getSTTs)
  .post(authorize('staff_penjualan', 'kepala_cabang', 'staff_admin'), createSTT);

router
  .route('/:id')
  .get(getSTT)
  .put(authorize('staff_penjualan', 'kepala_cabang', 'staff_admin'), updateSTT);

router
  .route('/:id/status')
  .put(authorize('staff_penjualan', 'kepala_cabang', 'staff_admin', 'checker'), updateSTTStatus);

router
  .route('/generate-pdf/:id')
  .get(generatePDF);

router
  .route('/by-branch/:branchId')
  .get(getSTTsByBranch);

router
  .route('/by-status/:status')
  .get(getSTTsByStatus);

module.exports = router;