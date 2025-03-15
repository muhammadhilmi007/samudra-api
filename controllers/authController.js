const User = require('../models/User');

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
    const user = await User.findOne({ username }).select('+password');

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

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        cabangId: user.cabangId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal login',
      error: error.message
    });
  }
};

// @desc      Get current logged in user
// @route     GET /api/auth/me
// @access    Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('cabangId');

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

// @desc      Logout user / clear cookie
// @route     POST /api/auth/logout
// @access    Private
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Berhasil logout'
  });
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