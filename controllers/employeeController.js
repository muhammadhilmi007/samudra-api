// controllers/employeeController.js
const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const bcrypt = require('bcryptjs');

/**
 * @desc      Get all employees with pagination and filtering
 * @route     GET /api/employees
 * @access    Private
 */
exports.getEmployees = asyncHandler(async (req, res) => {
  // Create filter object
  const filter = {};
  
  // Filter by branch
  if (req.query.cabangId) {
    filter.cabangId = req.query.cabangId;
  } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_admin' && req.user.role !== 'manajer_sdm') {
    // If not a director or HR manager, restrict to own branch
    filter.cabangId = req.user.cabangId;
  }
  
  // Filter by role
  if (req.query.roleId) {
    filter.roleId = req.query.roleId;
  }
  
  // Filter by active status
  if (req.query.aktif !== undefined) {
    filter.aktif = req.query.aktif === 'true';
  }
  
  // Search query (case-insensitive)
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { nama: searchRegex },
      { username: searchRegex },
      { email: searchRegex },
      { telepon: searchRegex },
      { jabatan: searchRegex }
    ];
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || config.defaultPage;
  const limit = parseInt(req.query.limit, 10) || config.defaultLimit;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await User.countDocuments(filter);
  
  // Execute query with pagination
  const employees = await User.find(filter)
    .populate('cabangId', 'namaCabang')
    .populate('roleId', 'namaRole permissions')
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  // Pagination result
  const pagination = {};
  
  // If there are previous pages
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  // If there are next pages
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  res.status(200).json({
    success: true,
    count: employees.length,
    pagination,
    total,
    data: employees
  });
});

/**
 * @desc      Get employee by ID
 * @route     GET /api/employees/:id
 * @access    Private
 */
exports.getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id)
    .populate('cabangId', 'namaCabang')
    .populate('roleId', 'namaRole permissions')
    .select('-password');
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Pegawai tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: employee
  });
});

/**
 * @desc      Create new employee
 * @route     POST /api/employees
 * @access    Private (Admin, HR Manager, Branch Manager)
 */
exports.createEmployee = asyncHandler(async (req, res) => {
  // Check if username already exists
  const existingUser = await User.findOne({ username: req.body.username });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Username sudah digunakan'
    });
  }
  
  // Check if email already exists (if provided)
  if (req.body.email && req.body.email.trim() !== '') {
    const existingEmail = await User.findOne({ email: req.body.email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah digunakan'
      });
    }
  }
  
  // Get role information
  const role = await Role.findById(req.body.roleId);
  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Add role code to the employee data
  req.body.role = role.kodeRole;
  
  // Handle file uploads
  if (req.files) {
    // Profile picture
    if (req.files.fotoProfil) {
      req.body.fotoProfil = req.files.fotoProfil[0].filename;
    }
    
    // KTP document
    if (req.files['dokumen.ktp']) {
      if (!req.body.dokumen) req.body.dokumen = {};
      req.body.dokumen.ktp = req.files['dokumen.ktp'][0].filename;
    }
    
    // NPWP document
    if (req.files['dokumen.npwp']) {
      if (!req.body.dokumen) req.body.dokumen = {};
      req.body.dokumen.npwp = req.files['dokumen.npwp'][0].filename;
    }
  }
  
  // Create employee
  const employee = await User.create(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Pegawai berhasil dibuat',
    data: employee
  });
});

/**
 * @desc      Update employee
 * @route     PUT /api/employees/:id
 * @access    Private (Admin, HR Manager, Branch Manager)
 */
