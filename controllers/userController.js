const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const UserRole = require('../models/UserRole');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const asyncHandler = require('../middlewares/asyncHandler');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// @desc      Get all users
// @route     GET /api/users
// @access    Private
exports.getUsers = asyncHandler(async (req, res) => {
  // Filter berdasarkan query
  const filter = {};
  
  if (req.query.cabangId) {
    filter.cabangId = req.query.cabangId;
  }
  
  if (req.query.roleId) {
    filter.roleId = req.query.roleId;
  }

  if (req.query.role) {
    filter.role = req.query.role;
  }
  
  if (req.query.aktif !== undefined) {
    filter.aktif = req.query.aktif === 'true';
  }
  
  // Search query
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$or = [
      { nama: searchRegex },
      { username: searchRegex },
      { email: searchRegex },
      { jabatan: searchRegex }
    ];
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  const users = await User.find(filter)
    .populate('cabangId', 'namaCabang alamat kota')
    .populate('roleId', 'namaRole kodeRole permissions')
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  // Get total count for pagination
  const total = await User.countDocuments(filter);
  
  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: startIndex + limit < total,
      hasPrevPage: page > 1
    },
    data: users
  });
});

// @desc      Get single user
// @route     GET /api/users/:id
// @access    Private
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('cabangId', 'namaCabang alamat kota provinsi')
    .populate('roleId', 'namaRole kodeRole permissions');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc      Create user
// @route     POST /api/users
// @access    Private
exports.createUser = asyncHandler(async (req, res) => {
  // Check if username or email already exists
  const existingUser = await User.findOne({
    $or: [
      { username: req.body.username },
      { email: req.body.email }
    ]
  });
  
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Username atau email sudah terdaftar'
    });
  }
  
  // Get role to set role code
  if (req.body.roleId) {
    const role = await Role.findById(req.body.roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role tidak ditemukan'
      });
    }
    
    // Set role code based on role ID
    req.body.role = role.kodeRole;
  } else {
    return res.status(400).json({
      success: false,
      message: 'RoleId harus diisi'
    });
  }
  
  // Make sure cabangId exists
  if (req.body.cabangId) {
    const branch = await Branch.findById(req.body.cabangId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
  }
  
  // Handle file uploads if any
  const userData = { ...req.body };
  
  if (req.files) {
    // Upload directory
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Handle profile picture
    if (req.files.fotoProfil) {
      const file = req.files.fotoProfil;
      const fileName = `profile-${uuidv4()}${path.extname(file.name)}`;
      const filePath = path.join(uploadDir, fileName);
      
      await file.mv(filePath);
      userData.fotoProfil = `/uploads/${fileName}`;
    }
    
    // Handle KTP document
    if (req.files['dokumen.ktp']) {
      const file = req.files['dokumen.ktp'];
      const fileName = `ktp-${uuidv4()}${path.extname(file.name)}`;
      const filePath = path.join(uploadDir, fileName);
      
      await file.mv(filePath);
      
      if (!userData.dokumen) {
        userData.dokumen = {};
      }
      userData.dokumen.ktp = `/uploads/${fileName}`;
    }
    
    // Handle NPWP document
    if (req.files['dokumen.npwp']) {
      const file = req.files['dokumen.npwp'];
      const fileName = `npwp-${uuidv4()}${path.extname(file.name)}`;
      const filePath = path.join(uploadDir, fileName);
      
      await file.mv(filePath);
      
      if (!userData.dokumen) {
        userData.dokumen = {};
      }
      userData.dokumen.npwp = `/uploads/${fileName}`;
    }
  }
  
  // Log the userData before creating the user for debugging
  console.log('Creating user with data:', JSON.stringify(userData, null, 2));

  // Create user
  const user = await User.create(userData);
  
  // Populate references for response
  const populatedUser = await User.findById(user._id)
    .populate('cabangId', 'namaCabang alamat kota')
    .populate('roleId', 'namaRole kodeRole permissions');
  
  // Create user-role mapping for the primary role
  await UserRole.create({
    userId: user._id,
    roleId: req.body.roleId,
    isPrimary: true
  });
  
  res.status(201).json({
    success: true,
    data: populatedUser
  });
});

