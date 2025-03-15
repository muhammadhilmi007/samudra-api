const express = require('express');
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
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-date-range', getJournalsByDateRange);
router.get('/by-branch/:branchId', validateObjectId('branchId'), getJournalsByBranch);
router.get('/by-type/:type', getJournalsByType);
router.put('/:id/status', validateObjectId(), authorize('direktur', 'manajer_keuangan', 'staff_admin'), updateJournalStatus);

// Restrict journal management to finance roles
const financeRoles = ['direktur', 'manajer_keuangan', 'kasir', 'staff_admin'];

// CRUD routes
router
  .route('/')
  .get(getJournals)
  .post(authorize(...financeRoles), createJournal);

router
  .route('/:id')
  .get(validateObjectId(), getJournal)
  .put(validateObjectId(), authorize(...financeRoles), updateJournal)
  .delete(validateObjectId(), authorize('direktur', 'manajer_keuangan'), deleteJournal);

module.exports = router;