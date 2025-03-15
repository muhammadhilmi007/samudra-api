const BankStatement = require('../models/BankStatement');
const Branch = require('../models/Branch');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');

// @desc      Get all bank statements
// @route     GET /api/bank-statements
// @access    Private
exports.getBankStatements = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      // Jika bukan direktur atau manajer keuangan, hanya tampilkan data di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.bank) {
      filter.bank = { $regex: req.query.bank, $options: 'i' };
    }
    
    if (req.query.noRekening) {
      filter.noRekening = { $regex: req.query.noRekening, $options: 'i' };
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
    const total = await BankStatement.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const bankStatements = await BankStatement.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .skip(startIndex)
      .limit(limit)
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: bankStatements.length,
      pagination: pagination.pagination,
      total,
      data: bankStatements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data mutasi rekening',
      error: error.message
    });
  }
};

// @desc      Get single bank statement
// @route     GET /api/bank-statements/:id
// @access    Private
exports.getBankStatement = async (req, res) => {
  try {
    const bankStatement = await BankStatement.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    if (!bankStatement) {
      return res.status(404).json({
        success: false,
        message: 'Mutasi rekening tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: bankStatement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data mutasi rekening',
      error: error.message
    });
  }
};

// @desc      Create new bank statement
// @route     POST /api/bank-statements
// @access    Private
exports.createBankStatement = async (req, res) => {
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
    
    // Validasi data bank
    if (!req.body.bank) {
      return res.status(400).json({
        success: false,
        message: 'Nama bank harus diisi'
      });
    }
    
    if (!req.body.noRekening) {
      return res.status(400).json({
        success: false,
        message: 'Nomor rekening harus diisi'
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
      req.body.status = 'UNVALIDATED';
    }
    
    // Cari mutasi terakhir untuk menghitung saldo
    const lastStatement = await BankStatement.findOne({
      bank: req.body.bank,
      noRekening: req.body.noRekening,
      cabangId: req.body.cabangId
    }).sort('-tanggal');
    
    // Hitung saldo baru
    let saldo = 0;
    if (lastStatement) {
      saldo = lastStatement.saldo;
    }
    
    // Update saldo berdasarkan debet dan kredit
    saldo += (req.body.debet || 0);
    saldo -= (req.body.kredit || 0);
    
    // Set saldo ke body
    req.body.saldo = saldo;
    
    // Buat mutasi rekening baru
    const bankStatement = await BankStatement.create(req.body);
    
    // Populate data untuk response
    const populatedBankStatement = await BankStatement.findById(bankStatement._id)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    res.status(201).json({
      success: true,
      data: populatedBankStatement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat mutasi rekening baru',
      error: error.message
    });
  }
};

// @desc      Update bank statement
// @route     PUT /api/bank-statements/:id
// @access    Private
exports.updateBankStatement = async (req, res) => {
  try {
    const bankStatement = await BankStatement.findById(req.params.id);
    
    if (!bankStatement) {
      return res.status(404).json({
        success: false,
        message: 'Mutasi rekening tidak ditemukan'
      });
    }
    
    // Cek status mutasi, jika sudah VALIDATED maka tidak bisa diubah
    if (bankStatement.status === 'VALIDATED') {
      return res.status(400).json({
        success: false,
        message: 'Mutasi rekening yang sudah divalidasi tidak dapat diubah'
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
    if (req.body.debet !== undefined && req.body.debet !== bankStatement.debet) {
      return res.status(400).json({
        success: false,
        message: 'Perubahan nilai debet tidak diizinkan, silakan buat transaksi baru'
      });
    }
    
    if (req.body.kredit !== undefined && req.body.kredit !== bankStatement.kredit) {
      return res.status(400).json({
        success: false,
        message: 'Perubahan nilai kredit tidak diizinkan, silakan buat transaksi baru'
      });
    }
    
    // Update mutasi rekening
    const updatedBankStatement = await BankStatement.findByIdAndUpdate(
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
      data: updatedBankStatement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate mutasi rekening',
      error: error.message
    });
  }
};

// @desc      Validate bank statement
// @route     PUT /api/bank-statements/:id/validate
// @access    Private
exports.validateBankStatement = async (req, res) => {
  try {
    // Hanya kasir, admin, dan peran yang lebih tinggi yang bisa melakukan validasi
    const validRoles = ['direktur', 'manajer_keuangan', 'manajer_admin', 'kepala_cabang', 'kasir', 'staff_admin'];
    if (!validRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk memvalidasi mutasi rekening'
      });
    }
    
    const bankStatement = await BankStatement.findById(req.params.id);
    
    if (!bankStatement) {
      return res.status(404).json({
        success: false,
        message: 'Mutasi rekening tidak ditemukan'
      });
    }
    
    // Cek apakah mutasi rekening sudah divalidasi
    if (bankStatement.status === 'VALIDATED') {
      return res.status(400).json({
        success: false,
        message: 'Mutasi rekening sudah divalidasi'
      });
    }
    
    // Update status mutasi rekening
    const updatedBankStatement = await BankStatement.findByIdAndUpdate(
      req.params.id,
      { status: 'VALIDATED' },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedBankStatement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal memvalidasi mutasi rekening',
      error: error.message
    });
  }
};

// @desc      Get bank statements by branch
// @route     GET /api/bank-statements/by-branch/:branchId
// @access    Private
exports.getBankStatementsByBranch = async (req, res) => {
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
    if (req.query.bank) {
      filter.bank = { $regex: req.query.bank, $options: 'i' };
    }
    
    if (req.query.noRekening) {
      filter.noRekening = { $regex: req.query.noRekening, $options: 'i' };
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.tanggal = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    const bankStatements = await BankStatement.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: bankStatements.length,
      data: bankStatements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data mutasi rekening',
      error: error.message
    });
  }
};

