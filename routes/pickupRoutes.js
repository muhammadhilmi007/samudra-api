// routes/pickupRoutes.js
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
  updatePickupStatus,
  getPickupsByDriver // Tambahkan fungsi baru
} = require('../controllers/pickupController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-sender/:senderId', getPickupsBySender);
// Tambahkan route baru untuk mendapatkan pickup berdasarkan supir
router.get('/by-driver/:driverId', getPickupsByDriver);
router.put('/:id/add-stt', authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), addSTTToPickup);
router.put('/:id/remove-stt', authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), removeSTTFromPickup);
router.put('/:id/status', authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional', 'supir'), updatePickupStatus);

// CRUD routes
router
  .route('/')
  .get(getPickups)
  .post(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), createPickup);

router
  .route('/:id')
  .get(getPickup)
  .put(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang', 'stafOperasional'), updatePickup)
  .delete(authorize('admin', 'direktur', 'manajerOperasional', 'kepalaGudang'), deletePickup);

module.exports = router;