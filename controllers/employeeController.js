// controllers/employeeController.js
const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

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
    return next(new ErrorResponse('Pegawai tidak ditemukan', 404));
  }
  
  // Check authorization: only directors, HR managers, admin managers, branch heads can access other branch employees
  const isAuthorized = 
    req.user.role === 'direktur' || 
    req.user.role === 'manajer_admin' || 
    req.user.role === 'manajer_sdm' || 
    (req.user.role === 'kepala_cabang' && employee.cabangId.toString() === req.user.cabangId.toString()) ||
    employee._id.toString() === req.user._id.toString(); // Users can access their own data
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Tidak diizinkan untuk mengakses data pegawai cabang lain', 403));
  }
  
  res.status(200).json({
    success: true,
    data: employee
  });
});

/**
 * @desc      Get employees by branch
 * @route     GET /api/employees/by-branch/:branchId
 * @access    Private
 */
exports.getEmployeesByBranch = asyncHandler(async (req, res, next) => {
  // Check if branch exists
  const branch = await Branch.findById(req.params.branchId);
  
  if (!branch) {
    return next(new ErrorResponse(`Cabang dengan ID ${req.params.branchId} tidak ditemukan`, 404));
  }
  
  // Check authorization: only directors, HR managers, admin managers, or heads of that branch can access
  const isAuthorized = 
    req.user.role === 'direktur' || 
    req.user.role === 'manajer_admin' || 
    req.user.role === 'manajer_sdm' || 
    (req.user.role === 'kepala_cabang' && req.params.branchId === req.user.cabangId.toString());
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Tidak diizinkan untuk mengakses data pegawai cabang lain', 403));
  }
  
  const employees = await User.find({
    cabangId: req.params.branchId
  })
    .populate('cabangId', 'namaCabang')
    .populate('roleId', 'namaRole permissions')
    .select('-password')
    .sort({ nama: 1 });
  
  res.status(200).json({
    success: true,
    count: employees.length,
    data: employees
  });
});

/**
 * @desc      Create employee
 * @route     POST /api/employees
 * @access    Private (Directors, HR Managers, Admin Managers, Branch Heads)
 */
exports.createEmployee = asyncHandler(async (req, res, next) => {
  // Check authorization for creating employees
  const isAuthorized = 
    req.user.role === 'direktur' || 
    req.user.role === 'manajer_admin' || 
    req.user.role === 'manajer_sdm' || 
    req.user.role === 'kepala_cabang';
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Tidak diizinkan untuk membuat pegawai baru', 403));
  }
  
  // For branch heads, restrict to their own branch
  if (req.user.role === 'kepala_cabang' && req.body.cabangId !== req.user.cabangId.toString()) {
    return next(new ErrorResponse('Kepala cabang hanya dapat membuat pegawai untuk cabangnya sendiri', 403));
  }
  
  // Check if username or email already exists
  const existingUser = await User.findOne({
    $or: [
      { username: req.body.username },
      { email: req.body.email && req.body.email !== '' ? req.body.email : null }
    ]
  });
  
  if (existingUser) {
    // Delete uploaded files if any
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        const file = req.files[key][0];
        fs.unlinkSync(file.path);
      });
    }
    
    return next(new ErrorResponse('Username atau email sudah terdaftar', 400));
  }
  
  // Check if roleId is valid and get the role code
  const role = await Role.findById(req.body.roleId);
  if (!role) {
    return next(new ErrorResponse('Role tidak valid', 400));
  }
  
  // Branch heads can only create staff roles
  if (req.user.role === 'kepala_cabang' && 
      !['staff_admin', 'staff_penjualan', 'kasir', 'checker', 'supir'].includes(role.kodeRole)) {
    return next(new ErrorResponse('Kepala cabang hanya dapat membuat pegawai dengan role staff', 403));
  }
  
  // Add the role code to the employee data
  const employeeData = { ...req.body, role: role.kodeRole };
  
  // Check if cabangId is valid
  const branch = await Branch.findById(req.body.cabangId);
  if (!branch) {
    return next(new ErrorResponse('Cabang tidak valid', 400));
  }
  
  // Process file uploads
  if (req.files) {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', config.uploadPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Handle profile photo
    if (req.files.fotoProfil) {
      const profileFile = req.files.fotoProfil[0];
      employeeData.fotoProfil = `${config.uploadPath}/${profileFile.filename}`;
    }
    
    // Handle KTP document
    if (req.files['dokumen.ktp']) {
      if (!employeeData.dokumen) {
        employeeData.dokumen = {};
      }
      const ktpFile = req.files['dokumen.ktp'][0];
      employeeData.dokumen.ktp = `${config.uploadPath}/${ktpFile.filename}`;
    }
    
    // Handle NPWP document
    if (req.files['dokumen.npwp']) {
      if (!employeeData.dokumen) {
        employeeData.dokumen = {};
      }
      const npwpFile = req.files['dokumen.npwp'][0];
      employeeData.dokumen.npwp = `${config.uploadPath}/${npwpFile.filename}`;
    }
  }
  
  // Create employee
  const employee = await User.create(employeeData);
  
  // Remove password from response
  employee.password = undefined;
  
  res.status(201).json({
    success: true,
    data: employee,
    message: 'Pegawai berhasil ditambahkan'
  });
});

