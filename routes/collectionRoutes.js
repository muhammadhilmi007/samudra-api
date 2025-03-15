const express = require('express');
const {
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  updateCollectionStatus,
  addPayment,
  getCollectionsByCustomer,
  getCollectionsByStatus,
  generateInvoice
} = require('../controllers/collectionController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-customer/:customerId', validateObjectId('customerId'), getCollectionsByCustomer);
router.get('/by-status/:status', getCollectionsByStatus);
router.get('/generate-invoice/:id', validateObjectId(), generateInvoice);
router.put('/:id/status', validateObjectId(), authorize('kasir', 'debt_collector', 'kepala_cabang', 'manajer_keuangan'), updateCollectionStatus);
router.put('/:id/payment', validateObjectId(), authorize('kasir', 'debt_collector', 'kepala_cabang', 'manajer_keuangan'), addPayment);

// CRUD routes
router
  .route('/')
  .get(getCollections)
  .post(authorize('kasir', 'debt_collector', 'kepala_cabang', 'staff_admin'), createCollection);

router
  .route('/:id')
  .get(validateObjectId(), getCollection)
  .put(validateObjectId(), authorize('kasir', 'debt_collector', 'kepala_cabang', 'staff_admin'), updateCollection);

module.exports = router;