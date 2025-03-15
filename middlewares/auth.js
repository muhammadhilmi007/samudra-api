const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// Protect routes - middleware to require login
exports.protect = async (req, res, next) => {
  let token;
  
  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header (format: Bearer {token})
    token = req.headers.authorization.split(' ')[1];
  } 
  // TODO: Allow token from cookie for web app if needed
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses tidak diizinkan, silakan login terlebih dahulu'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || config.jwt.secret);
    
    // Get user from the token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    
    // Check if user is active
    if (!user.aktif) {
      return res.status(401).json({
        success: false,
        message: 'Akun telah dinonaktifkan, silakan hubungi administrator'
      });
    }
    
    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Sesi tidak valid, silakan login kembali',
      error: error.message
    });
  }
};

// Role authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Akses tidak diizinkan, silakan login terlebih dahulu'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Peran ${req.user.role} tidak memiliki akses ke endpoint ini`
      });
    }
    
    next();
  };
};