/**
 * @desc      Update employee
 * @route     PUT /api/employees/:id
 * @access    Private (Directors, HR Managers, Admin Managers, Branch Heads, Self)
 */
exports.updateEmployee = asyncHandler(async (req, res, next) => {
  let employee = await User.findById(req.params.id);
  
  if (!employee) {
    return next(new ErrorResponse('Pegawai tidak ditemukan', 404));
  }
  
  // Check authorization
  const isAuthorized = 
    req.user.role === 'direktur' || 
    req.user.role === 'manajer_admin' || 
    req.user.role === 'manajer_sdm' || 
    (req.user.role === 'kepala_cabang' && employee.cabangId.toString() === req.user.cabangId.toString()) ||
    employee._id.toString() === req.user._id.toString(); // Users can update their own data
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Tidak diizinkan untuk mengubah data pegawai ini', 403));
  }
  
  // Users can only update their personal info, not role or branch
  if (employee._id.toString() === req.user._id.toString() && 
      (req.body.roleId || req.body.cabangId || req.body.aktif !== undefined)) {
    return next(new ErrorResponse('Pegawai tidak dapat mengubah role, cabang, atau status aktif sendiri', 403));
  }
  
  // Branch heads cannot change roles to non-staff roles
  if (req.user.role === 'kepala_cabang' && req.body.roleId) {
    const newRole = await Role.findById(req.body.roleId);
    if (!newRole || !['staff_admin', 'staff_penjualan', 'kasir', 'checker', 'supir'].includes(newRole.kodeRole)) {
      return next(new ErrorResponse('Kepala cabang hanya dapat mengubah pegawai ke role staff', 403));
    }
  }
  
  // Check if username or email is being changed and already exists
  if (req.body.username || req.body.email) {
    // Build filter to check uniqueness but exclude the current user
    const uniqueCheckFilters = [];
    
    if (req.body.username) {
      uniqueCheckFilters.push({ username: req.body.username });
    }
    
    if (req.body.email && req.body.email !== '') {
      uniqueCheckFilters.push({ email: req.body.email });
    }
    
    if (uniqueCheckFilters.length > 0) {
      const existingUser = await User.findOne({
        $or: uniqueCheckFilters,
        _id: { $ne: req.params.id }
      });
      
      if (existingUser) {
        return next(new ErrorResponse('Username atau email sudah digunakan oleh pegawai lain', 400));
      }
    }
  }
  
  // Process update data
  const updateData = { ...req.body };
  
  // If roleId is changed, update the role code too
  if (updateData.roleId && updateData.roleId !== employee.roleId.toString()) {
    const newRole = await Role.findById(updateData.roleId);
    if (!newRole) {
      return next(new ErrorResponse('Role tidak valid', 400));
    }
    updateData.role = newRole.kodeRole;
  }
  
  // Check if cabangId is valid when changed
  if (updateData.cabangId && updateData.cabangId !== employee.cabangId.toString()) {
    const branch = await Branch.findById(updateData.cabangId);
    if (!branch) {
      return next(new ErrorResponse('Cabang tidak valid', 400));
    }
  }
  
  // Process file uploads
  if (req.files) {
    // Handle profile photo
    if (req.files.fotoProfil) {
      // Delete old file if exists and not default
      if (employee.fotoProfil && employee.fotoProfil !== 'default.jpg') {
        const oldFilePath = path.join(__dirname, '..', employee.fotoProfil);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      const profileFile = req.files.fotoProfil[0];
      updateData.fotoProfil = `${config.uploadPath}/${profileFile.filename}`;
    }
    
    // Handle KTP document
    if (req.files['dokumen.ktp']) {
      // Delete old file if exists
      if (employee.dokumen && employee.dokumen.ktp) {
        const oldFilePath = path.join(__dirname, '..', employee.dokumen.ktp);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      if (!updateData.dokumen) {
        updateData.dokumen = { ...employee.dokumen } || {};
      }
      const ktpFile = req.files['dokumen.ktp'][0];
      updateData.dokumen.ktp = `${config.uploadPath}/${ktpFile.filename}`;
    }
    
    // Handle NPWP document
    if (req.files['dokumen.npwp']) {
      // Delete old file if exists
      if (employee.dokumen && employee.dokumen.npwp) {
        const oldFilePath = path.join(__dirname, '..', employee.dokumen.npwp);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      if (!updateData.dokumen) {
        updateData.dokumen = { ...employee.dokumen } || {};
      }
      const npwpFile = req.files['dokumen.npwp'][0];
      updateData.dokumen.npwp = `${config.uploadPath}/${npwpFile.filename}`;
    }
  }
  
  // Handle password update
  if (updateData.password) {
    if (updateData.password.trim() === '') {
      // Empty password means no change
      delete updateData.password;
    } else {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }
  }
  
  // Update employee
  const updatedEmployee = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('cabangId', 'namaCabang')
    .populate('roleId', 'namaRole permissions')
    .select('-password');
  
  res.status(200).json({
    success: true,
    data: updatedEmployee,
    message: 'Data pegawai berhasil diperbarui'
  });
});

/**
 * @desc      Delete employee
 * @route     DELETE /api/employees/:id
 * @access    Private (Directors, HR Managers, Admin Managers)
 */
exports.deleteEmployee = asyncHandler(async (req, res, next) => {
  const employee = await User.findById(req.params.id);
  
  if (!employee) {
    return next(new ErrorResponse('Pegawai tidak ditemukan', 404));
  }
  
  // Check authorization (only directors and managers can delete)
  const isAuthorized = 
    req.user.role === 'direktur' || 
    req.user.role === 'manajer_admin' || 
    req.user.role === 'manajer_sdm';
  
  if (!isAuthorized) {
    return next(new ErrorResponse('Tidak diizinkan untuk menghapus pegawai', 403));
  }
  
  // Can't delete own account
  if (employee._id.toString() === req.user._id.toString()) {
    return next(new ErrorResponse('Tidak dapat menghapus akun sendiri', 400));
  }
  
  // Delete files
  if (employee.fotoProfil && employee.fotoProfil !== 'default.jpg') {
    const profilePath = path.join(__dirname, '..', employee.fotoProfil);
    if (fs.existsSync(profilePath)) {
      fs.unlinkSync(profilePath);
    }
  }
  
  if (employee.dokumen) {
    if (employee.dokumen.ktp) {
      const ktpPath = path.join(__dirname, '..', employee.dokumen.ktp);
      if (fs.existsSync(ktpPath)) {
        fs.unlinkSync(ktpPath);
      }
    }
    
    if (employee.dokumen.npwp) {
      const npwpPath = path.join(__dirname, '..', employee.dokumen.npwp);
      if (fs.existsSync(npwpPath)) {
        fs.unlinkSync(npwpPath);
      }
    }
  }
  
  // Hard delete or soft delete based on query param
  if (req.query.hardDelete === 'true' && req.user.role === 'direktur') {
    await employee.deleteOne();
  } else {
    // Soft delete
    employee.aktif = false;
    await employee.save();
  }
  
  res.status(200).json({
    success: true,
    data: {},
    message: 'Pegawai berhasil dihapus'
  });
});

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