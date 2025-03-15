const express = require('express');
const {
  getPickupRequests,
  getPickupRequest,
  createPickupRequest,
  updatePickupRequest,
  updatePickupRequestStatus,
  getPendingPickupRequests,
  deletePickupRequest
} = require('../controllers/pickupRequestController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');
const { pickupRequestSchema } = require('../utils/validators');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/pending', getPendingPickupRequests);

// Status update route
router
  .route('/:id/status')
  .put(validateObjectId(), authorize('staff_admin', 'kepala_cabang', 'kepala_gudang', 'supir'), updatePickupRequestStatus);

// CRUD routes
router
  .route('/')
  .get(getPickupRequests)
  .post(validateBody(pickupRequestSchema), createPickupRequest);

router
  .route('/:id')
  .get(validateObjectId(), getPickupRequest)
  .put(validateObjectId(), validateBody(pickupRequestSchema), authorize('staff_admin', 'kepala_cabang'), updatePickupRequest)
  .delete(validateObjectId(), authorize('staff_admin', 'kepala_cabang'), deletePickupRequest);

module.exports = router;