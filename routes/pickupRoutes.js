// routes/pickupRoutes.js - Improved version
const express = require('express');
const {
  getPickups,
  getPickup,
  createPickup,
  updatePickup,
  deletePickup,
  addSTTToPickup,
  removeSTTFromPickup,
  getPickupsBySender,
  updatePickupStatus
} = require('../controllers/pickupController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-sender/:senderId', getPickupsBySender);
router.put('/:id/add-stt', addSTTToPickup);
router.put('/:id/remove-stt', removeSTTFromPickup);
router.put('/:id/status', updatePickupStatus);

// CRUD routes
router
  .route('/')
  .get(getPickups)
  .post(authorize('admin', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), createPickup);

router
  .route('/:id')
  .get(getPickup)
  .put(authorize('admin', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), updatePickup)
  .delete(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang'), deletePickup);

module.exports = router;
