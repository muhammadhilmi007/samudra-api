const express = require('express');
const {
  getBankStatements,
  getBankStatement,
  createBankStatement,
  updateBankStatement,
  validateBankStatement,
  getBankStatementsByBranch,
  getBankStatementsByDateRange,
  getBankSummary
} = require('../controllers/bankController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-branch/:branchId', validateObjectId('branchId'), getBankStatementsByBranch);
router.get('/by-date-range', getBankStatementsByDateRange);
router.get('/summary', getBankSummary);
router.put('/:id/validate', validateObjectId(), authorize('direktur', 'manajer_keuangan', 'kasir', 'staff_admin'), validateBankStatement);

// Restrict bank statement management to finance roles
const financeRoles = ['direktur', 'manajer_keuangan', 'kasir', 'staff_admin'];

// CRUD routes
router
  .route('/')
  .get(getBankStatements)
  .post(authorize(...financeRoles), createBankStatement);

router
  .route('/:id')
  .get(validateObjectId(), getBankStatement)
  .put(validateObjectId(), authorize(...financeRoles), updateBankStatement);

module.exports = router;