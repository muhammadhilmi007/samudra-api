const CashBranch = require('../models/BranchCash');
const CashHeadquarter = require('../models/HeadquarterCash');
const Branch = require('../models/Branch');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');

// ===================== BRANCH CASH FUNCTIONS =====================

// @desc      Get all branch cash transactions
// @route     GET /api/cash/branch
// @access    Private
exports.getBranchCashTransactions = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      // Jika bukan direktur atau manajer keuangan, hanya tampilkan transaksi di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.tipeKas) {
      filter.tipeKas = req.query.tipeKas;
    }
    
    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.tanggal = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.tanggal = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.tanggal = { $lte: new Date(req.query.endDate) };
    }
    
    // Filter berdasarkan search (keterangan)
    if (req.query.search) {
      filter.keterangan = { $regex: req.query.search, $options: 'i' };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await CashBranch.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const cashTransactions = await CashBranch.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .skip(startIndex)
      .limit(limit)
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: cashTransactions.length,
      pagination: pagination.pagination,
      total,
      data: cashTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kas cabang',
      error: error.message
    });
  }
};

// @desc      Get single branch cash transaction
// @route     GET /api/cash/branch/:id
// @access    Private
exports.getBranchCashTransaction = async (req, res) => {
  try {
    const cashTransaction = await CashBranch.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    if (!cashTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi kas cabang tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: cashTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data transaksi kas cabang',
      error: error.message
    });
  }
};

// @desc      Create new branch cash transaction
// @route     POST /api/cash/branch
// @access    Private
exports.createBranchCashTransaction = async (req, res) => {
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
    
    // Validasi tipe kas
    const validTypes = ['Awal', 'Akhir', 'Kecil', 'Rekening', 'Tangan'];
    if (!validTypes.includes(req.body.tipeKas)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe kas tidak valid'
      });
    }
    
    // Validasi debet dan kredit
    if (req.body.debet < 0 || req.body.kredit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Debet dan kredit tidak boleh negatif'
      });
    }
    
    // Set userId dari user yang login
    req.body.userId = req.user.id;
    
    // Set tanggal jika tidak diisi
    if (!req.body.tanggal) {
      req.body.tanggal = new Date();
    }
    
    // Cari transaksi terakhir untuk menghitung saldo
    const lastTransaction = await CashBranch.findOne({
      cabangId: req.body.cabangId,
      tipeKas: req.body.tipeKas
    }).sort('-tanggal');
    
    // Hitung saldo baru
    let saldo = 0;
    if (lastTransaction) {
      saldo = lastTransaction.saldo;
    }
    
    // Update saldo berdasarkan debet dan kredit
    saldo += (req.body.debet || 0);
    saldo -= (req.body.kredit || 0);
    
    // Set saldo ke body
    req.body.saldo = saldo;
    
    // Buat transaksi kas baru
    const cashTransaction = await CashBranch.create(req.body);
    
    // Populate data untuk response
    const populatedCashTransaction = await CashBranch.findById(cashTransaction._id)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    res.status(201).json({
      success: true,
      data: populatedCashTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat transaksi kas cabang baru',
      error: error.message
    });
  }
};