// @desc      Update user
// @route     PUT /api/users/:id
// @access    Private
exports.updateUser = asyncHandler(async (req, res) => {
  // Find the user
  let user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  // Check if trying to update username or email that already exists
  if (req.body.username || req.body.email) {
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.params.id } },
        {
          $or: [
            { username: req.body.username },
            { email: req.body.email }
          ]
        }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username atau email sudah terdaftar'
      });
    }
  }
  
  // Update role code if roleId is provided
  if (req.body.roleId) {
    const role = await Role.findById(req.body.roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role tidak ditemukan'
      });
    }
    
    // Update role code based on role ID
    req.body.role = role.kodeRole;
  }
  
  // Make sure cabangId exists if provided
  if (req.body.cabangId) {
    const branch = await Branch.findById(req.body.cabangId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
  }
  
  // Handle file uploads if any
  const userData = { ...req.body };
  
  if (req.files) {
    // Upload directory
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Handle profile picture
    if (req.files.fotoProfil) {
      // Remove old profile picture if exists
      if (user.fotoProfil && user.fotoProfil !== 'default.jpg') {
        const oldPath = path.join(__dirname, '..', user.fotoProfil);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      const file = req.files.fotoProfil;
      const fileName = `profile-${uuidv4()}${path.extname(file.name)}`;
      const filePath = path.join(uploadDir, fileName);
      
      await file.mv(filePath);
      userData.fotoProfil = `/uploads/${fileName}`;
    }
    
    // Handle KTP document
    if (req.files['dokumen.ktp']) {
      // Remove old KTP document if exists
      if (user.dokumen && user.dokumen.ktp) {
        const oldPath = path.join(__dirname, '..', user.dokumen.ktp);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      const file = req.files['dokumen.ktp'];
      const fileName = `ktp-${uuidv4()}${path.extname(file.name)}`;
      const filePath = path.join(uploadDir, fileName);
      
      await file.mv(filePath);
      
      if (!userData.dokumen) {
        userData.dokumen = {};
      }
      userData.dokumen.ktp = `/uploads/${fileName}`;
    }
    
    // Handle NPWP document
    if (req.files['dokumen.npwp']) {
      // Remove old NPWP document if exists
      if (user.dokumen && user.dokumen.npwp) {
        const oldPath = path.join(__dirname, '..', user.dokumen.npwp);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      const file = req.files['dokumen.npwp'];
      const fileName = `npwp-${uuidv4()}${path.extname(file.name)}`;
      const filePath = path.join(uploadDir, fileName);
      
      await file.mv(filePath);
      
      if (!userData.dokumen) {
        userData.dokumen = {};
      }
      userData.dokumen.npwp = `/uploads/${fileName}`;
    }
  }
  
  // If password is provided, it will be hashed by the model pre-save middleware
  if (!userData.password) {
    delete userData.password;
  }
  
  // Update user
  user = await User.findByIdAndUpdate(
    req.params.id,
    userData,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('cabangId', 'namaCabang alamat kota')
    .populate('roleId', 'namaRole kodeRole permissions');
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc      Delete user
// @route     DELETE /api/users/:id
// @access    Private
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  // Instead of hard delete, just set aktif to false
  user.aktif = false;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'User berhasil dinonaktifkan'
  });
});

// @desc      Get users by branch
// @route     GET /api/users/branch/:branchId
// @access    Private
exports.getUsersByBranch = asyncHandler(async (req, res) => {
  const users = await User.find({
    cabangId: req.params.branchId,
    aktif: true
  })
    .populate('cabangId', 'namaCabang alamat kota')
    .populate('roleId', 'namaRole kodeRole permissions')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc      Upload profile picture
// @route     PUT /api/users/:id/profile-picture
// @access    Private
exports.uploadProfilePicture = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  if (!req.files || !req.files.fotoProfil) {
    return res.status(400).json({
      success: false,
      message: 'Mohon unggah foto profil'
    });
  }
  
  // Upload directory
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Remove old profile picture if exists
  if (user.fotoProfil && user.fotoProfil !== 'default.jpg') {
    const oldPath = path.join(__dirname, '..', user.fotoProfil);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }
  
  const file = req.files.fotoProfil;
  const fileName = `profile-${uuidv4()}${path.extname(file.name)}`;
  const filePath = path.join(uploadDir, fileName);
  
  await file.mv(filePath);
  
  // Update user
  user.fotoProfil = `/uploads/${fileName}`;
  await user.save();
  
  res.status(200).json({
    success: true,
    data: {
      fotoProfil: user.fotoProfil
    }
  });
});

// @desc      Upload document
// @route     PUT /api/users/:id/document
// @access    Private
exports.uploadDocument = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Mohon unggah dokumen'
    });
  }
  
  // Upload directory
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Initialize dokumen object if it doesn't exist
  if (!user.dokumen) {
    user.dokumen = {};
  }
  
  // Process each document
  const documents = {};
  
  // Process KTP document
  if (req.files.ktp) {
    // Remove old KTP document if exists
    if (user.dokumen.ktp) {
      const oldPath = path.join(__dirname, '..', user.dokumen.ktp);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    const file = req.files.ktp;
    const fileName = `ktp-${uuidv4()}${path.extname(file.name)}`;
    const filePath = path.join(uploadDir, fileName);
    
    await file.mv(filePath);
    
    user.dokumen.ktp = `/uploads/${fileName}`;
    documents.ktp = user.dokumen.ktp;
  }
  
  // Process NPWP document
  if (req.files.npwp) {
    // Remove old NPWP document if exists
    if (user.dokumen.npwp) {
      const oldPath = path.join(__dirname, '..', user.dokumen.npwp);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    
    const file = req.files.npwp;
    const fileName = `npwp-${uuidv4()}${path.extname(file.name)}`;
    const filePath = path.join(uploadDir, fileName);
    
    await file.mv(filePath);
    
    user.dokumen.npwp = `/uploads/${fileName}`;
    documents.npwp = user.dokumen.npwp;
  }
  
  // Process other documents
  if (req.files.lainnya) {
    const files = Array.isArray(req.files.lainnya) ? req.files.lainnya : [req.files.lainnya];
    
    user.dokumen.lainnya = user.dokumen.lainnya || [];
    
    for (const file of files) {
      const fileName = `doc-${uuidv4()}${path.extname(file.name)}`;
      const filePath = path.join(uploadDir, fileName);
      
      await file.mv(filePath);
      
      user.dokumen.lainnya.push(`/uploads/${fileName}`);
    }
    
    documents.lainnya = user.dokumen.lainnya;
  }
  
  // Save user
  await user.save();
  
  res.status(200).json({
    success: true,
    data: {
      dokumen: documents
    }
  });
});

