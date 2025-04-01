// routes/pickupRequestRoutes.js
const express = require('express');
const {
  getPickupRequests,
  getPickupRequest,
  createPickupRequest,
  updatePickupRequest,
  updatePickupRequestStatus,
  getPendingPickupRequests,
  deletePickupRequest,
  linkToPickup,
  getPickupRequestsByCustomer
} = require('../controllers/pickupRequestController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/pending', getPendingPickupRequests);
router.get('/customer/:customerId', getPickupRequestsByCustomer);

// Status update and link routes
router
  .route('/:id/status')
  .put(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), updatePickupRequestStatus);

router
  .route('/:id/link')
  .put(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), linkToPickup);

// CRUD routes
router
  .route('/')
  .get(getPickupRequests)
  .post(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), createPickupRequest);

router
  .route('/:id')
  .get(getPickupRequest)
  .put(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), updatePickupRequest)
  .delete(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang'), deletePickupRequest);

module.exports = router;