// @desc      Update branch cash transaction
// @route     PUT /api/cash/branch/:id
// @access    Private
exports.updateBranchCashTransaction = async (req, res) => {
  try {
    const cashTransaction = await CashBranch.findById(req.params.id);
    
    if (!cashTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi kas cabang tidak ditemukan'
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
    
    // Validasi tipe kas jika diubah
    if (req.body.tipeKas) {
      const validTypes = ['Awal', 'Akhir', 'Kecil', 'Rekening', 'Tangan'];
      if (!validTypes.includes(req.body.tipeKas)) {
        return res.status(400).json({
          success: false,
          message: 'Tipe kas tidak valid'
        });
      }
    }
    
    // Validasi debet dan kredit jika diubah
    if ((req.body.debet !== undefined && req.body.debet < 0) || 
        (req.body.kredit !== undefined && req.body.kredit < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Debet dan kredit tidak boleh negatif'
      });
    }
    
    // CATATAN: Perubahan debet/kredit akan mempengaruhi saldo seluruh transaksi setelahnya
    // Untuk menyederhanakan, kita tidak mengizinkan perubahan pada debet/kredit
    if (req.body.debet !== undefined && req.body.debet !== cashTransaction.debet) {
      return res.status(400).json({
        success: false,
        message: 'Perubahan nilai debet tidak diizinkan, silakan buat transaksi baru'
      });
    }
    
    if (req.body.kredit !== undefined && req.body.kredit !== cashTransaction.kredit) {
      return res.status(400).json({
        success: false,
        message: 'Perubahan nilai kredit tidak diizinkan, silakan buat transaksi baru'
      });
    }
    
    // Update transaksi kas
    const updatedCashTransaction = await CashBranch.findByIdAndUpdate(
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
      data: updatedCashTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate transaksi kas cabang',
      error: error.message
    });
  }
};

// @desc      Get branch cash transactions by branch
// @route     GET /api/cash/branch/by-branch/:branchId
// @access    Private
exports.getBranchCashTransactionsByBranch = async (req, res) => {
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
    if (req.query.tipeKas) {
      filter.tipeKas = req.query.tipeKas;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.tanggal = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    const cashTransactions = await CashBranch.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: cashTransactions.length,
      data: cashTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kas cabang',
      error: error.message
    });
  }
};

// @desc      Get branch cash transactions by type
// @route     GET /api/cash/branch/by-type/:type
// @access    Private
exports.getBranchCashTransactionsByType = async (req, res) => {
  try {
    // Validasi tipe kas
    const validTypes = ['Awal', 'Akhir', 'Kecil', 'Rekening', 'Tangan'];
    if (!validTypes.includes(req.params.type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe kas tidak valid'
      });
    }
    
    // Filter berdasarkan cabang pengguna jika bukan direktur atau manajer keuangan
    const filter = { tipeKas: req.params.type };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    const cashTransactions = await CashBranch.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: cashTransactions.length,
      data: cashTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kas cabang',
      error: error.message
    });
  }
};

// @desc      Get branch cash transactions by date range
// @route     GET /api/cash/branch/by-date-range
// @access    Private
exports.getBranchCashTransactionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal awal dan akhir harus diisi'
      });
    }
    
    // Filter berdasarkan cabang pengguna jika bukan direktur atau manajer keuangan
    const filter = {
      tanggal: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Tambahkan filter tipe kas jika disediakan
    if (req.query.tipeKas) {
      filter.tipeKas = req.query.tipeKas;
    }
    
    const cashTransactions = await CashBranch.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('tanggal');
    
    res.status(200).json({
      success: true,
      count: cashTransactions.length,
      data: cashTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kas cabang',
      error: error.message
    });
  }
};

// ===================== HEADQUARTERS CASH FUNCTIONS =====================

// @desc      Get all headquarters cash transactions
// @route     GET /api/cash/headquarters
// @access    Private
exports.getHeadquartersCashTransactions = async (req, res) => {
  try {
    // Hanya direktur, manajer keuangan, dan admin pusat yang bisa akses
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan' && req.user.role !== 'admin_pusat') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke data kas pusat'
      });
    }
    
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.tipeKas) {
      filter.tipeKas = req.query.tipeKas;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.tanggal = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.tanggal = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.tanggal = { $lte: new Date(req.query.endDate) };
    }
    
    // Filter berdasarkan search (keterangan)
    if (req.query.search) {
      filter.keterangan = { $regex: req.query.search, $options: 'i' };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await CashHeadquarter.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const cashTransactions = await CashHeadquarter.find(filter)
      .populate('userId', 'nama')
      .skip(startIndex)
      .limit(limit)
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: cashTransactions.length,
      pagination: pagination.pagination,
      total,
      data: cashTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kas pusat',
      error: error.message
    });
  }
};

