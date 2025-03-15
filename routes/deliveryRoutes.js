const express = require('express');
const {
  getDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  getDeliveriesBySTT,
  getDeliveriesByVehicle,
  generateDeliveryForm
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-stt/:sttId', validateObjectId('sttId'), getDeliveriesBySTT);
router.get('/by-vehicle/:vehicleId', validateObjectId('vehicleId'), getDeliveriesByVehicle);
router.get('/generate-form/:id', validateObjectId(), generateDeliveryForm);
router.put('/:id/status', validateObjectId(), authorize('supir', 'checker', 'kepala_gudang', 'kepala_cabang'), updateDeliveryStatus);

// CRUD routes
router
  .route('/')
  .get(getDeliveries)
  .post(authorize('kepala_gudang', 'checker', 'kepala_cabang', 'staff_admin'), createDelivery);

router
  .route('/:id')
  .get(validateObjectId(), getDelivery)
  .put(validateObjectId(), authorize('kepala_gudang', 'checker', 'kepala_cabang', 'staff_admin'), updateDelivery);

module.exports = router;