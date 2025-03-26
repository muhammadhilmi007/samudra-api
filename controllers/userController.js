const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const asyncHandler = require('../middlewares/asyncHandler');
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
// @route     GET /api/users/by-branch/:branchId
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