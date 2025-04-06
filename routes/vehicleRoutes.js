// routes/vehicleRoutes.js
const express = require('express');
const multer = require('multer');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehiclesByBranch,
  getTrucks,
  getDeliveryVehicles,
  uploadVehiclePhoto, // Add this controller
  uploadVehicleDocument // Add this controller
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

// File upload routes
router.post('/:id/upload-photo', validateObjectId(), uploadVehiclePhoto);
router.post('/:id/upload-document', validateObjectId(), uploadVehicleDocument);

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
