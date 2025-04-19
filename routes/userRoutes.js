const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUsersByBranch,
  uploadProfilePicture,
  uploadDocument,
  toggleUserStatus,
  getUserRoles,
  updateUserRoles,
  getUserPermissions,
  previewPermissions,
  uploadProfileImage
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const { validateObjectId, validateBody } = require('../middlewares/validator');
const { z } = require('zod');

const router = express.Router();

// Define user validation schema
const userCreateSchema = z.object({
  nama: z.string().min(1, 'Nama pegawai harus diisi'),
  jabatan: z.string().min(1, 'Jabatan harus diisi'),
  roleId: z.string().min(1, 'Role harus diisi'),
  email: z.string().email('Email tidak valid').optional().nullable(),
  telepon: z.string().min(1, 'Nomor telepon harus diisi'),
  alamat: z.string().min(1, 'Alamat harus diisi'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  cabangId: z.string().min(1, 'Cabang harus diisi'),
  aktif: z.boolean().optional().default(true)
});

// Update schema doesn't require password
const userUpdateSchema = z.object({
  nama: z.string().min(1, 'Nama pegawai harus diisi').optional(),
  jabatan: z.string().min(1, 'Jabatan harus diisi').optional(),
  roleId: z.string().min(1, 'Role harus diisi').optional(),
  email: z.string().email('Email tidak valid').optional().nullable(),
  telepon: z.string().min(1, 'Nomor telepon harus diisi').optional(),
  alamat: z.string().min(1, 'Alamat harus diisi').optional(),
  username: z.string().min(3, 'Username minimal 3 karakter').optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  cabangId: z.string().min(1, 'Cabang harus diisi').optional(),
  aktif: z.boolean().optional()
});

router.use(protect);

// Routes requiring authentication
router
  .route('/')
  .get(authorize('direktur', 'manajer_admin', 'manajer_sdm', 'kepala_cabang'), getUsers)
  .post(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    // Note: For file uploads, don't use validation middleware
    // as it would interfere with multer/formidable processing
    createUser
  );

router
  .route('/:id')
  .get(
    authorize('direktur', 'manajer_admin', 'manajer_sdm', 'kepala_cabang'), 
    validateObjectId('id'),
    getUser
  )
  .put(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateObjectId('id'),
    // Note: For file uploads, don't use validation middleware
    updateUser
  )
  .delete(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateObjectId('id'),
    deleteUser
  );

router
  .route('/by-branch/:branchId')
  .get(validateObjectId('branchId'), getUsersByBranch);

// Routes for file uploads - these should handle their own validation
router
  .route('/:id/profile-picture')
  .put(
    validateObjectId('id'),
    uploadProfilePicture
  );

router
  .route('/:id/document')
  .put(
    validateObjectId('id'),
    uploadDocument
  );

// RBAC-related routes for user management
router
  .route('/:id/status')
  .patch(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateObjectId('id'),
    toggleUserStatus
  );

router
  .route('/:id/roles')
  .get(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateObjectId('id'),
    getUserRoles
  )
  .post(
    authorize('direktur', 'manajer_admin'),
    validateObjectId('id'),
    updateUserRoles
  );

router
  .route('/:id/permissions')
  .get(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    validateObjectId('id'),
    getUserPermissions
  );

router
  .route('/permissions/preview')
  .post(
    authorize('direktur', 'manajer_admin', 'manajer_sdm'),
    previewPermissions
  );

router
  .route('/:id/profile-image')
  .post(
    validateObjectId('id'),
    uploadProfileImage
  );

module.exports = router;