const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware untuk melindungi route yang memerlukan autentikasi
exports.protect = async (req, res, next) => {
  let token;

  // Cek header authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Ambil token dari header
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Ambil token dari cookie
    token = req.cookies.token;
  }

  // Cek apakah token ada
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Anda tidak memiliki akses ke resource ini'
    });
  }

  try {
    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ambil user dari database
    req.user = await User.findById(decoded.id);

    // Cek apakah user masih aktif
    if (!req.user.aktif) {
      return res.status(401).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Anda tidak memiliki akses ke resource ini'
    });
  }
};

// Middleware untuk membatasi akses berdasarkan role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Peran ${req.user.role} tidak memiliki hak akses ke resource ini`
      });
    }
    next();
  };
};