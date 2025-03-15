const PickupRequest = require('../models/PickupRequest');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');

// @desc      Get all pickup requests
// @route     GET /api/pickup-requests
// @access    Private
exports.getPickupRequests = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      // Jika bukan direktur atau manajer operasional, hanya tampilkan pickup request di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.pengirimId) {
      filter.pengirimId = req.query.pengirimId;
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
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await PickupRequest.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const pickupRequests = await PickupRequest.find(filter)
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: pickupRequests.length,
      pagination: pagination.pagination,
      total,
      data: pickupRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data request pengambilan',
      error: error.message
    });
  }
};

// @desc      Get single pickup request
// @route     GET /api/pickup-requests/:id
// @access    Private
exports.getPickupRequest = async (req, res) => {
  try {
    const pickupRequest = await PickupRequest.findById(req.params.id)
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang');
    
    if (!pickupRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request pengambilan tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: pickupRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data request pengambilan',
      error: error.message
    });
  }
};

// @desc      Create new pickup request
// @route     POST /api/pickup-requests
// @access    Private
exports.createPickupRequest = async (req, res) => {
  try {
    // Set userId dan cabangId dari user yang login
    req.body.userId = req.user.id;
    req.body.cabangId = req.user.cabangId;
    
    // Set tanggal jika tidak disediakan
    if (!req.body.tanggal) {
      req.body.tanggal = new Date();
    }
    
    // Set status default
    req.body.status = config.STATUS.PICKUP_REQUEST.PENDING;
    
    // Buat pickup request baru
    const pickupRequest = await PickupRequest.create(req.body);
    
    // Populate data untuk response
    const populatedPickupRequest = await PickupRequest.findById(pickupRequest._id)
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang');
    
    res.status(201).json({
      success: true,
      data: populatedPickupRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat request pengambilan baru',
      error: error.message
    });
  }
};

// @desc      Update pickup request
// @route     PUT /api/pickup-requests/:id
// @access    Private
exports.updatePickupRequest = async (req, res) => {
  try {
    const pickupRequest = await PickupRequest.findById(req.params.id);
    
    if (!pickupRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request pengambilan tidak ditemukan'
      });
    }
    
    // Cek jika request sudah selesai
    if (pickupRequest.status === config.STATUS.PICKUP_REQUEST.FINISH) {
      return res.status(400).json({
        success: false,
        message: 'Request pengambilan yang sudah selesai tidak dapat diubah'
      });
    }
    
    // Update pickup request
    const updatedPickupRequest = await PickupRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang');
    
    res.status(200).json({
      success: true,
      data: updatedPickupRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate request pengambilan',
      error: error.message
    });
  }
};

// @desc      Update pickup request status
// @route     PUT /api/pickup-requests/:id/status
// @access    Private
exports.updatePickupRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    if (!Object.values(config.STATUS.PICKUP_REQUEST).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const pickupRequest = await PickupRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang');
    
    if (!pickupRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request pengambilan tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: pickupRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status request pengambilan',
      error: error.message
    });
  }
};

// @desc      Get pending pickup requests
// @route     GET /api/pickup-requests/pending
// @access    Private
exports.getPendingPickupRequests = async (req, res) => {
  try {
    // Filter untuk pickup request dengan status PENDING
    const filter = {
      status: config.STATUS.PICKUP_REQUEST.PENDING
    };
    
    // Filter berdasarkan cabang user jika bukan direktur atau manajer operasional
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    const pendingRequests = await PickupRequest.find(filter)
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: pendingRequests.length,
      data: pendingRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data request pengambilan pending',
      error: error.message
    });
  }
};

// @desc      Delete pickup request
// @route     DELETE /api/pickup-requests/:id
// @access    Private
exports.deletePickupRequest = async (req, res) => {
  try {
    const pickupRequest = await PickupRequest.findById(req.params.id);
    
    if (!pickupRequest) {
      return res.status(404).json({
        success: false,
        message: 'Request pengambilan tidak ditemukan'
      });
    }
    
    // Cek jika request sudah selesai
    if (pickupRequest.status === config.STATUS.PICKUP_REQUEST.FINISH) {
      return res.status(400).json({
        success: false,
        message: 'Request pengambilan yang sudah selesai tidak dapat dihapus'
      });
    }
    
    await pickupRequest.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Request pengambilan berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus request pengambilan',
      error: error.message
    });
  }
};