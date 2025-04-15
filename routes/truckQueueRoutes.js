const express = require('express');
const {
  getTruckQueues,
  getTruckQueue,
  createTruckQueue,
  updateTruckQueue,
  deleteTruckQueue,
  updateTruckQueueStatus,
  getTruckQueuesByBranch,
  getTruckQueuesByStatus
} = require('../controllers/truckQueueController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');
const asyncHandler = require('../middlewares/asyncHandler');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-branch/:branchId', validateObjectId('branchId'), asyncHandler(getTruckQueuesByBranch));
router.get('/by-status/:status', asyncHandler(getTruckQueuesByStatus));
router.put('/:id/status', validateObjectId(), asyncHandler(updateTruckQueueStatus));

// CRUD routes
router
  .route('/')
  .get(asyncHandler(getTruckQueues))
  .post(authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang', 'checker'), asyncHandler(createTruckQueue));

router
  .route('/:id')
  .get(validateObjectId(), asyncHandler(getTruckQueue))
  .put(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang', 'checker'), asyncHandler(updateTruckQueue))
  .delete(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang'), asyncHandler(deleteTruckQueue));

module.exports = router;
