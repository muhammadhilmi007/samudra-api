// routes/pickupRequestRoutes.js
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

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/pending', getPendingPickupRequests);

// Status update route
router
  .route('/:id/status')
  .put(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), updatePickupRequestStatus);

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