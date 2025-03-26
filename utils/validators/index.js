// utils/validators/index.js
const { z } = require('zod');

// Role validation schema
exports.roleSchema = z.object({
  namaRole: z.string().min(1, 'Nama role harus diisi'),
  kodeRole: z.string().min(1, 'Kode role harus diisi'),
  permissions: z.array(z.string()).default([])
});

// User validation schemas
exports.userCreateSchema = z.object({
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
exports.userUpdateSchema = z.object({
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

// Auth validation schemas
exports.loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi')
});

exports.registerSchema = z.object({
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

exports.changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter')
});