const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/config");
const asyncHandler = require("./asyncHandler");
const Pickup = require("../models/Pickup");

// Protect routes - middleware to require login
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Get token from header (format: Bearer {token})
    token = req.headers.authorization.split(" ")[1];
  }
  // Also allow token from cookie for web app
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses tidak diizinkan, silakan login terlebih dahulu",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || config.jwt.secret
    );

    // Get user from the token
    const user = await User.findById(decoded.id).populate(
      "roleId",
      "permissions"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Check if user is active
    if (!user.aktif) {
      return res.status(401).json({
        success: false,
        message: "Akun telah dinonaktifkan, silakan hubungi administrator",
      });
    }

    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Sesi tidak valid, silakan login kembali",
      error: error.message,
    });
  }
});

// Role authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Akses tidak diizinkan, silakan login terlebih dahulu",
      });
    }

    // Check if user role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Peran ${req.user.role} tidak memiliki akses ke endpoint ini`,
      });
    }

    next();
  };
};

// Permission authorization middleware
exports.checkPermission = (...permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Akses tidak diizinkan, silakan login terlebih dahulu",
      });
    }

    // Special case for drivers accessing their own pickups
    if (req.user.role === 'supir' && 
        req.path.startsWith('/pickups/') && 
        !req.path.includes('/status')) {
      
      // Get pickup ID from URL
      const pickupId = req.path.split('/')[2];
      
      // Check if this pickup belongs to the driver
      const pickup = await Pickup.findById(pickupId);
      
      if (pickup && pickup.supirId.toString() === req.user._id.toString()) {
        return next();
      }
    }

    // Make sure user role is populated
    if (!req.user.roleId) {
      await req.user.populate("roleId", "permissions");
    }

    // Check if user has any of the required permissions
    const hasPermission = permissions.some((permission) =>
      req.user.roleId.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin untuk mengakses resource ini",
      });
    }

    next();
  };
};
