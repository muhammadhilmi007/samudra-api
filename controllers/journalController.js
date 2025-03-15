const Journal = require('../models/Journal');
const Account = require('../models/Account');
const Branch = require('../models/Branch');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');

// @desc      Get all journals
// @route     GET /api/journals
// @access    Private
exports.getJournals = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      // Jika bukan direktur atau manajer keuangan, hanya tampilkan jurnal di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.accountId) {
      filter.accountId = req.query.accountId;
    }
    
    if (req.query.tipe) {
      filter.tipe = req.query.tipe;
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
    const total = await Journal.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const journals = await Journal.find(filter)
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .populate('sttIds', 'noSTT namaBarang')
      .skip(startIndex)
      .limit(limit)
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: journals.length,
      pagination: pagination.pagination,
      total,
      data: journals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data jurnal',
      error: error.message
    });
  }
};

// @desc      Get single journal
// @route     GET /api/journals/:id
// @access    Private
exports.getJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id)
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .populate('sttIds', 'noSTT namaBarang');
    
    if (!journal) {
      return res.status(404).json({
        success: false,
        message: 'Jurnal tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: journal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data jurnal',
      error: error.message
    });
  }
};

// @desc      Create new journal
// @route     POST /api/journals
// @access    Private
exports.createJournal = async (req, res) => {
  try {
    // Validasi account
    const account = await Account.findById(req.body.accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan'
      });
    }
    
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
    
    // Validasi debet dan kredit
    if (req.body.debet <= 0 && req.body.kredit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Debet atau kredit harus lebih dari 0'
      });
    }
    
    if (req.body.debet > 0 && req.body.kredit > 0) {
      return res.status(400).json({
        success: false,
        message: 'Debet dan kredit tidak boleh diisi keduanya'
      });
    }
    
    // Set userId dari user yang login
    req.body.userId = req.user.id;
    
    // Set tanggal jika tidak diisi
    if (!req.body.tanggal) {
      req.body.tanggal = new Date();
    }
    
    // Set status default
    if (!req.body.status) {
      req.body.status = 'DRAFT';
    }
    
    // Set tipe default jika tidak diisi
    if (!req.body.tipe) {
      req.body.tipe = 'Lokal';
    }
    
    // Buat jurnal baru
    const journal = await Journal.create(req.body);
    
    // Populate data untuk response
    const populatedJournal = await Journal.findById(journal._id)
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .populate('sttIds', 'noSTT namaBarang');
    
    res.status(201).json({
      success: true,
      data: populatedJournal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat jurnal baru',
      error: error.message
    });
  }
};

// @desc      Update journal
// @route     PUT /api/journals/:id
// @access    Private
exports.updateJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    
    if (!journal) {
      return res.status(404).json({
        success: false,
        message: 'Jurnal tidak ditemukan'
      });
    }
    
    // Cek status jurnal, jika sudah FINAL maka tidak bisa diubah
    if (journal.status === 'FINAL') {
      return res.status(400).json({
        success: false,
        message: 'Jurnal dengan status FINAL tidak dapat diubah'
      });
    }
    
    // Validasi account jika diubah
    if (req.body.accountId) {
      const account = await Account.findById(req.body.accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Akun tidak ditemukan'
        });
      }
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
    if (req.body.debet !== undefined && req.body.kredit !== undefined) {
      if (req.body.debet <= 0 && req.body.kredit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Debet atau kredit harus lebih dari 0'
        });
      }
      
      if (req.body.debet > 0 && req.body.kredit > 0) {
        return res.status(400).json({
          success: false,
          message: 'Debet dan kredit tidak boleh diisi keduanya'
        });
      }
    }
    
    // Update jurnal
    const updatedJournal = await Journal.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .populate('sttIds', 'noSTT namaBarang');
    
    res.status(200).json({
      success: true,
      data: updatedJournal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate jurnal',
      error: error.message
    });
  }
};

// @desc      Delete journal
// @route     DELETE /api/journals/:id
// @access    Private
exports.deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findById(req.params.id);
    
    if (!journal) {
      return res.status(404).json({
        success: false,
        message: 'Jurnal tidak ditemukan'
      });
    }
    
    // Cek status jurnal, jika sudah FINAL maka tidak bisa dihapus
    if (journal.status === 'FINAL') {
      return res.status(400).json({
        success: false,
        message: 'Jurnal dengan status FINAL tidak dapat dihapus'
      });
    }
    
    await journal.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Jurnal berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus jurnal',
      error: error.message
    });
  }
};

// @desc      Update journal status
// @route     PUT /api/journals/:id/status
// @access    Private
exports.updateJournalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    if (!['DRAFT', 'FINAL'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const journal = await Journal.findById(req.params.id);
    
    if (!journal) {
      return res.status(404).json({
        success: false,
        message: 'Jurnal tidak ditemukan'
      });
    }
    
    // Jika status sudah FINAL, tidak bisa diubah kembali ke DRAFT
    if (journal.status === 'FINAL' && status === 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Jurnal dengan status FINAL tidak dapat diubah ke DRAFT'
      });
    }
    
    // Update status jurnal
    const updatedJournal = await Journal.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .populate('sttIds', 'noSTT namaBarang');
    
    res.status(200).json({
      success: true,
      data: updatedJournal
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status jurnal',
      error: error.message
    });
  }
};

// @desc      Get journals by date range
// @route     GET /api/journals/by-date-range
// @access    Private
exports.getJournalsByDateRange = async (req, res) => {
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
    
    const journals = await Journal.find(filter)
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .populate('sttIds', 'noSTT namaBarang')
      .sort('tanggal');
    
    res.status(200).json({
      success: true,
      count: journals.length,
      data: journals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data jurnal',
      error: error.message
    });
  }
};

// @desc      Get journals by branch
// @route     GET /api/journals/by-branch/:branchId
// @access    Private
exports.getJournalsByBranch = async (req, res) => {
  try {
    // Validasi cabang
    const branch = await Branch.findById(req.params.branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
    
    const journals = await Journal.find({
      cabangId: req.params.branchId
    })
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .populate('sttIds', 'noSTT namaBarang')
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: journals.length,
      data: journals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data jurnal',
      error: error.message
    });
  }
};

// @desc      Get journals by type
// @route     GET /api/journals/by-type/:type
// @access    Private
exports.getJournalsByType = async (req, res) => {
  try {
    // Validasi tipe
    if (!['Lokal', 'Pusat'].includes(req.params.type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe tidak valid'
      });
    }
    
    // Filter berdasarkan cabang pengguna jika bukan direktur atau manajer keuangan
    const filter = { tipe: req.params.type };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    const journals = await Journal.find(filter)
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .populate('sttIds', 'noSTT namaBarang')
      .sort('-tanggal');
    
    res.status(200).json({
      success: true,
      count: journals.length,
      data: journals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data jurnal',
      error: error.message
    });
  }
};