// @desc      Get single headquarters cash transaction
// @route     GET /api/cash/headquarters/:id
// @access    Private
exports.getHeadquartersCashTransaction = async (req, res) => {
  try {
    // Hanya direktur, manajer keuangan, dan admin pusat yang bisa akses
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan' && req.user.role !== 'admin_pusat') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke data kas pusat'
      });
    }
    
    const cashTransaction = await CashHeadquarter.findById(req.params.id)
      .populate('userId', 'nama');
    
    if (!cashTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi kas pusat tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: cashTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data transaksi kas pusat',
      error: error.message
    });
  }
};

// @desc      Create new headquarters cash transaction
// @route     POST /api/cash/headquarters
// @access    Private
exports.createHeadquartersCashTransaction = async (req, res) => {
  try {
    // Hanya direktur, manajer keuangan, dan admin pusat yang bisa membuat
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan' && req.user.role !== 'admin_pusat') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk membuat transaksi kas pusat'
      });
    }
    
    // Validasi tipe kas
    const validTypes = ['Awal', 'Akhir', 'Kecil', 'Rekening', 'Tangan', 'Bantuan'];
    if (!validTypes.includes(req.body.tipeKas)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe kas tidak valid'
      });
    }
    
    // Validasi debet dan kredit
    if (req.body.debet < 0 || req.body.kredit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Debet dan kredit tidak boleh negatif'
      });
    }
    
    // Set userId dari user yang login
    req.body.userId = req.user.id;
    
    // Set tanggal jika tidak diisi
    if (!req.body.tanggal) {
      req.body.tanggal = new Date();
    }
    
    // Set status default jika tidak diisi
    if (!req.body.status) {
      req.body.status = 'DRAFT';
    }
    
    // Cari transaksi terakhir untuk menghitung saldo
    const lastTransaction = await CashHeadquarter.findOne({
      tipeKas: req.body.tipeKas
    }).sort('-tanggal');
    
    // Hitung saldo baru
    let saldo = 0;
    if (lastTransaction) {
      saldo = lastTransaction.saldo;
    }
    
    // Update saldo berdasarkan debet dan kredit
    saldo += (req.body.debet || 0);
    saldo -= (req.body.kredit || 0);
    
    // Set saldo ke body
    req.body.saldo = saldo;
    
    // Buat transaksi kas baru
    const cashTransaction = await CashHeadquarter.create(req.body);
    
    // Populate data untuk response
    const populatedCashTransaction = await CashHeadquarter.findById(cashTransaction._id)
      .populate('userId', 'nama');
    
    res.status(201).json({
      success: true,
      data: populatedCashTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat transaksi kas pusat baru',
      error: error.message
    });
  }
};

// @desc      Update headquarters cash transaction
// @route     PUT /api/cash/headquarters/:id
// @access    Private
exports.updateHeadquartersCashTransaction = async (req, res) => {
  try {
    // Hanya direktur, manajer keuangan, dan admin pusat yang bisa mengupdate
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan' && req.user.role !== 'admin_pusat') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk mengupdate transaksi kas pusat'
      });
    }
    
    const cashTransaction = await CashHeadquarter.findById(req.params.id);
    
    if (!cashTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi kas pusat tidak ditemukan'
      });
    }
    
    // Jika status sudah MERGED, tidak bisa diupdate
    if (cashTransaction.status === 'MERGED') {
      return res.status(400).json({
        success: false,
        message: 'Transaksi kas pusat dengan status MERGED tidak dapat diupdate'
      });
    }
    
    // Validasi tipe kas jika diubah
    if (req.body.tipeKas) {
      const validTypes = ['Awal', 'Akhir', 'Kecil', 'Rekening', 'Tangan', 'Bantuan'];
      if (!validTypes.includes(req.body.tipeKas)) {
        return res.status(400).json({
          success: false,
          message: 'Tipe kas tidak valid'
        });
      }
    }
    
    // Validasi debet dan kredit jika diubah
    if ((req.body.debet !== undefined && req.body.debet < 0) || 
        (req.body.kredit !== undefined && req.body.kredit < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Debet dan kredit tidak boleh negatif'
      });
    }
    
    // CATATAN: Perubahan debet/kredit akan mempengaruhi saldo seluruh transaksi setelahnya
    // Untuk menyederhanakan, kita tidak mengizinkan perubahan pada debet/kredit
    if (req.body.debet !== undefined && req.body.debet !== cashTransaction.debet) {
      return res.status(400).json({
        success: false,
        message: 'Perubahan nilai debet tidak diizinkan, silakan buat transaksi baru'
      });
    }
    
    if (req.body.kredit !== undefined && req.body.kredit !== cashTransaction.kredit) {
      return res.status(400).json({
        success: false,
        message: 'Perubahan nilai kredit tidak diizinkan, silakan buat transaksi baru'
      });
    }
    
    // Update transaksi kas
    const updatedCashTransaction = await CashHeadquarter.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('userId', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedCashTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate transaksi kas pusat',
      error: error.message
    });
  }
};

