const express = require('express');
const {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  updateAssetStatus,
  calculateDepreciation,
  getAssetsByBranch,
  getAssetsByType,
  getAssetsByStatus
} = require('../controllers/assetController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.post('/calculate-depreciation', authorize('direktur', 'manajer_keuangan'), calculateDepreciation);
router.get('/by-branch/:branchId', validateObjectId('branchId'), getAssetsByBranch);
router.get('/by-type/:type', getAssetsByType);
router.get('/by-status/:status', getAssetsByStatus);

// CRUD routes
router
  .route('/')
  .get(getAssets)
  .post(authorize('direktur', 'manajer_keuangan', 'manajer_admin', 'kepala_cabang'), createAsset);

router
  .route('/:id')
  .get(validateObjectId(), getAsset)
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'manajer_admin', 'kepala_cabang'), updateAsset)
  .delete(validateObjectId(), authorize('direktur', 'manajer_keuangan'), deleteAsset);

router
  .route('/:id/status')
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'manajer_admin', 'kepala_cabang'), updateAssetStatus);

module.exports = router;