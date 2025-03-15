const express = require('express');
const {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountsByType
} = require('../controllers/accountController');

const {
  getJournals,
  getJournal,
  createJournal,
  updateJournal,
  deleteJournal,
  updateJournalStatus,
  getJournalsByDateRange,
  getJournalsByBranch,
  getJournalsByType
} = require('../controllers/journalController');

const {
  getBranchCashTransactions,
  getBranchCashTransaction,
  createBranchCashTransaction,
  updateBranchCashTransaction,
  getBranchCashTransactionsByBranch,
  getBranchCashTransactionsByType,
  getBranchCashTransactionsByDateRange,
  getHeadquartersCashTransactions,
  getHeadquartersCashTransaction,
  createHeadquartersCashTransaction,
  updateHeadquartersCashTransaction,
  updateHeadquartersCashTransactionStatus,
  getHeadquartersCashTransactionsByType,
  getHeadquartersCashTransactionsByDateRange
} = require('../controllers/cashController');

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

// =============== ACCOUNT ROUTES ===============
router
  .route('/accounts')
  .get(getAccounts)
  .post(authorize('direktur', 'manajer_keuangan'), createAccount);

router
  .route('/accounts/:id')
  .get(validateObjectId(), getAccount)
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan'), updateAccount)
  .delete(validateObjectId(), authorize('direktur', 'manajer_keuangan'), deleteAccount);

router
  .route('/accounts/by-type/:type')
  .get(getAccountsByType);

// =============== JOURNAL ROUTES ===============
router
  .route('/journals')
  .get(getJournals)
  .post(createJournal);

router
  .route('/journals/:id')
  .get(validateObjectId(), getJournal)
  .put(validateObjectId(), updateJournal)
  .delete(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'kasir'), deleteJournal);

router
  .route('/journals/:id/status')
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'kepala_cabang'), updateJournalStatus);

router
  .route('/journals/by-date-range')
  .get(getJournalsByDateRange);

router
  .route('/journals/by-branch/:branchId')
  .get(validateObjectId('branchId'), getJournalsByBranch);

router
  .route('/journals/by-type/:type')
  .get(getJournalsByType);

// =============== BRANCH CASH ROUTES ===============
router
  .route('/cash/branch')
  .get(getBranchCashTransactions)
  .post(authorize('direktur', 'manajer_keuangan', 'kasir', 'kepala_cabang'), createBranchCashTransaction);

router
  .route('/cash/branch/:id')
  .get(validateObjectId(), getBranchCashTransaction)
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'kasir', 'kepala_cabang'), updateBranchCashTransaction);

router
  .route('/cash/branch/by-branch/:branchId')
  .get(validateObjectId('branchId'), getBranchCashTransactionsByBranch);

router
  .route('/cash/branch/by-type/:type')
  .get(getBranchCashTransactionsByType);

router
  .route('/cash/branch/by-date-range')
  .get(getBranchCashTransactionsByDateRange);

// =============== HEADQUARTERS CASH ROUTES ===============
router
  .route('/cash/headquarters')
  .get(authorize('direktur', 'manajer_keuangan', 'admin_pusat'), getHeadquartersCashTransactions)
  .post(authorize('direktur', 'manajer_keuangan', 'admin_pusat'), createHeadquartersCashTransaction);

router
  .route('/cash/headquarters/:id')
  .get(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'admin_pusat'), getHeadquartersCashTransaction)
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'admin_pusat'), updateHeadquartersCashTransaction);

router
  .route('/cash/headquarters/:id/status')
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan'), updateHeadquartersCashTransactionStatus);

router
  .route('/cash/headquarters/by-type/:type')
  .get(authorize('direktur', 'manajer_keuangan', 'admin_pusat'), getHeadquartersCashTransactionsByType);

router
  .route('/cash/headquarters/by-date-range')
  .get(authorize('direktur', 'manajer_keuangan', 'admin_pusat'), getHeadquartersCashTransactionsByDateRange);

// =============== BANK STATEMENT ROUTES ===============
router
  .route('/bank-statements')
  .get(getBankStatements)
  .post(authorize('direktur', 'manajer_keuangan', 'kasir', 'kepala_cabang'), createBankStatement);

router
  .route('/bank-statements/:id')
  .get(validateObjectId(), getBankStatement)
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'kasir', 'kepala_cabang'), updateBankStatement);

router
  .route('/bank-statements/:id/validate')
  .put(validateObjectId(), authorize('direktur', 'manajer_keuangan', 'kasir', 'staff_admin'), validateBankStatement);

router
  .route('/bank-statements/by-branch/:branchId')
  .get(validateObjectId('branchId'), getBankStatementsByBranch);

router
  .route('/bank-statements/by-date-range')
  .get(getBankStatementsByDateRange);

router
  .route('/bank-statements/summary')
  .get(getBankSummary);

module.exports = router;