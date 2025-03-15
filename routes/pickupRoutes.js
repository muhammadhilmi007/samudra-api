const express = require('express');
const {
  getPickups,
  getPickup,
  createPickup,
  updatePickup,
  deletePickup,
  addSTTToPickup,
  removeSTTFromPickup,
  getPickupsBySender
} = require('../controllers/pickupController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-sender/:senderId', validateObjectId('senderId'), getPickupsBySender);
router.put('/:id/add-stt', validateObjectId(), authorize('kepala_cabang', 'kepala_gudang', 'staff_admin'), addSTTToPickup);
router.put('/:id/remove-stt', validateObjectId(), authorize('kepala_cabang', 'kepala_gudang', 'staff_admin'), removeSTTFromPickup);

// CRUD routes
router
  .route('/')
  .get(getPickups)
  .post(authorize('kepala_cabang', 'kepala_gudang', 'staff_admin'), createPickup);

router
  .route('/:id')
  .get(validateObjectId(), getPickup)
  .put(validateObjectId(), authorize('kepala_cabang', 'kepala_gudang', 'staff_admin'), updatePickup)
  .delete(validateObjectId(), authorize('direktur', 'kepala_cabang', 'kepala_gudang'), deletePickup);

module.exports = router;