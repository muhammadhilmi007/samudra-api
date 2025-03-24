const express = require('express');
const {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchesByDivision,
  getBranchStats
} = require('../controllers/branchController');
const { protect, authorize } = require('../middlewares/auth');

// Untuk validasi ObjectId
const { validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

router
  .route('/')
  .get(getBranches)
  .post(
    authorize('direktur', 'manajer_admin'), 
    createBranch
  );

router
  .route('/:id')
  .get(validateObjectId(), getBranch)
  .put(
    authorize('direktur', 'manajer_admin'),
    validateObjectId(),
    updateBranch
  )
  .delete(
    authorize('direktur', 'manajer_admin'),
    validateObjectId(),
    deleteBranch
  );

router
  .route('/:id/stats')
  .get(validateObjectId(), getBranchStats);

router
  .route('/by-division/:divisionId')
  .get(validateObjectId('divisionId'), getBranchesByDivision);

module.exports = router;