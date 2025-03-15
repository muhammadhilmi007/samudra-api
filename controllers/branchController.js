const Branch = require('../models/Branch');
const Division = require('../models/Division');

// @desc      Get all branches
// @route     GET /api/branches
// @access    Private
exports.getBranches = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.divisiId) {
      filter.divisiId = req.query.divisiId;
    }
    
    const branches = await Branch.find(filter).populate('divisiId');
    
    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data cabang',
      error: error.message
    });
  }
};

// @desc      Get single branch
// @route     GET /api/branches/:id
// @access    Private
exports.getBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('divisiId');
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data cabang',
      error: error.message
    });
  }
};

// @desc      Create new branch
// @route     POST /api/branches
// @access    Private
exports.createBranch = async (req, res) => {
  try {
    // Cek apakah divisi ada
    const division = await Division.findById(req.body.divisiId);
    
    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Divisi tidak ditemukan'
      });
    }
    
    // Cek apakah nama cabang sudah ada
    const existingBranch = await Branch.findOne({
      namaCabang: req.body.namaCabang
    });
    
    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: 'Nama cabang sudah ada'
      });
    }
    
    const branch = await Branch.create(req.body);
    
    res.status(201).json({
      success: true,
      data: branch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat cabang',
      error: error.message
    });
  }
};

// @desc      Update branch
// @route     PUT /api/branches/:id
// @access    Private
exports.updateBranch = async (req, res) => {
  try {
    // Cek apakah divisi ada jika divisiId diupdate
    if (req.body.divisiId) {
      const division = await Division.findById(req.body.divisiId);
      
      if (!division) {
        return res.status(404).json({
          success: false,
          message: 'Divisi tidak ditemukan'
        });
      }
    }
    
    // Cek apakah nama cabang sudah ada
    if (req.body.namaCabang) {
      const existingBranch = await Branch.findOne({
        namaCabang: req.body.namaCabang,
        _id: { $ne: req.params.id }
      });
      
      if (existingBranch) {
        return res.status(400).json({
          success: false,
          message: 'Nama cabang sudah ada'
        });
      }
    }
    
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('divisiId');
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate cabang',
      error: error.message
    });
  }
};

// @desc      Delete branch
// @route     DELETE /api/branches/:id
// @access    Private
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
    
    // Cek apakah cabang memiliki data terkait
    // Contoh: cek apakah ada pegawai di cabang ini
    const User = require('../models/User');
    const hasUsers = await User.findOne({ cabangId: req.params.id });
    
    if (hasUsers) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus cabang yang memiliki pegawai'
      });
    }
    
    await branch.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Cabang berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus cabang',
      error: error.message
    });
  }
};

// @desc      Get branches by division
// @route     GET /api/branches/by-division/:divisionId
// @access    Private
exports.getBranchesByDivision = async (req, res) => {
  try {
    const branches = await Branch.find({
      divisiId: req.params.divisionId
    }).populate('divisiId');
    
    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data cabang',
      error: error.message
    });
  }
};