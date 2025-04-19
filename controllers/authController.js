const User = require('../models/User');
const Role = require('../models/Role');
const mongoose = require('mongoose');

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
      .populate('roleId', 'namaRole kodeRole permissions isActive');

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

    // Update last login time
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Get user roles
    const userRoles = await user.getRoles();
    
    // Get all user permissions
    const permissions = await user.getAllPermissions();
    
    // Get primary role
    const primaryRole = await user.getPrimaryRole();

    // Create token with all roles and permissions
    const token = await user.getSignedJwtToken();

    // Prepare user data to send back without sensitive info
    const userData = {
      id: user._id,
      nama: user.nama,
      email: user.email,
      telepon: user.telepon,
      alamat: user.alamat,
      jabatan: user.jabatan,
      // Include legacy role for backward compatibility
      role: user.role,
      roleId: primaryRole._id,
      // Include all roles
      roles: userRoles.map(ur => ({
        id: ur.roleId._id,
        name: ur.roleId.namaRole,
        code: ur.roleId.kodeRole,
        isPrimary: ur.isPrimary,
        isActive: ur.roleId.isActive
      })),
      permissions: permissions,
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
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
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
    const {
      nama,
      username,
      email,
      password,
      jabatan,
      roleId,
      telepon,
      alamat,
      cabangId,
      roles // Optional array of role IDs
    } = req.body;

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

    // Get primary role to set legacy role code
    const primaryRoleId = roleId || (roles && roles.length > 0 ? roles[0].roleId : null);
    
    if (!primaryRoleId) {
      return res.status(400).json({
        success: false,
        message: 'Role harus diisi'
      });
    }
    
    const primaryRole = await Role.findById(primaryRoleId);
    if (!primaryRole) {
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
      roleId: primaryRoleId,
      role: primaryRole.kodeRole, // Set role code based on primary role ID
      telepon,
      alamat,
      cabangId,
      aktif: true
    });

    // Create user-role mappings if roles array is provided
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const UserRole = mongoose.model('UserRole');
      
      // Process each role
      for (const roleItem of roles) {
        // Skip if role doesn't exist
        const role = await Role.findById(roleItem.roleId);
        if (!role) continue;
        
        // Create user-role mapping
        await UserRole.create({
          userId: user._id,
          roleId: roleItem.roleId,
          isPrimary: roleItem.isPrimary || (roleItem.roleId.toString() === primaryRoleId.toString())
        });
      }
    } else {
      // Create a single user-role mapping for the primary role
      const UserRole = mongoose.model('UserRole');
      await UserRole.create({
        userId: user._id,
        roleId: primaryRoleId,
        isPrimary: true
      });
    }

    // Get user roles after creation
    const userRoles = await user.getRoles();
    
    // Get all user permissions
    const permissions = await user.getAllPermissions();

    // Create token
    const token = await user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        roles: userRoles.map(ur => ({
          id: ur.roleId._id,
          name: ur.roleId.namaRole,
          code: ur.roleId.kodeRole,
          isPrimary: ur.isPrimary
        })),
        permissions: permissions,
        cabangId: user.cabangId,
        aktif: user.aktif
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendaftarkan user',
      error: error.message
    });
  }
};

// @desc      Get current logged in user
// @route     GET /api/auth/me
// @access    Private
exports.getMe = async (req, res) => {
  try {
    // Get user with populated fields
    const user = await User.findById(req.user.id)
      .populate('cabangId', 'namaCabang alamat kota provinsi')
      .populate('roleId', 'namaRole kodeRole permissions');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Get user roles
    const userRoles = await user.getRoles();
    
    // Get all user permissions
    const permissions = await user.getAllPermissions();
    
    // Get primary role
    const primaryRole = await user.getPrimaryRole();

    // Prepare user data to send back
    const userData = {
      id: user._id,
      nama: user.nama,
      email: user.email,
      telepon: user.telepon,
      alamat: user.alamat,
      jabatan: user.jabatan,
      // Include legacy role for backward compatibility
      role: user.role,
      roleId: primaryRole._id,
      // Include all roles
      roles: userRoles.map(ur => ({
        id: ur.roleId._id,
        name: ur.roleId.namaRole,
        code: ur.roleId.kodeRole,
        isPrimary: ur.isPrimary,
        isActive: ur.roleId.isActive
      })),
      permissions: permissions,
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
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data user',
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
    // Get user with populated fields
    const user = await User.findById(req.user.id)
      .populate('cabangId', 'namaCabang alamat kota provinsi')
      .populate('roleId', 'namaRole kodeRole permissions');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Get user roles
    const userRoles = await user.getRoles();
    
    // Get all user permissions
    const permissions = await user.getAllPermissions();
    
    // Get primary role
    const primaryRole = await user.getPrimaryRole();

    // Create new token with all roles and permissions
    const token = await user.getSignedJwtToken();

    // Prepare user data to send back
    const userData = {
      id: user._id,
      nama: user.nama,
      email: user.email,
      telepon: user.telepon,
      alamat: user.alamat,
      jabatan: user.jabatan,
      // Include legacy role for backward compatibility
      role: user.role,
      roleId: primaryRole._id,
      // Include all roles
      roles: userRoles.map(ur => ({
        id: ur.roleId._id,
        name: ur.roleId.namaRole,
        code: ur.roleId.kodeRole,
        isPrimary: ur.isPrimary,
        isActive: ur.roleId.isActive
      })),
      permissions: permissions,
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
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Refresh token error:', error);
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

    // Generate new token
    const token = await user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      message: 'Password berhasil diubah'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah password',
      error: error.message
    });
  }
};

// @desc      Assign role to user
// @route     POST /api/auth/assign-role
// @access    Private (Admin only)
exports.assignRole = async (req, res) => {
  try {
    const { userId, roleId, isPrimary = false } = req.body;
    const UserRole = require('../models/UserRole');

    // Validate input
    if (!userId || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Role ID are required'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if user already has this role
    const existingUserRole = await UserRole.findOne({ userId, roleId });
    
    if (existingUserRole) {
      // Update the existing user role
      existingUserRole.isPrimary = isPrimary;
      await existingUserRole.save();
      
      // If this is set as primary, update other roles to non-primary
      if (isPrimary) {
        await UserRole.updateMany(
          { userId, roleId: { $ne: roleId } },
          { $set: { isPrimary: false } }
        );
      }
      
      return res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: existingUserRole
      });
    }

    // Create new user role
    const userRole = await UserRole.create({
      userId,
      roleId,
      isPrimary
    });

    // If this is set as primary, update other roles to non-primary
    if (isPrimary) {
      await UserRole.updateMany(
        { userId, roleId: { $ne: roleId } },
        { $set: { isPrimary: false } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Role assigned to user successfully',
      data: userRole
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign role',
      error: error.message
    });
  }
};