exports.updateEmployee = asyncHandler(async (req, res) => {
  let employee = await User.findById(req.params.id);
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Pegawai tidak ditemukan'
    });
  }
  
  // Check if username already exists (if changed)
  if (req.body.username && req.body.username !== employee.username) {
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username sudah digunakan'
      });
    }
  }
  
  // Check if email already exists (if changed and provided)
  if (req.body.email && req.body.email.trim() !== '' && req.body.email !== employee.email) {
    const existingEmail = await User.findOne({ email: req.body.email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah digunakan'
      });
    }
  }
  
  // If roleId is changed, update role code
  if (req.body.roleId && req.body.roleId.toString() !== employee.roleId.toString()) {
    const role = await Role.findById(req.body.roleId);
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role tidak ditemukan'
      });
    }
    req.body.role = role.kodeRole;
  }
  
  // Handle file uploads
  if (req.files) {
    // Profile picture
    if (req.files.fotoProfil) {
      // Delete old profile picture if not default
      if (employee.fotoProfil && employee.fotoProfil !== 'default.jpg') {
        const oldPath = path.join(__dirname, '../uploads', employee.fotoProfil);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      req.body.fotoProfil = req.files.fotoProfil[0].filename;
    }
    
    // KTP document
    if (req.files['dokumen.ktp']) {
      // Delete old KTP document if exists
      if (employee.dokumen && employee.dokumen.ktp) {
        const oldPath = path.join(__dirname, '../uploads', employee.dokumen.ktp);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      if (!req.body.dokumen) req.body.dokumen = {};
      req.body.dokumen.ktp = req.files['dokumen.ktp'][0].filename;
    }
    
    // NPWP document
    if (req.files['dokumen.npwp']) {
      // Delete old NPWP document if exists
      if (employee.dokumen && employee.dokumen.npwp) {
        const oldPath = path.join(__dirname, '../uploads', employee.dokumen.npwp);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      if (!req.body.dokumen) req.body.dokumen = {};
      req.body.dokumen.npwp = req.files['dokumen.npwp'][0].filename;
    }
  }
  
  // Handle password update
  if (req.body.password && req.body.password.trim() !== '') {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);
  } else {
    // Remove password field if empty
    delete req.body.password;
  }
  
  // Update employee
  employee = await User.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).select('-password');
  
  res.status(200).json({
    success: true,
    message: 'Pegawai berhasil diperbarui',
    data: employee
  });
});

/**
 * @desc      Delete employee
 * @route     DELETE /api/employees/:id
 * @access    Private (Admin, HR Manager)
 */
exports.deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id);
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Pegawai tidak ditemukan'
    });
  }
  
  // Delete profile picture if not default
  if (employee.fotoProfil && employee.fotoProfil !== 'default.jpg') {
    const picturePath = path.join(__dirname, '../uploads', employee.fotoProfil);
    if (fs.existsSync(picturePath)) {
      fs.unlinkSync(picturePath);
    }
  }
  
  // Delete documents if exist
  if (employee.dokumen) {
    if (employee.dokumen.ktp) {
      const ktpPath = path.join(__dirname, '../uploads', employee.dokumen.ktp);
      if (fs.existsSync(ktpPath)) {
        fs.unlinkSync(ktpPath);
      }
    }
    
    if (employee.dokumen.npwp) {
      const npwpPath = path.join(__dirname, '../uploads', employee.dokumen.npwp);
      if (fs.existsSync(npwpPath)) {
        fs.unlinkSync(npwpPath);
      }
    }
    
    // Delete other documents
    if (employee.dokumen.lainnya && employee.dokumen.lainnya.length > 0) {
      employee.dokumen.lainnya.forEach(doc => {
        const docPath = path.join(__dirname, '../uploads', doc);
        if (fs.existsSync(docPath)) {
          fs.unlinkSync(docPath);
        }
      });
    }
  }
  
  // Delete employee
  await employee.remove();
  
  res.status(200).json({
    success: true,
    message: 'Pegawai berhasil dihapus',
    data: {}
  });
});

/**
 * @desc      Get employees by branch
 * @route     GET /api/employees/by-branch/:branchId
 * @access    Private
 */
exports.getEmployeesByBranch = asyncHandler(async (req, res) => {
  const employees = await User.find({ cabangId: req.params.branchId })
    .populate('cabangId', 'namaCabang')
    .populate('roleId', 'namaRole permissions')
    .select('-password')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: employees.length,
    data: employees
  });
});

