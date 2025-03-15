const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUsersByBranch
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

// Routes yang memerlukan otentikasi
router
  .route('/')
  .get(authorize('direktur', 'manajer_admin', 'manajer_sdm', 'kepala_cabang'), getUsers)
  .post(authorize('direktur', 'manajer_admin', 'manajer_sdm'), createUser);

router
  .route('/:id')
  .get(authorize('direktur', 'manajer_admin', 'manajer_sdm', 'kepala_cabang'), getUser)
  .put(authorize('direktur', 'manajer_admin', 'manajer_sdm'), updateUser)
  .delete(authorize('direktur', 'manajer_admin', 'manajer_sdm'), deleteUser);

router
  .route('/by-branch/:branchId')
  .get(getUsersByBranch);

module.exports = router;