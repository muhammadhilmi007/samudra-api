const express = require('express');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehiclesByBranch,
  getTrucks,
  getDeliveryVehicles
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/trucks', getTrucks);
router.get('/delivery', getDeliveryVehicles);
router.get('/by-branch/:branchId', validateObjectId('branchId'), getVehiclesByBranch);

// CRUD routes
router
  .route('/')
  .get(getVehicles)
  .post(authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang'), createVehicle);

router
  .route('/:id')
  .get(validateObjectId(), getVehicle)
  .put(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang', 'kepala_gudang'), updateVehicle)
  .delete(validateObjectId(), authorize('direktur', 'manajer_operasional', 'kepala_cabang'), deleteVehicle);

module.exports = router;