// Role controllers
/**
 * @desc      Get all roles
 * @route     GET /api/roles
 * @access    Private
 */
exports.getRoles = asyncHandler(async (req, res) => {
  // Get all roles, sorted by name
  const roles = await Role.find().sort('namaRole');
  
  res.status(200).json({
    success: true,
    count: roles.length,
    data: roles
  });
});

/**
 * @desc      Create role
 * @route     POST /api/roles
 * @access    Private (Directors, HR Managers, Admin Managers)
 */
exports.createRole = asyncHandler(async (req, res, next) => {
  // Check authorization
  const isAuthorized = 
    req.user.role === 'direktur' || 
    req.user.role === 'manajer_admin' || 
    req.user.role === 'manajer_sdm';
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Tidak diizinkan untuk membuat role baru', 403));
  }
  
  // Create role
  const role = await Role.create(req.body);
  
  res.status(201).json({
    success: true,
    data: role,
    message: 'Role berhasil dibuat'
  });
});

/**
 * @desc      Get role by ID
 * @route     GET /api/roles/:id
 * @access    Private
 */
exports.getRoleById = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id);
  
  if (!role) {
    return next(new ErrorResponse('Role tidak ditemukan', 404));
  }
  
  res.status(200).json({
    success: true,
    data: role
  });
});

/**
 * @desc      Update role
 * @route     PUT /api/roles/:id
 * @access    Private (Directors, HR Managers, Admin Managers)
 */
exports.updateRole = asyncHandler(async (req, res, next) => {
  // Check authorization
  const isAuthorized = 
    req.user.role === 'direktur' || 
    req.user.role === 'manajer_admin' || 
    req.user.role === 'manajer_sdm';
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Tidak diizinkan untuk mengubah role', 403));
  }
  
  // Check if role exists
  let role = await Role.findById(req.params.id);
  
  if (!role) {
    return next(new ErrorResponse('Role tidak ditemukan', 404));
  }
  
  // Don't allow changing direktur role except by direktur
  if (role.kodeRole === 'direktur' && req.user.role !== 'direktur') {
    return next(new ErrorResponse('Hanya direktur yang dapat mengubah role direktur', 403));
  }
  
  // Update role
  // Don't allow changing kodeRole as it could break permissions
  if (req.body.kodeRole && req.body.kodeRole !== role.kodeRole) {
    return next(new ErrorResponse('Kode role tidak dapat diubah', 400));
  }
  
  role = await Role.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: role,
    message: 'Role berhasil diperbarui'
  });
});

/**
 * @desc      Delete role
 * @route     DELETE /api/roles/:id
 * @access    Private (Directors only)
 */
exports.deleteRole = asyncHandler(async (req, res, next) => {
  // Only directors can delete roles
  if (req.user.role !== 'direktur') {
    return next(new ErrorResponse('Hanya direktur yang dapat menghapus role', 403));
  }
  
  const role = await Role.findById(req.params.id);
  
  if (!role) {
    return next(new ErrorResponse('Role tidak ditemukan', 404));
  }
  
  // Check if role is being used by any employee
  const usersWithRole = await User.countDocuments({ roleId: req.params.id });
  
  if (usersWithRole > 0) {
    return next(new ErrorResponse(`Role tidak dapat dihapus karena sedang digunakan oleh ${usersWithRole} pegawai`, 400));
  }
  
  // Don't allow deleting core system roles
  const coreRoles = ['direktur', 'manajer_admin', 'manajer_keuangan', 'manajer_operasional', 'manajer_sdm', 'kepala_cabang'];
  
  if (coreRoles.includes(role.kodeRole)) {
    return next(new ErrorResponse('Role sistem inti tidak dapat dihapus', 400));
  }
  
  await role.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {},
    message: 'Role berhasil dihapus'
  });
});