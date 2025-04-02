// routes/customerRoutes.js
const express = require('express');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getSenders,
  getRecipients,
  getCustomersByBranch,
  getCustomerSTTs,
  getCustomerCollections,
  getCustomerPickups
} = require('../controllers/customerController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');
const { customerSchema } = require('../utils/validators');

const router = express.Router();

// Protect all routes
router.use(protect);

// Public routes (for authenticated users)
router.get('/senders', getSenders);
router.get('/recipients', getRecipients);
router.get('/customers/senders', getSenders);
router.get('/customers/recipients', getRecipients);
router.get('/customers/by-branch/:branchId', getCustomersByBranch);
router.get('/customers/:id/stts', getCustomerSTTs);
router.get('/customers/:id/collections', getCustomerCollections);
router.get('/customers/:id/pickups', getCustomerPickups);
router.get('/by-branch/:branchId', validateObjectId('branchId'), getCustomersByBranch);

// Customer related data routes
router.get('/:customerId/stts', validateObjectId('customerId'), getCustomerSTTs);
router.get('/:customerId/collections', validateObjectId('customerId'), getCustomerCollections);
router.get('/:customerId/pickups', validateObjectId('customerId'), getCustomerPickups);


// CRUD routes
router
  .route('/')
  .get(getCustomers)
  .post(validateBody(customerSchema), createCustomer);

router
  .route('/:id')
  .get(validateObjectId('id'), getCustomer)
  .put(validateObjectId('id'), validateBody(customerSchema), updateCustomer)
  .delete(validateObjectId('id'), authorize('direktur', 'manajer_admin', 'kepala_cabang'), deleteCustomer);

module.exports = router;