// @desc      Update headquarters cash transaction status
// @route     PUT /api/cash/headquarters/:id/status
// @access    Private
exports.updateHeadquartersCashTransactionStatus = async (req, res) => {
  try {
    // Hanya direktur dan manajer keuangan yang bisa mengupdate status
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk mengupdate status transaksi kas pusat'
      });
    }
    
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    if (!['DRAFT', 'MERGED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const cashTransaction = await CashHeadquarter.findById(req.params.id);
    
    if (!cashTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaksi kas pusat tidak ditemukan'
      });
    }
    
    // Jika status sudah MERGED, tidak bisa diubah kembali ke DRAFT
    if (cashTransaction.status === 'MERGED' && status === 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Transaksi kas pusat dengan status MERGED tidak dapat diubah ke DRAFT'
      });
    }
    
    // Update status transaksi kas
    const updatedCashTransaction = await CashHeadquarter.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('userId', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedCashTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status transaksi kas pusat',
      error: error.message
    });
  }
};

// @desc      Get headquarters cash transactions by type
// @route     GET /api/cash/headquarters/by-type/:type
// @access    Private
exports.getHeadquartersCashTransactionsByType = async (req, res) => {
  try {
    // Hanya direktur, manajer keuangan, dan admin pusat yang bisa akses
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan' && req.user.role !== 'admin_pusat') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke data kas pusat'
      });
    }
    
    // Validasi tipe kas
    const validTypes = ['Awal', 'Akhir', 'Kecil', 'Rekening', 'Tangan', 'Bantuan'];
    if (!validTypes.includes(req.params.type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe kas tidak valid'
      });
    }
    
    const filter = { tipeKas: req.params.type };
    
    // Filter tambahan
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.tanggal = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    const cashTransactions = await CashHeadquarter.find(filter)
      .populate('userId', 'nama')
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: cashTransactions.length,
      data: cashTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kas pusat',
      error: error.message
    });
  }
};

// @desc      Get headquarters cash transactions by date range
// @route     GET /api/cash/headquarters/by-date-range
// @access    Private
exports.getHeadquartersCashTransactionsByDateRange = async (req, res) => {
  try {
    // Hanya direktur, manajer keuangan, dan admin pusat yang bisa akses
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan' && req.user.role !== 'admin_pusat') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke data kas pusat'
      });
    }
    
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal awal dan akhir harus diisi'
      });
    }
    
    const filter = {
      tanggal: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    // Tambahkan filter tipe kas jika disediakan
    if (req.query.tipeKas) {
      filter.tipeKas = req.query.tipeKas;
    }
    
    // Tambahkan filter status jika disediakan
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const cashTransactions = await CashHeadquarter.find(filter)
      .populate('userId', 'nama')
      .sort('tanggal');
    
    res.status(200).json({
      success: true,
      count: cashTransactions.length,
      data: cashTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kas pusat',
      error: error.message
    });
  }
};