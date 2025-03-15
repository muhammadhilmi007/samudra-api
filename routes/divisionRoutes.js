const express = require('express');
const {
  getDivisions,
  getDivision,
  createDivision,
  updateDivision,
  deleteDivision
} = require('../controllers/divisionController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getDivisions)
  .post(authorize('direktur', 'manajer_admin'), createDivision);

router
  .route('/:id')
  .get(getDivision)
  .put(authorize('direktur', 'manajer_admin'), updateDivision)
  .delete(authorize('direktur', 'manajer_admin'), deleteDivision);

module.exports = router;