// @desc      Toggle user status (active/inactive)
// @route     PATCH /api/users/:id/status
// @access    Private
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  // Find the user
  let user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  // Toggle status or set to specific value
  if (req.body.aktif !== undefined) {
    user.aktif = req.body.aktif;
  } else {
    user.aktif = !user.aktif;
  }
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: `User ${user.aktif ? 'diaktifkan' : 'dinonaktifkan'} berhasil`,
    data: user
  });
});

// @desc      Get user roles
// @route     GET /api/users/:id/roles
// @access    Private
exports.getUserRoles = asyncHandler(async (req, res) => {
  // Check if user exists
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  // Get user roles
  const userRoles = await UserRole.find({ userId: req.params.id })
    .populate('roleId', 'namaRole kodeRole isActive');
  
  // Format response
  const formattedRoles = userRoles.map(ur => ({
    id: ur.roleId._id,
    name: ur.roleId.namaRole,
    code: ur.roleId.kodeRole,
    isPrimary: ur.isPrimary,
    isActive: ur.roleId.isActive
  }));
  
  res.status(200).json({
    success: true,
    count: formattedRoles.length,
    data: formattedRoles
  });
});

// @desc      Update user roles
// @route     POST /api/users/:id/roles
// @access    Private
exports.updateUserRoles = asyncHandler(async (req, res) => {
  // Check if user exists
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  // Validate request body
  if (!req.body.roles || !Array.isArray(req.body.roles)) {
    return res.status(400).json({
      success: false,
      message: 'Roles harus berupa array'
    });
  }
  
  // Validate that at least one role is marked as primary
  const hasPrimaryRole = req.body.roles.some(role => role.isPrimary);
  
  if (req.body.roles.length > 0 && !hasPrimaryRole) {
    return res.status(400).json({
      success: false,
      message: 'Setidaknya satu peran harus ditandai sebagai utama'
    });
  }
  
  // Start a transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Delete existing user-role mappings
    await UserRole.deleteMany({ userId: req.params.id }, { session });
    
    // Create new user-role mappings
    if (req.body.roles.length > 0) {
      const userRoles = req.body.roles.map(role => ({
        userId: req.params.id,
        roleId: role.roleId,
        isPrimary: role.isPrimary
      }));
      
      await UserRole.insertMany(userRoles, { session });
      
      // Update user's primary role in the User model
      const primaryRole = req.body.roles.find(role => role.isPrimary);
      if (primaryRole) {
        const role = await Role.findById(primaryRole.roleId);
        if (role) {
          user.roleId = primaryRole.roleId;
          user.role = role.kodeRole; // Update legacy role code
          await user.save({ session });
        }
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    // Get updated user roles
    const updatedUserRoles = await UserRole.find({ userId: req.params.id })
      .populate('roleId', 'namaRole kodeRole isActive');
    
    // Format response
    const formattedRoles = updatedUserRoles.map(ur => ({
      id: ur.roleId._id,
      name: ur.roleId.namaRole,
      code: ur.roleId.kodeRole,
      isPrimary: ur.isPrimary,
      isActive: ur.roleId.isActive
    }));
    
    res.status(200).json({
      success: true,
      message: 'Peran pengguna berhasil diperbarui',
      count: formattedRoles.length,
      data: formattedRoles
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    throw error;
  }
});

// @desc      Get user permissions
// @route     GET /api/users/:id/permissions
// @access    Private
exports.getUserPermissions = asyncHandler(async (req, res) => {
  // Check if user exists
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  // Get all user roles
  const userRoles = await UserRole.find({ userId: req.params.id })
    .populate('roleId');
  
  if (userRoles.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }
  
  // Get role IDs
  const roleIds = userRoles.map(ur => ur.roleId._id);
  
  // Get permissions for these roles
  const rolePermissions = await RolePermission.find({
    roleId: { $in: roleIds }
  }).populate('permissionId');
  
  // Extract unique permission codes
  const uniquePermissions = new Set();
  rolePermissions.forEach(rp => {
    if (rp.permissionId && rp.permissionId.code) {
      uniquePermissions.add(rp.permissionId.code);
    }
  });
  
  res.status(200).json({
    success: true,
    count: uniquePermissions.size,
    data: Array.from(uniquePermissions)
  });
});

// @desc      Preview permissions for selected roles
// @route     POST /api/permissions/preview
// @access    Private
exports.previewPermissions = asyncHandler(async (req, res) => {
  // Validate request body
  if (!req.body.roleIds || !Array.isArray(req.body.roleIds)) {
    return res.status(400).json({
      success: false,
      message: 'roleIds harus berupa array'
    });
  }
  
  if (req.body.roleIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }
  
  // Get permissions for these roles
  const rolePermissions = await RolePermission.find({
    roleId: { $in: req.body.roleIds }
  }).populate('permissionId');
  
  // Extract unique permission codes
  const uniquePermissions = new Set();
  rolePermissions.forEach(rp => {
    if (rp.permissionId && rp.permissionId.code) {
      uniquePermissions.add(rp.permissionId.code);
    }
  });
  
  res.status(200).json({
    success: true,
    count: uniquePermissions.size,
    data: Array.from(uniquePermissions)
  });
});

// @desc      Upload user profile image
// @route     POST /api/users/:id/profile-image
// @access    Private
exports.uploadProfileImage = asyncHandler(async (req, res) => {
  // Find the user
  let user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan'
    });
  }
  
  if (!req.files || !req.files.profileImage) {
    return res.status(400).json({
      success: false,
      message: 'Tidak ada file yang diunggah'
    });
  }
  
  // Upload directory
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Handle profile picture
  const file = req.files.profileImage;
  const fileName = `profile-${uuidv4()}${path.extname(file.name)}`;
  const filePath = path.join(uploadDir, fileName);
  
  // Delete old profile image if exists
  if (user.fotoProfil && user.fotoProfil !== 'default.jpg') {
    const oldFilePath = path.join(__dirname, '..', user.fotoProfil);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }
  }
  
  // Upload new image
  await file.mv(filePath);
  user.fotoProfil = fileName;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Foto profil berhasil diunggah',
    data: {
      fotoProfil: fileName
    }
  });
});