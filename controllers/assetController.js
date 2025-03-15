const Asset = require('../models/Asset');
const Branch = require('../models/Branch');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');

// @desc      Get all assets
// @route     GET /api/assets
// @access    Private
exports.getAssets = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      // Jika bukan direktur atau manajer keuangan, hanya tampilkan aset di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.tipeAset) {
      filter.tipeAset = req.query.tipeAset;
    }
    
    if (req.query.statusAset) {
      filter.statusAset = req.query.statusAset;
    }
    
    if (req.query.search) {
      filter.namaAset = { $regex: req.query.search, $options: 'i' };
    }
    
    // Date range filter untuk tanggal pembelian
    if (req.query.startDate && req.query.endDate) {
      filter.tanggalPembelian = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.tanggalPembelian = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.tanggalPembelian = { $lte: new Date(req.query.endDate) };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Asset.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const assets = await Asset.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: assets.length,
      pagination: pagination.pagination,
      total,
      data: assets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data aset',
      error: error.message
    });
  }
};

// @desc      Get single asset
// @route     GET /api/assets/:id
// @access    Private
exports.getAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data aset',
      error: error.message
    });
  }
};

// @desc      Create new asset
// @route     POST /api/assets
// @access    Private
exports.createAsset = async (req, res) => {
  try {
    // Validasi cabang jika diisi
    if (req.body.cabangId) {
      const branch = await Branch.findById(req.body.cabangId);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Cabang tidak ditemukan'
        });
      }
    } else {
      // Jika cabangId tidak diisi, gunakan cabang user yang login
      req.body.cabangId = req.user.cabangId;
    }
    
    // Validasi data aset
    if (!req.body.namaAset) {
      return res.status(400).json({
        success: false,
        message: 'Nama aset harus diisi'
      });
    }
    
    if (!req.body.tipeAset) {
      return res.status(400).json({
        success: false,
        message: 'Tipe aset harus diisi'
      });
    }
    
    if (!req.body.tanggalPembelian) {
      req.body.tanggalPembelian = new Date();
    }
    
    if (!req.body.nilaiPembelian || req.body.nilaiPembelian <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nilai pembelian harus diisi dan lebih dari 0'
      });
    }
    
    // Set nilai sekarang sama dengan nilai pembelian awal
    req.body.nilaiSekarang = req.body.nilaiPembelian;
    
    // Set persentase penyusutan default jika tidak diisi
    if (!req.body.persentasePenyusutan) {
      req.body.persentasePenyusutan = 10; // 10% per tahun sebagai default
    }
    
    // Set status aset default jika tidak diisi
    if (!req.body.statusAset) {
      req.body.statusAset = 'AKTIF';
    }
    
    // Set userId dari user yang login
    req.body.userId = req.user.id;
    
    // Buat aset baru
    const asset = await Asset.create(req.body);
    
    // Populate data untuk response
    const populatedAsset = await Asset.findById(asset._id)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    res.status(201).json({
      success: true,
      data: populatedAsset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat aset baru',
      error: error.message
    });
  }
};

// @desc      Update asset
// @route     PUT /api/assets/:id
// @access    Private
exports.updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tidak ditemukan'
      });
    }
    
    // Validasi cabang jika diubah
    if (req.body.cabangId) {
      const branch = await Branch.findById(req.body.cabangId);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Cabang tidak ditemukan'
        });
      }
    }
    
    // Validasi nilai pembelian jika diubah
    if (req.body.nilaiPembelian !== undefined && req.body.nilaiPembelian <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nilai pembelian harus lebih dari 0'
      });
    }
    
    // Jika nilai pembelian diubah, hitung ulang nilai sekarang
    if (req.body.nilaiPembelian !== undefined && req.body.nilaiPembelian !== asset.nilaiPembelian) {
      // Hitung penyusutan berdasarkan selisih waktu
      const today = new Date();
      const purchaseDate = new Date(asset.tanggalPembelian);
      const diffYears = (today - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
      
      const penyusutan = req.body.persentasePenyusutan || asset.persentasePenyusutan;
      const penyusutanValue = req.body.nilaiPembelian * (penyusutan / 100) * diffYears;
      
      // Nilai sekarang = nilai pembelian - total penyusutan
      req.body.nilaiSekarang = Math.max(0, req.body.nilaiPembelian - penyusutanValue);
    }
    
    // Update aset
    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedAsset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate aset',
      error: error.message
    });
  }
};

