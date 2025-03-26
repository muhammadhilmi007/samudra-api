const express = require('express');
const {
  login,
  register,
  getMe,
  logout,
  changePassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validator');
const { z } = require('zod');

const router = express.Router();

// Define validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi')
});

const registerSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  username: z.string()
    .min(3, 'Username minimal 3 karakter')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, dan karakter . _ -'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  jabatan: z.string().min(2, 'Jabatan minimal 2 karakter'),
  roleId: z.string().min(1, 'Role harus dipilih'),
  telepon: z.string().min(10, 'Nomor telepon minimal 10 digit'),
  alamat: z.string().min(5, 'Alamat minimal 5 karakter'),
  cabangId: z.string().min(1, 'Cabang harus dipilih'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter')
});

// Public routes
router.post('/login', validateBody(loginSchema), login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, validateBody(changePasswordSchema), changePassword);

// Admin protected routes
router.post(
  '/register', 
  protect, 
  authorize('direktur', 'manajer_admin', 'manajer_sdm', 'kepala_cabang'),
  validateBody(registerSchema),
  register
);

module.exports = router;