// @desc      Get bank statements by date range
// @route     GET /api/bank-statements/by-date-range
// @access    Private
exports.getBankStatementsByDateRange = async (req, res) => {
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
    
    // Tambahkan filter bank dan noRekening jika disediakan
    if (req.query.bank) {
      filter.bank = { $regex: req.query.bank, $options: 'i' };
    }
    
    if (req.query.noRekening) {
      filter.noRekening = { $regex: req.query.noRekening, $options: 'i' };
    }
    
    // Tambahkan filter status jika disediakan
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const bankStatements = await BankStatement.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('tanggal');
    
    res.status(200).json({
      success: true,
      count: bankStatements.length,
      data: bankStatements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data mutasi rekening',
      error: error.message
    });
  }
};

// @desc      Get bank summary by account
// @route     GET /api/bank-statements/summary
// @access    Private
exports.getBankSummary = async (req, res) => {
  try {
    // Filter berdasarkan cabang pengguna jika bukan direktur atau manajer keuangan
    const filter = {};
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Dapatkan semua rekening bank yang unik
    const uniqueBankAccounts = await BankStatement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { bank: "$bank", noRekening: "$noRekening", cabangId: "$cabangId" },
          latestDate: { $max: "$tanggal" }
        }
      }
    ]);
    
    // Dapatkan saldo terakhir untuk setiap rekening
    const summary = [];
    
    for (const account of uniqueBankAccounts) {
      const latestTransaction = await BankStatement.findOne({
        bank: account._id.bank,
        noRekening: account._id.noRekening,
        cabangId: account._id.cabangId,
        tanggal: account.latestDate
      })
        .populate('cabangId', 'namaCabang')
        .sort('-tanggal');
      
      if (latestTransaction) {
        summary.push({
          bank: latestTransaction.bank,
          noRekening: latestTransaction.noRekening,
          cabang: latestTransaction.cabangId ? latestTransaction.cabangId.namaCabang : 'Pusat',
          saldo: latestTransaction.saldo,
          tanggalUpdate: latestTransaction.tanggal
        });
      }
    }
    
    res.status(200).json({
      success: true,
      count: summary.length,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan ringkasan rekening bank',
      error: error.message
    });
  }
};