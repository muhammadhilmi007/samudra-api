// controllers/employeeController.js
const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const asyncHandler = require('../middlewares/asyncHandler');
const path = require('path');
const fs = require('fs');

// @desc      Get all employees
// @route     GET /api/employees
// @access    Private
exports.getEmployees = asyncHandler(async (req, res) => {
  // Filter based on query params
  const filter = {};
  
  if (req.query.cabangId) {
    filter.cabangId = req.query.cabangId;
  }
  
  if (req.query.roleId) {
    filter.roleId = req.query.roleId;
  }
  
  if (req.query.aktif !== undefined) {
    filter.aktif = req.query.aktif === 'true';
  }
  
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
  
  const employees = await User.find(filter)
    .populate('cabangId', 'namaCabang')
    .populate('roleId', 'namaRole permissions')
    .select('-password');
  
  res.status(200).json({
    success: true,
    count: employees.length,
    data: employees
  });
});

// @desc      Get employee by ID
// @route     GET /api/employees/:id
// @access    Private
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

// @desc      Get employees by branch
// @route     GET /api/employees/by-branch/:branchId
// @access    Private
exports.getEmployeesByBranch = asyncHandler(async (req, res) => {
  const employees = await User.find({
    cabangId: req.params.branchId
  })
    .populate('cabangId', 'namaCabang')
    .populate('roleId', 'namaRole permissions')
    .select('-password');
  
  res.status(200).json({
    success: true,
    count: employees.length,
    data: employees
  });
});

// @desc      Create employee
// @route     POST /api/employees
// @access    Private
exports.createEmployee = asyncHandler(async (req, res) => {
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
    
    return res.status(400).json({
      success: false,
      message: 'Username atau email sudah terdaftar'
    });
  }
  
  // Check if roleId is valid and get the role code
  const role = await Role.findById(req.body.roleId);
  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Role tidak valid'
    });
  }
  
  // Add the role code to the employee data
  const employeeData = { ...req.body, role: role.kodeRole };
  
  // Check if cabangId is valid
  const branch = await Branch.findById(req.body.cabangId);
  if (!branch) {
    return res.status(400).json({
      success: false,
      message: 'Cabang tidak valid'
    });
  }
  
  // Process file uploads
  if (req.files) {
    // Handle profile photo
    if (req.files.fotoProfil) {
      const profileFile = req.files.fotoProfil[0];
      employeeData.fotoProfil = `/uploads/${profileFile.filename}`;
    }
    
    // Handle KTP document
    if (req.files['dokumen.ktp']) {
      if (!employeeData.dokumen) {
        employeeData.dokumen = {};
      }
      const ktpFile = req.files['dokumen.ktp'][0];
      employeeData.dokumen.ktp = `/uploads/${ktpFile.filename}`;
    }
    
    // Handle NPWP document
    if (req.files['dokumen.npwp']) {
      if (!employeeData.dokumen) {
        employeeData.dokumen = {};
      }
      const npwpFile = req.files['dokumen.npwp'][0];
      employeeData.dokumen.npwp = `/uploads/${npwpFile.filename}`;
    }
  }
  
  // Create employee
  const employee = await User.create(employeeData);
  
  // Remove password from response
  employee.password = undefined;
  
  res.status(201).json({
    success: true,
    data: employee
  });
});

// @desc      Update employee
// @route     PUT /api/employees/:id
// @access    Private
exports.updateEmployee = asyncHandler(async (req, res) => {
  let employee = await User.findById(req.params.id);
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Pegawai tidak ditemukan'
    });
  }
  
  // Check if username or email is being changed and already exists
  if (req.body.username || req.body.email) {
    const filter = { _id: { $ne: req.params.id } };
    
    if (req.body.username) {
      filter.username = req.body.username;
    }
    
    if (req.body.email && req.body.email !== '') {
      filter.email = req.body.email;
    }
    
    const existingUser = await User.findOne({ $or: [filter] });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username atau email sudah terdaftar oleh pegawai lain'
      });
    }
  }
  
  // Process file uploads
  const employeeData = { ...req.body };
  
  if (req.files) {
    // Handle profile photo
    if (req.files.fotoProfil) {
      // Delete old file if exists and not default
      if (employee.fotoProfil && employee.fotoProfil !== 'default.jpg') {
        const oldFilePath = path.join(__dirname, '..', 'public', employee.fotoProfil);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      const profileFile = req.files.fotoProfil[0];
      employeeData.fotoProfil = `/uploads/${profileFile.filename}`;
    }
    
    // Handle KTP document
    if (req.files['dokumen.ktp']) {
      // Delete old file if exists
      if (employee.dokumen && employee.dokumen.ktp) {
        const oldFilePath = path.join(__dirname, '..', 'public', employee.dokumen.ktp);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      if (!employeeData.dokumen) {
        employeeData.dokumen = {};
      }
      const ktpFile = req.files['dokumen.ktp'][0];
      employeeData.dokumen.ktp = `/uploads/${ktpFile.filename}`;
    }
    
    // Handle NPWP document
    if (req.files['dokumen.npwp']) {
      // Delete old file if exists
      if (employee.dokumen && employee.dokumen.npwp) {
        const oldFilePath = path.join(__dirname, '..', 'public', employee.dokumen.npwp);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      if (!employeeData.dokumen) {
        employeeData.dokumen = {};
      }
      const npwpFile = req.files['dokumen.npwp'][0];
      employeeData.dokumen.npwp = `/uploads/${npwpFile.filename}`;
    }
  }
  
  // Handle password update
  if (employeeData.password && employeeData.password.trim() === '') {
    delete employeeData.password;
  }
  
  // Update employee
  const updatedEmployee = await User.findByIdAndUpdate(
    req.params.id,
    employeeData,
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
    data: updatedEmployee
  });
});

// @desc      Delete employee
// @route     DELETE /api/employees/:id
// @access    Private
exports.deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id);
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Pegawai tidak ditemukan'
    });
  }
  
  // Delete files
  if (employee.fotoProfil && employee.fotoProfil !== 'default.jpg') {
    const profilePath = path.join(__dirname, '..', 'public', employee.fotoProfil);
    if (fs.existsSync(profilePath)) {
      fs.unlinkSync(profilePath);
    }
  }
  
  if (employee.dokumen) {
    if (employee.dokumen.ktp) {
      const ktpPath = path.join(__dirname, '..', 'public', employee.dokumen.ktp);
      if (fs.existsSync(ktpPath)) {
        fs.unlinkSync(ktpPath);
      }
    }
    
    if (employee.dokumen.npwp) {
      const npwpPath = path.join(__dirname, '..', 'public', employee.dokumen.npwp);
      if (fs.existsSync(npwpPath)) {
        fs.unlinkSync(npwpPath);
      }
    }
  }
  
  // Either soft delete by deactivating or hard delete
  if (req.query.hardDelete === 'true') {
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