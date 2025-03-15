const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

// Import controllers for mobile endpoints
const pickupRequestController = require('../controllers/pickupRequestController');
const truckQueueController = require('../controllers/truckQueueController');
const sttController = require('../controllers/sttController');
const deliveryController = require('../controllers/deliveryController');

const router = express.Router();

// Public tracking route (no auth required)
router.get('/tracking/:sttNumber', sttController.trackSTT);

// Protected routes
router.use(protect);

// Pickup request routes (for drivers)
router.get(
  '/pickup-requests',
  authorize('supir', 'kenek', 'checker'),
  pickupRequestController.getPendingPickupRequests
);

router.put(
  '/pickup-requests/:id/status',
  validateObjectId(),
  authorize('supir', 'kenek', 'checker'),
  pickupRequestController.updatePickupRequestStatus
);

// Truck queue routes (for warehouse managers and checkers)
router.get(
  '/truck-queues',
  authorize('kepala_gudang', 'checker'),
  truckQueueController.getTruckQueues
);

router.post(
  '/truck-queues',
  authorize('kepala_gudang', 'checker'),
  truckQueueController.createTruckQueue
);

// STT assignment to trucks (for checkers)
router.get(
  '/stt/truck-assignment',
  authorize('checker', 'kepala_gudang'),
  sttController.getSTTsForTruckAssignment  // This function is undefined
);

router.post(
  '/stt/truck-assignment',
  authorize('checker', 'kepala_gudang'),
  sttController.assignSTTToTruck  // This might also be undefined
);

// Delivery routes (for drivers and checkers)
router.get(
  '/deliveries',
  authorize('supir', 'checker', 'kepala_gudang'),
  deliveryController.getDeliveriesForMobile
);

router.put(
  '/deliveries/:id/status',
  validateObjectId(),
  authorize('supir', 'checker', 'kepala_gudang'),
  deliveryController.updateDeliveryStatus
);

module.exports = router;