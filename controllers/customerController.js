const Customer = require('../models/Customer');
const { paginationResult } = require('../utils/helpers');

// @desc      Get all customers
// @route     GET /api/customers
// @access    Private
exports.getCustomers = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.tipe) {
      filter.tipe = req.query.tipe;
    }
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Filter pencarian berdasarkan nama atau telepon
    if (req.query.search) {
      filter.$or = [
        { nama: { $regex: req.query.search, $options: 'i' } },
        { telepon: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Customer.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const customers = await Customer.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: pagination.pagination,
      total,
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data pelanggan',
      error: error.message
    });
  }
};

// @desc      Get single customer
// @route     GET /api/customers/:id
// @access    Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data pelanggan',
      error: error.message
    });
  }
};

// @desc      Create new customer
// @route     POST /api/customers
// @access    Private
exports.createCustomer = async (req, res) => {
  try {
    // Set cabangId dan createdBy dari user yang login
    req.body.cabangId = req.user.cabangId;
    req.body.createdBy = req.user.id;
    
    // Buat customer baru
    const customer = await Customer.create(req.body);
    
    // Populate data untuk response
    const populatedCustomer = await Customer.findById(customer._id)
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    res.status(201).json({
      success: true,
      data: populatedCustomer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat pelanggan baru',
      error: error.message
    });
  }
};

// @desc      Update customer
// @route     PUT /api/customers/:id
// @access    Private
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate pelanggan',
      error: error.message
    });
  }
};

// @desc      Delete customer
// @route     DELETE /api/customers/:id
// @access    Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan'
      });
    }
    
    // Cek apakah customer memiliki data terkait
    // Contoh: cek apakah ada STT dengan customer sebagai pengirim atau penerima
    const STT = require('../models/STT');
    const hasSTTs = await STT.findOne({
      $or: [
        { pengirimId: req.params.id },
        { penerimaId: req.params.id }
      ]
    });
    
    if (hasSTTs) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus pelanggan yang memiliki data pengiriman'
      });
    }
    
    await customer.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Pelanggan berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus pelanggan',
      error: error.message
    });
  }
};

// @desc      Get senders (pelanggan with tipe pengirim atau keduanya)
// @route     GET /api/customers/senders
// @access    Private
exports.getSenders = async (req, res) => {
  try {
    // Filter untuk tipe pengirim atau keduanya
    const filter = {
      tipe: { $in: ['pengirim', 'keduanya'] }
    };
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    if (req.query.search) {
      filter.$or = [
        { nama: { $regex: req.query.search, $options: 'i' } },
        { telepon: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const senders = await Customer.find(filter)
      .select('nama alamat telepon kota')
      .sort('nama');
    
    res.status(200).json({
      success: true,
      count: senders.length,
      data: senders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data pengirim',
      error: error.message
    });
  }
};

// @desc      Get recipients (pelanggan with tipe penerima atau keduanya)
// @route     GET /api/customers/recipients
// @access    Private
exports.getRecipients = async (req, res) => {
  try {
    // Filter untuk tipe penerima atau keduanya
    const filter = {
      tipe: { $in: ['penerima', 'keduanya'] }
    };
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    if (req.query.search) {
      filter.$or = [
        { nama: { $regex: req.query.search, $options: 'i' } },
        { telepon: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const recipients = await Customer.find(filter)
      .select('nama alamat telepon kota')
      .sort('nama');
    
    res.status(200).json({
      success: true,
      count: recipients.length,
      data: recipients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data penerima',
      error: error.message
    });
  }
};

// @desc      Get customers by branch
// @route     GET /api/customers/by-branch/:branchId
// @access    Private
exports.getCustomersByBranch = async (req, res) => {
  try {
    const customers = await Customer.find({ cabangId: req.params.branchId })
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data pelanggan',
      error: error.message
    });
  }
};