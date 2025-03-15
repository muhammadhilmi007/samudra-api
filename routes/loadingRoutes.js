const express = require('express');
const {
  getLoadings,
  getLoading,
  createLoading,
  updateLoading,
  updateLoadingStatus,
  getLoadingsBySTT,
  getLoadingsByTruck,
  generateDMB
} = require('../controllers/loadingController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-stt/:sttId', validateObjectId('sttId'), getLoadingsBySTT);
router.get('/by-truck/:truckId', validateObjectId('truckId'), getLoadingsByTruck);
router.get('/generate-dmb/:id', validateObjectId(), generateDMB);
router.put('/:id/status', validateObjectId(), authorize('kepala_gudang', 'checker', 'kepala_cabang'), updateLoadingStatus);

// CRUD routes
router
  .route('/')
  .get(getLoadings)
  .post(authorize('kepala_gudang', 'checker', 'kepala_cabang'), createLoading);

router
  .route('/:id')
  .get(validateObjectId(), getLoading)
  .put(validateObjectId(), authorize('kepala_gudang', 'checker', 'kepala_cabang'), updateLoading);

module.exports = router;