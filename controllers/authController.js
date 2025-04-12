const User = require('../models/User');
const Role = require('../models/Role');

// @desc      Login user
// @route     POST /api/auth/login
// @access    Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Harap masukkan username dan password'
      });
    }

    // Cek apakah user ada
    const user = await User.findOne({ username }).select('+password')
      .populate('cabangId', 'namaCabang alamat kota provinsi')
      .populate('roleId', 'namaRole kodeRole permissions');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Kredensial tidak valid'
      });
    }

    // Cek apakah user aktif
    if (!user.aktif) {
      return res.status(401).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan'
      });
    }

    // Cek apakah password benar
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Kredensial tidak valid'
      });
    }

    // Create token
    const token = user.getSignedJwtToken();

    // Prepare user data to send back without sensitive info
    const userData = {
      id: user._id,
      nama: user.nama,
      email: user.email,
      telepon: user.telepon,
      alamat: user.alamat,
      jabatan: user.jabatan,
      role: user.role,
      roleId: user.roleId._id,
      permissions: user.roleId.permissions,
      cabangId: user.cabangId._id,
      cabang: {
        id: user.cabangId._id,
        namaCabang: user.cabangId.namaCabang,
        alamat: user.cabangId.alamat,
        kota: user.cabangId.kota,
        provinsi: user.cabangId.provinsi
      },
      fotoProfil: user.fotoProfil,
      aktif: user.aktif,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal login',
      error: error.message
    });
  }
};

// @desc      Register new user
// @route     POST /api/auth/register
// @access    Private (only admin can register users)
exports.register = async (req, res) => {
  try {
    const { nama, username, email, password, jabatan, roleId, telepon, alamat, cabangId } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { username },
        { email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username atau email sudah terdaftar'
      });
    }

    // Get role to set role code
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role tidak ditemukan'
      });
    }

    // Create user
    const user = await User.create({
      nama,
      username,
      email,
      password,
      jabatan,
      roleId,
      role: role.kodeRole, // Set role code based on role ID
      telepon,
      alamat,
      cabangId,
      aktif: true
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: {
        id: user._id,
        nama: user.nama,
        email: user.email,
        username: user.username,
        jabatan: user.jabatan,
        role: user.role,
        telepon: user.telepon,
        alamat: user.alamat,
        cabangId: user.cabangId,
        aktif: user.aktif
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal registrasi',
      error: error.message
    });
  }
};

// @desc      Get current logged in user
// @route     GET /api/auth/me
// @access    Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('cabangId', 'namaCabang alamat kota provinsi')
      .populate('roleId', 'namaRole kodeRole permissions');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Prepare user data to send back
    const userData = {
      id: user._id,
      nama: user.nama,
      email: user.email,
      telepon: user.telepon,
      alamat: user.alamat,
      jabatan: user.jabatan,
      role: user.role,
      roleId: user.roleId._id,
      permissions: user.roleId.permissions,
      cabangId: user.cabangId._id,
      cabang: {
        id: user.cabangId._id,
        namaCabang: user.cabangId.namaCabang,
        alamat: user.cabangId.alamat,
        kota: user.cabangId.kota,
        provinsi: user.cabangId.provinsi
      },
      fotoProfil: user.fotoProfil,
      aktif: user.aktif,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data user',
      error: error.message
    });
  }
};

// @desc      Logout user / clear cookie
// @route     POST /api/auth/logout
// @access    Private
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Berhasil logout'
  });
};

// @desc      Refresh JWT token
// @route     POST /api/auth/refresh-token
// @access    Private
exports.refreshToken = async (req, res) => {
  try {
    // Get user from request (set by auth middleware)
    const user = await User.findById(req.user.id)
      .populate('cabangId', 'namaCabang alamat kota provinsi')
      .populate('roleId', 'namaRole kodeRole permissions');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Generate new token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui token',
      error: error.message
    });
  }
};

// @desc      Change password
// @route     PUT /api/auth/change-password
// @access    Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validasi input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Harap masukkan password lama dan baru'
      });
    }

    // Cek user dan password lama
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Cek apakah password lama benar
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password lama tidak sesuai'
      });
    }

    // Set password baru
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password berhasil diubah'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah password',
      error: error.message
    });
  }
};