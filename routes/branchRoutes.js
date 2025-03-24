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
const { validateObjectId, validateBody } = require('../middlewares/validator');
const { branchSchema } = require('../utils/validators');

const router = express.Router();

// Protect all routes
router.use(protect);

router
  .route('/')
  .get(getBranches)
  .post(
    authorize('direktur', 'manajer_admin'),
    validateBody(branchSchema),
    createBranch
  );

router
  .route('/:id')
  .get(validateObjectId('id'), getBranch)
  .put(
    authorize('direktur', 'manajer_admin'),
    validateObjectId('id'),
    validateBody(branchSchema),
    updateBranch
  )
  .delete(
    authorize('direktur', 'manajer_admin'),
    validateObjectId('id'),
    deleteBranch
  );

router
  .route('/:id/stats')
  .get(validateObjectId('id'), getBranchStats);

router
  .route('/by-division/:divisionId')
  .get(validateObjectId('divisionId'), getBranchesByDivision);

module.exports = router;