const User = require('../models/User');

// @desc      Get all users
// @route     GET /api/users
// @access    Private
exports.getUsers = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.aktif) {
      filter.aktif = req.query.aktif === 'true';
    }
    
    const users = await User.find(filter).populate('cabangId');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data users',
      error: error.message
    });
  }
};

// @desc      Get single user
// @route     GET /api/users/:id
// @access    Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('cabangId');
    
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data user',
      error: error.message
    });
  }
};

// @desc      Create user
// @route     POST /api/users
// @access    Private
exports.createUser = async (req, res) => {
  try {
    // Cek apakah username atau email sudah ada
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
    
    const user = await User.create(req.body);
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat user',
      error: error.message
    });
  }
};

// @desc      Update user
// @route     PUT /api/users/:id
// @access    Private
exports.updateUser = async (req, res) => {
  try {
    // Cek jika user mencoba update username atau email yang sudah ada
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
    
    // Jangan update password melalui route ini
    if (req.body.password) {
      delete req.body.password;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('cabangId');
    
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate user',
      error: error.message
    });
  }
};

// @desc      Delete user
// @route     DELETE /api/users/:id
// @access    Private
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    
    // Soft delete dengan mengubah status aktif
    user.aktif = false;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User berhasil dinonaktifkan'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus user',
      error: error.message
    });
  }
};

// @desc      Get users by branch
// @route     GET /api/users/by-branch/:branchId
// @access    Private
exports.getUsersByBranch = async (req, res) => {
  try {
    const users = await User.find({
      cabangId: req.params.branchId,
      aktif: true
    }).populate('cabangId');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data users',
      error: error.message
    });
  }
};