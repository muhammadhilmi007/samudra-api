const Account = require('../models/Account');
const Journal = require('../models/Journal');
const { paginationResult } = require('../utils/helpers');

// @desc      Get all accounts
// @route     GET /api/accounts
// @access    Private
exports.getAccounts = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.tipeAccount) {
      filter.tipeAccount = req.query.tipeAccount;
    }
    
    if (req.query.search) {
      filter.$or = [
        { kodeAccount: { $regex: req.query.search, $options: 'i' } },
        { namaAccount: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Account.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const accounts = await Account.find(filter)
      .skip(startIndex)
      .limit(limit)
      .sort('kodeAccount');
    
    res.status(200).json({
      success: true,
      count: accounts.length,
      pagination: pagination.pagination,
      total,
      data: accounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data akun',
      error: error.message
    });
  }
};

// @desc      Get single account
// @route     GET /api/accounts/:id
// @access    Private
exports.getAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data akun',
      error: error.message
    });
  }
};

// @desc      Create new account
// @route     POST /api/accounts
// @access    Private
exports.createAccount = async (req, res) => {
  try {
    // Validasi kode account, pastikan belum digunakan
    const existingAccount = await Account.findOne({
      kodeAccount: req.body.kodeAccount
    });
    
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'Kode akun sudah digunakan'
      });
    }
    
    // Validasi nama account, pastikan belum digunakan
    const existingNameAccount = await Account.findOne({
      namaAccount: req.body.namaAccount
    });
    
    if (existingNameAccount) {
      return res.status(400).json({
        success: false,
        message: 'Nama akun sudah digunakan'
      });
    }
    
    // Validasi tipe account
    const validTypes = ['Pendapatan', 'Biaya', 'Aset', 'Kewajiban', 'Ekuitas'];
    if (!validTypes.includes(req.body.tipeAccount)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe akun tidak valid'
      });
    }
    
    // Buat account baru
    const account = await Account.create(req.body);
    
    res.status(201).json({
      success: true,
      data: account
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat akun baru',
      error: error.message
    });
  }
};

// @desc      Update account
// @route     PUT /api/accounts/:id
// @access    Private
exports.updateAccount = async (req, res) => {
  try {
    // Validasi kode account jika diubah
    if (req.body.kodeAccount) {
      const existingAccount = await Account.findOne({
        kodeAccount: req.body.kodeAccount,
        _id: { $ne: req.params.id }
      });
      
      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: 'Kode akun sudah digunakan'
        });
      }
    }
    
    // Validasi nama account jika diubah
    if (req.body.namaAccount) {
      const existingNameAccount = await Account.findOne({
        namaAccount: req.body.namaAccount,
        _id: { $ne: req.params.id }
      });
      
      if (existingNameAccount) {
        return res.status(400).json({
          success: false,
          message: 'Nama akun sudah digunakan'
        });
      }
    }
    
    // Validasi tipe account jika diubah
    if (req.body.tipeAccount) {
      const validTypes = ['Pendapatan', 'Biaya', 'Aset', 'Kewajiban', 'Ekuitas'];
      if (!validTypes.includes(req.body.tipeAccount)) {
        return res.status(400).json({
          success: false,
          message: 'Tipe akun tidak valid'
        });
      }
    }
    
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate akun',
      error: error.message
    });
  }
};

// @desc      Delete account
// @route     DELETE /api/accounts/:id
// @access    Private
exports.deleteAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan'
      });
    }
    
    // Cek apakah akun sudah digunakan di jurnal
    const hasJournals = await Journal.findOne({ accountId: req.params.id });
    
    if (hasJournals) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun yang sudah digunakan di jurnal'
      });
    }
    
    await account.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Akun berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus akun',
      error: error.message
    });
  }
};

// @desc      Get accounts by type
// @route     GET /api/accounts/by-type/:type
// @access    Private
exports.getAccountsByType = async (req, res) => {
  try {
    // Validasi tipe account
    const validTypes = ['Pendapatan', 'Biaya', 'Aset', 'Kewajiban', 'Ekuitas'];
    if (!validTypes.includes(req.params.type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe akun tidak valid'
      });
    }
    
    const accounts = await Account.find({
      tipeAccount: req.params.type
    }).sort('kodeAccount');
    
    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data akun',
      error: error.message
    });
  }
};