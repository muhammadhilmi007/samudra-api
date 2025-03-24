// controllers/roleController.js
const Role = require('../models/Role');
const User = require('../models/User');
const asyncHandler = require('../middlewares/asyncHandler');

// @desc      Get all roles
// @route     GET /api/roles
// @access    Private
exports.getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find();
  
  res.status(200).json({
    success: true,
    count: roles.length,
    data: roles
  });
});

// @desc      Get single role
// @route     GET /api/roles/:id
// @access    Private
exports.getRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc      Create role
// @route     POST /api/roles
// @access    Private
exports.createRole = asyncHandler(async (req, res) => {
  // Check if role with name already exists
  const existingRole = await Role.findOne({ namaRole: req.body.namaRole });
  
  if (existingRole) {
    return res.status(400).json({
      success: false,
      message: 'Role dengan nama ini sudah ada'
    });
  }

  const role = await Role.create(req.body);
  
  res.status(201).json({
    success: true,
    data: role
  });
});

// @desc      Update role
// @route     PUT /api/roles/:id
// @access    Private
exports.updateRole = asyncHandler(async (req, res) => {
  // Check if role name already exists (for different role)
  if (req.body.namaRole) {
    const existingRole = await Role.findOne({
      namaRole: req.body.namaRole,
      _id: { $ne: req.params.id }
    });
    
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role dengan nama ini sudah ada'
      });
    }
  }
  
  const role = await Role.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc      Delete role
// @route     DELETE /api/roles/:id
// @access    Private
exports.deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role tidak ditemukan'
    });
  }
  
  // Check if role is used by any user
  const userWithRole = await User.findOne({ roleId: req.params.id });
  
  if (userWithRole) {
    return res.status(400).json({
      success: false,
      message: 'Role sedang digunakan oleh pegawai dan tidak dapat dihapus'
    });
  }
  
  await role.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Role berhasil dihapus'
  });
});