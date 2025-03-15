const express = require('express');
const {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchesByDivision
} = require('../controllers/branchController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getBranches)
  .post(authorize('direktur', 'manajer_admin'), createBranch);

router
  .route('/:id')
  .get(getBranch)
  .put(authorize('direktur', 'manajer_admin'), updateBranch)
  .delete(authorize('direktur', 'manajer_admin'), deleteBranch);

router
  .route('/by-division/:divisionId')
  .get(getBranchesByDivision);

module.exports = router;