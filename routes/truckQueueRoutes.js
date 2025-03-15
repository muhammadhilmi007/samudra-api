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

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-branch/:branchId', validateObjectId('branchId'), getTruckQueuesByBranch);
router.get('/by-status/:status', getTruckQueuesByStatus);
router.put('/:id/status', validateObjectId(), updateTruckQueueStatus);

// CRUD routes
router
  .route('/')
  .get(getTruckQueues)
  .post(authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang', 'checker'), createTruckQueue);

router
  .route('/:id')
  .get(validateObjectId(), getTruckQueue)
  .put(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang', 'checker'), updateTruckQueue)
  .delete(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang'), deleteTruckQueue);

module.exports = router;