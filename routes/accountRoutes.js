const express = require('express');
const {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountsByType
} = require('../controllers/accountController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-type/:type', getAccountsByType);

// Restrict account management to finance roles
const financeRoles = ['direktur', 'manajer_keuangan', 'kasir', 'staff_admin'];

// CRUD routes
router
  .route('/')
  .get(getAccounts)
  .post(authorize(...financeRoles), createAccount);

router
  .route('/:id')
  .get(validateObjectId(), getAccount)
  .put(validateObjectId(), authorize(...financeRoles), updateAccount)
  .delete(validateObjectId(), authorize('direktur', 'manajer_keuangan'), deleteAccount);

module.exports = router;