const express = require('express');
const {
  getReturns,
  getReturn,
  createReturn,
  updateReturn,
  updateReturnStatus,
  getReturnsBySTT
} = require('../controllers/returnController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/by-stt/:sttId', validateObjectId('sttId'), getReturnsBySTT);
router.put('/:id/status', validateObjectId(), authorize('staff_admin', 'kepala_cabang', 'kepala_gudang'), updateReturnStatus);

// CRUD routes
router
  .route('/')
  .get(getReturns)
  .post(authorize('staff_admin', 'kepala_cabang', 'kepala_gudang'), createReturn);

router
  .route('/:id')
  .get(validateObjectId(), getReturn)
  .put(validateObjectId(), authorize('staff_admin', 'kepala_cabang', 'kepala_gudang'), updateReturn);

module.exports = router;