// @desc      Delete asset
// @route     DELETE /api/assets/:id
// @access    Private
exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tidak ditemukan'
      });
    }
    
    await asset.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Aset berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus aset',
      error: error.message
    });
  }
};

// @desc      Update asset status
// @route     PUT /api/assets/:id/status
// @access    Private
exports.updateAssetStatus = async (req, res) => {
  try {
    const { statusAset } = req.body;
    
    if (!statusAset) {
      return res.status(400).json({
        success: false,
        message: 'Status aset harus diisi'
      });
    }
    
    // Validasi status
    const validStatus = ['AKTIF', 'DIJUAL', 'RUSAK'];
    if (!validStatus.includes(statusAset)) {
      return res.status(400).json({
        success: false,
        message: 'Status aset tidak valid'
      });
    }
    
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Aset tidak ditemukan'
      });
    }
    
    // Update status aset
    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id,
      { statusAset },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedAsset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status aset',
      error: error.message
    });
  }
};

// @desc      Calculate depreciation
// @route     POST /api/assets/calculate-depreciation
// @access    Private
exports.calculateDepreciation = async (req, res) => {
  try {
    // Hanya direktur dan manajer keuangan yang bisa menghitung penyusutan
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk menghitung penyusutan aset'
      });
    }
    
    const { date, cabangId } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal harus diisi'
      });
    }
    
    const calculationDate = new Date(date);
    
    // Filter untuk aset aktif
    const filter = {
      statusAset: 'AKTIF',
      tanggalPembelian: { $lte: calculationDate }
    };
    
    // Filter berdasarkan cabang jika disediakan
    if (cabangId) {
      filter.cabangId = cabangId;
    }
    
    // Dapatkan semua aset aktif
    const assets = await Asset.find(filter);
    
    // Hitung penyusutan dan update nilai sekarang
    const updatedAssets = [];
    
    for (const asset of assets) {
      // Hitung penyusutan berdasarkan selisih waktu
      const purchaseDate = new Date(asset.tanggalPembelian);
      const diffYears = (calculationDate - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
      
      const penyusutanValue = asset.nilaiPembelian * (asset.persentasePenyusutan / 100) * diffYears;
      
      // Nilai sekarang = nilai pembelian - total penyusutan
      const nilaiSekarang = Math.max(0, asset.nilaiPembelian - penyusutanValue);
      
      // Update nilai sekarang aset
      const updatedAsset = await Asset.findByIdAndUpdate(
        asset._id,
        { nilaiSekarang },
        { new: true }
      );
      
      updatedAssets.push(updatedAsset);
    }
    
    res.status(200).json({
      success: true,
      message: `Penyusutan berhasil dihitung untuk ${updatedAssets.length} aset`,
      count: updatedAssets.length,
      date: calculationDate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghitung penyusutan aset',
      error: error.message
    });
  }
};

// @desc      Get assets by branch
// @route     GET /api/assets/by-branch/:branchId
// @access    Private
exports.getAssetsByBranch = async (req, res) => {
  try {
    // Validasi cabang
    const branch = await Branch.findById(req.params.branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
    
    const filter = { cabangId: req.params.branchId };
    
    // Filter tambahan
    if (req.query.tipeAset) {
      filter.tipeAset = req.query.tipeAset;
    }
    
    if (req.query.statusAset) {
      filter.statusAset = req.query.statusAset;
    }
    
    const assets = await Asset.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data aset',
      error: error.message
    });
  }
};

// @desc      Get assets by type
// @route     GET /api/assets/by-type/:type
// @access    Private
exports.getAssetsByType = async (req, res) => {
  try {
    // Filter berdasarkan cabang pengguna jika bukan direktur atau manajer keuangan
    const filter = { tipeAset: req.params.type };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Tambahkan filter status jika disediakan
    if (req.query.statusAset) {
      filter.statusAset = req.query.statusAset;
    }
    
    const assets = await Asset.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data aset',
      error: error.message
    });
  }
};

// @desc      Get assets by status
// @route     GET /api/assets/by-status/:status
// @access    Private
exports.getAssetsByStatus = async (req, res) => {
  try {
    // Validasi status
    const validStatus = ['AKTIF', 'DIJUAL', 'RUSAK'];
    if (!validStatus.includes(req.params.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status aset tidak valid'
      });
    }
    
    // Filter berdasarkan cabang pengguna jika bukan direktur atau manajer keuangan
    const filter = { statusAset: req.params.status };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    const assets = await Asset.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data aset',
      error: error.message
    });
  }
};