// routes/vehicleRoutes.js
const express = require('express');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehiclesByBranch,
  getTrucks,
  getDeliveryVehicles,
  uploadVehiclePhoto,
  uploadVehicleDocument,
  getAvailableVehiclesForPickup,
  getAvailableVehiclesForLoading,
  getMobileVehicles
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middlewares/auth');
const { validateObjectId } = require('../middlewares/validator');
const asyncHandler = require('../middlewares/asyncHandler');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/trucks', asyncHandler(getTrucks));
router.get('/delivery', asyncHandler(getDeliveryVehicles));
router.get('/by-branch/:branchId', validateObjectId('branchId'), asyncHandler(getVehiclesByBranch));
router.get('/available-for-pickup', asyncHandler(getAvailableVehiclesForPickup));
router.get('/available-for-loading', asyncHandler(getAvailableVehiclesForLoading));
router.get('/mobile', asyncHandler(getMobileVehicles));

// File upload routes
router.post('/:id/upload-photo', validateObjectId(), asyncHandler(uploadVehiclePhoto));
router.post('/:id/upload-document', validateObjectId(), asyncHandler(uploadVehicleDocument));

// CRUD routes
router
  .route('/')
  .get(asyncHandler(getVehicles))
  .post(
    authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang'),
    asyncHandler(createVehicle)
  );

router
  .route('/:id')
  .get(validateObjectId(), asyncHandler(getVehicle))
  .put(
    validateObjectId(),
    authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang'),
    asyncHandler(updateVehicle)
  )
  .delete(
    validateObjectId(),
    authorize('direktur', 'manajer_operasional', 'kepala_cabang'),
    asyncHandler(deleteVehicle)
  );

module.exports = router;