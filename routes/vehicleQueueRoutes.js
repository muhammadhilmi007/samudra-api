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

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-branch/:branchId', validateObjectId('branchId'), getVehicleQueuesByBranch);
router.get('/by-status/:status', getVehicleQueuesByStatus);
router.put('/:id/status', validateObjectId(), updateVehicleQueueStatus);

// CRUD routes
router
  .route('/')
  .get(getVehicleQueues)
  .post(authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang', 'checker'), createVehicleQueue);

router
  .route('/:id')
  .get(validateObjectId(), getVehicleQueue)
  .put(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang', 'checker'), updateVehicleQueue)
  .delete(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang'), deleteVehicleQueue);

module.exports = router;