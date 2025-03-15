const Division = require('../models/Division');

// @desc      Get all divisions
// @route     GET /api/divisions
// @access    Private
exports.getDivisions = async (req, res) => {
  try {
    const divisions = await Division.find();
    
    res.status(200).json({
      success: true,
      count: divisions.length,
      data: divisions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data divisi',
      error: error.message
    });
  }
};

// @desc      Get single division
// @route     GET /api/divisions/:id
// @access    Private
exports.getDivision = async (req, res) => {
  try {
    const division = await Division.findById(req.params.id);
    
    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Divisi tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: division
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data divisi',
      error: error.message
    });
  }
};

// @desc      Create new division
// @route     POST /api/divisions
// @access    Private
exports.createDivision = async (req, res) => {
  try {
    // Cek apakah nama divisi sudah ada
    const existingDivision = await Division.findOne({
      namaDivisi: req.body.namaDivisi
    });
    
    if (existingDivision) {
      return res.status(400).json({
        success: false,
        message: 'Nama divisi sudah ada'
      });
    }
    
    const division = await Division.create(req.body);
    
    res.status(201).json({
      success: true,
      data: division
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat divisi',
      error: error.message
    });
  }
};

// @desc      Update division
// @route     PUT /api/divisions/:id
// @access    Private
exports.updateDivision = async (req, res) => {
  try {
    // Cek apakah nama divisi sudah ada
    if (req.body.namaDivisi) {
      const existingDivision = await Division.findOne({
        namaDivisi: req.body.namaDivisi,
        _id: { $ne: req.params.id }
      });
      
      if (existingDivision) {
        return res.status(400).json({
          success: false,
          message: 'Nama divisi sudah ada'
        });
      }
    }
    
    const division = await Division.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Divisi tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: division
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate divisi',
      error: error.message
    });
  }
};

// @desc      Delete division
// @route     DELETE /api/divisions/:id
// @access    Private
exports.deleteDivision = async (req, res) => {
  try {
    const division = await Division.findById(req.params.id);
    
    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Divisi tidak ditemukan'
      });
    }
    
    // Cek apakah divisi memiliki cabang
    const Branch = require('../models/Branch');
    const hasBranches = await Branch.findOne({ divisiId: req.params.id });
    
    if (hasBranches) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus divisi yang memiliki cabang'
      });
    }
    
    await division.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Divisi berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus divisi',
      error: error.message
    });
  }
};