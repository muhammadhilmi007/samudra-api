const express = require('express');
const {
  getDivisions,
  getDivision,
  createDivision,
  updateDivision,
  deleteDivision
} = require('../controllers/divisionController');
const { protect, authorize } = require('../middlewares/auth');
const { validateObjectId, validateBody } = require('../middlewares/validator');
const { divisionSchema } = require('../utils/validators');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getDivisions)
  .post(
    authorize('direktur', 'manajer_admin'),
    validateBody(divisionSchema),
    createDivision
  );

router
  .route('/:id')
  .get(validateObjectId('id'), getDivision)
  .put(
    authorize('direktur', 'manajer_admin'),
    validateObjectId('id'),
    validateBody(divisionSchema),
    updateDivision
  )
  .delete(
    authorize('direktur', 'manajer_admin'),
    validateObjectId('id'),
    deleteDivision
  );

module.exports = router;