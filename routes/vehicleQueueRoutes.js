const express = require('express');
const {
  getVehicleQueues,
  getVehicleQueue,
  createVehicleQueue,
  updateVehicleQueue,
  deleteVehicleQueue,
  updateVehicleQueueStatus,
  getVehicleQueuesByBranch,
  getVehicleQueuesByStatus
} = require('../controllers/vehicleQueueController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');
const asyncHandler = require('../middlewares/asyncHandler');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-branch/:branchId', validateObjectId('branchId'), asyncHandler(getVehicleQueuesByBranch));
router.get('/by-status/:status', asyncHandler(getVehicleQueuesByStatus));
router.put('/:id/status', validateObjectId(), asyncHandler(updateVehicleQueueStatus));

// CRUD routes
router
  .route('/')
  .get(asyncHandler(getVehicleQueues))
  .post(authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang', 'checker'), asyncHandler(createVehicleQueue));

router
  .route('/:id')
  .get(validateObjectId(), asyncHandler(getVehicleQueue))
  .put(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang', 'checker'), asyncHandler(updateVehicleQueue))
  .delete(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang'), asyncHandler(deleteVehicleQueue));

module.exports = router;
