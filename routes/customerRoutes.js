const express = require('express');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getSenders,
  getRecipients,
  getCustomersByBranch
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
router.get('/by-branch/:branchId', validateObjectId('branchId'), getCustomersByBranch);

// CRUD routes
router
  .route('/')
  .get(getCustomers)
  .post(validateBody(customerSchema), createCustomer);

router
  .route('/:id')
  .get(validateObjectId(), getCustomer)
  .put(validateObjectId(), validateBody(customerSchema), updateCustomer)
  .delete(validateObjectId(), authorize('direktur', 'manajer_admin', 'kepala_cabang'), deleteCustomer);

module.exports = router;