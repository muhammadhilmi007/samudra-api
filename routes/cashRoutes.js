const express = require('express');
const {
  // Branch cash functions
  getBranchCashTransactions,
  getBranchCashTransaction,
  createBranchCashTransaction,
  updateBranchCashTransaction,
  getBranchCashTransactionsByBranch,
  getBranchCashTransactionsByType,
  getBranchCashTransactionsByDateRange,
  
  // Headquarters cash functions
  getHeadquartersCashTransactions,
  getHeadquartersCashTransaction,
  createHeadquartersCashTransaction,
  updateHeadquartersCashTransaction,
  updateHeadquartersCashTransactionStatus,
  getHeadquartersCashTransactionsByType,
  getHeadquartersCashTransactionsByDateRange
} = require('../controllers/cashController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Restrict cash management to finance roles
const financeRoles = ['direktur', 'manajer_keuangan', 'kasir', 'staff_admin'];
const hqFinanceRoles = ['direktur', 'manajer_keuangan', 'admin_pusat'];

// ================ BRANCH CASH ROUTES ================
router
  .route('/branch')
  .get(getBreathCashTransactions)
  .post(authorize(...financeRoles), createBranchCashTransaction);

router
  .route('/branch/:id')
  .get(validateObjectId(), getBranchCashTransaction)
  .put(validateObjectId(), authorize(...financeRoles), updateBranchCashTransaction);

router.get('/branch/by-branch/:branchId', validateObjectId('branchId'), getBranchCashTransactionsByBranch);
router.get('/branch/by-type/:type', getBranchCashTransactionsByType);
router.get('/branch/by-date-range', getBranchCashTransactionsByDateRange);

// ================ HEADQUARTERS CASH ROUTES ================
router
  .route('/headquarters')
  .get(authorize(...hqFinanceRoles), getHeadquartersCashTransactions)
  .post(authorize(...hqFinanceRoles), createHeadquartersCashTransaction);

router
  .route('/headquarters/:id')
  .get(validateObjectId(), authorize(...hqFinanceRoles), getHeadquartersCashTransaction)
  .put(validateObjectId(), authorize(...hqFinanceRoles), updateHeadquartersCashTransaction);

router.put('/headquarters/:id/status', validateObjectId(), authorize('direktur', 'manajer_keuangan'), updateHeadquartersCashTransactionStatus);
router.get('/headquarters/by-type/:type', authorize(...hqFinanceRoles), getHeadquartersCashTransactionsByType);
router.get('/headquarters/by-date-range', authorize(...hqFinanceRoles), getHeadquartersCashTransactionsByDateRange);

module.exports = router;