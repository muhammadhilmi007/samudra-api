// validations/employeeValidation.js
const { z } = require('zod');
const mongoose = require('mongoose');

// Validate ObjectId
const objectIdSchema = z.string().refine(
  (value) => mongoose.Types.ObjectId.isValid(value),
  { message: 'ID tidak valid' }
);

// Employee schema for validation
const employeeSchema = z.object({
  nama: z.string()
    .min(3, 'Nama minimal 3 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .regex(/^[a-zA-Z\s.]+$/, 'Nama hanya boleh berisi huruf, spasi, dan titik'),
  
  jabatan: z.string()
    .min(1, 'Jabatan harus diisi')
    .max(50, 'Jabatan maksimal 50 karakter'),
  
  roleId: objectIdSchema.refine(
    (value) => value !== undefined && value !== '',
    { message: 'Role harus dipilih' }
  ),
  
  email: z.string()
    .email('Format email tidak valid')
    .optional()
    .or(z.literal('')),
  
  telepon: z.string()
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, 'Format nomor telepon tidak valid (contoh: 081234567890)'),
  
  alamat: z.string()
    .min(1, 'Alamat harus diisi')
    .max(255, 'Alamat maksimal 255 karakter'),
  
  username: z.string()
    .min(5, 'Username minimal 5 karakter')
    .max(20, 'Username maksimal 20 karakter')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh berisi huruf, angka, dan underscore'),
  
  password: z.string()
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password harus mengandung minimal 8 karakter, huruf besar, huruf kecil, angka, dan karakter spesial')
    .or(z.literal(''))
    .optional(),
  
  cabangId: objectIdSchema.refine(
    (value) => value !== undefined && value !== '',
    { message: 'Cabang harus dipilih' }
  ),
  
  aktif: z.boolean().default(true).optional(),
});

// Update employee schema - similar to create but with most fields optional
const updateEmployeeSchema = employeeSchema.partial().extend({
  // Always require ID for updates
  _id: objectIdSchema,
});

// Role schema for validation
const roleSchema = z.object({
  namaRole: z.string()
    .min(3, 'Nama role minimal 3 karakter')
    .max(50, 'Nama role maksimal 50 karakter'),
  
  kodeRole: z.string()
    .min(3, 'Kode role minimal 3 karakter')
    .max(20, 'Kode role maksimal 20 karakter')
    .regex(/^[a-z0-9_]+$/, 'Kode role hanya boleh berisi huruf kecil, angka, dan underscore'),
  
  deskripsi: z.string().max(255, 'Deskripsi maksimal 255 karakter').optional(),
  
  permissions: z.array(z.string())
    .min(1, 'Role harus memiliki minimal 1 permission')
});

// Update role schema
const updateRoleSchema = roleSchema.partial().extend({
  // Always require ID for updates
  _id: objectIdSchema,
});

module.exports = {
  employeeSchema,
  updateEmployeeSchema,
  roleSchema,
  updateRoleSchema,
  objectIdSchema
};