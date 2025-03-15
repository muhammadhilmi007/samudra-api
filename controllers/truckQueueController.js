const TruckQueue = require('../models/TruckQueue');
const Vehicle = require('../models/Vehicle');
const Branch = require('../models/Branch');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');

// @desc      Get all truck queues
// @route     GET /api/truck-queues
// @access    Private
exports.getTruckQueues = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      // Jika bukan direktur atau manajer operasional, hanya tampilkan antrian di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.truckId) {
      filter.truckId = req.query.truckId;
    }
    
    if (req.query.supirId) {
      filter.supirId = req.query.supirId;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await TruckQueue.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const truckQueues = await TruckQueue.find(filter)
      .populate('truckId', 'noPolisi namaKendaraan')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .skip(startIndex)
      .limit(limit)
      .sort('urutan');
    
    res.status(200).json({
      success: true,
      count: truckQueues.length,
      pagination: pagination.pagination,
      total,
      data: truckQueues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data antrian truck',
      error: error.message
    });
  }
};

// @desc      Get single truck queue
// @route     GET /api/truck-queues/:id
// @access    Private
exports.getTruckQueue = async (req, res) => {
  try {
    const truckQueue = await TruckQueue.findById(req.params.id)
      .populate('truckId', 'noPolisi namaKendaraan')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    if (!truckQueue) {
      return res.status(404).json({
        success: false,
        message: 'Antrian truck tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: truckQueue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data antrian truck',
      error: error.message
    });
  }
};

// @desc      Create new truck queue
// @route     POST /api/truck-queues
// @access    Private
exports.createTruckQueue = async (req, res) => {
  try {
    // Validasi data
    if (!req.body.truckId) {
      return res.status(400).json({
        success: false,
        message: 'Truck harus diisi'
      });
    }
    
    // Validasi truck
    const truck = await Vehicle.findById(req.body.truckId);
    if (!truck) {
      return res.status(404).json({
        success: false,
        message: 'Truck tidak ditemukan'
      });
    }
    
    // Validasi supir
    if (req.body.supirId) {
      const supir = await Vehicle.findById(req.body.supirId);
      if (!supir) {
        return res.status(404).json({
          success: false,
          message: 'Supir tidak ditemukan'
        });
      }
    } else {
      // Gunakan supir dari truck jika tidak diisi
      req.body.supirId = truck.supirId;
      req.body.noTelp = truck.noTeleponSupir;
    }
    
    // Validasi kenek
    if (req.body.kenekId) {
      const kenek = await Vehicle.findById(req.body.kenekId);
      if (!kenek) {
        return res.status(404).json({
          success: false,
          message: 'Kenek tidak ditemukan'
        });
      }
    } else {
      // Gunakan kenek dari truck jika tidak diisi
      req.body.kenekId = truck.kenekId;
      req.body.noTelpKenek = truck.noTeleponKenek;
    }
    
    // Validasi cabang
    if (req.body.cabangId) {
      const cabang = await Branch.findById(req.body.cabangId);
      if (!cabang) {
        return res.status(404).json({
          success: false,
          message: 'Cabang tidak ditemukan'
        });
      }
    } else {
      // Gunakan cabang user yang login
      req.body.cabangId = req.user.cabangId;
    }
    
    // Cek apakah truck sudah dalam antrian dengan status MENUNGGU atau MUAT
    const existingQueue = await TruckQueue.findOne({
      truckId: req.body.truckId,
      status: { $in: ['MENUNGGU', 'MUAT'] },
      cabangId: req.body.cabangId
    });
    
    if (existingQueue) {
      return res.status(400).json({
        success: false,
        message: 'Truck sudah dalam antrian'
      });
    }
    
    // Set createdBy dari user yang login
    req.body.createdBy = req.user.id;
    
    // Set status default
    if (!req.body.status) {
      req.body.status = 'MENUNGGU';
    }
    
    // Dapatkan urutan terakhir
    const lastQueue = await TruckQueue.findOne({
      cabangId: req.body.cabangId
    }).sort('-urutan');
    
    // Set urutan baru
    req.body.urutan = lastQueue ? lastQueue.urutan + 1 : 1;
    
    // Buat antrian truck baru
    const truckQueue = await TruckQueue.create(req.body);
    
    // Populate data untuk response
    const populatedTruckQueue = await TruckQueue.findById(truckQueue._id)
      .populate('truckId', 'noPolisi namaKendaraan')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    res.status(201).json({
      success: true,
      data: populatedTruckQueue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat antrian truck baru',
      error: error.message
    });
  }
};

// @desc      Update truck queue
// @route     PUT /api/truck-queues/:id
// @access    Private
exports.updateTruckQueue = async (req, res) => {
  try {
    const truckQueue = await TruckQueue.findById(req.params.id);
    
    if (!truckQueue) {
      return res.status(404).json({
        success: false,
        message: 'Antrian truck tidak ditemukan'
      });
    }
    
    // Validasi truck jika diubah
    if (req.body.truckId) {
      const truck = await Vehicle.findById(req.body.truckId);
      if (!truck) {
        return res.status(404).json({
          success: false,
          message: 'Truck tidak ditemukan'
        });
      }
    }
    
    // Validasi supir jika diubah
    if (req.body.supirId) {
      const supir = await Vehicle.findById(req.body.supirId);
      if (!supir) {
        return res.status(404).json({
          success: false,
          message: 'Supir tidak ditemukan'
        });
      }
    }
    
    // Validasi kenek jika diubah
    if (req.body.kenekId) {
      const kenek = await Vehicle.findById(req.body.kenekId);
      if (!kenek) {
        return res.status(404).json({
          success: false,
          message: 'Kenek tidak ditemukan'
        });
      }
    }
    
    // Validasi cabang jika diubah
    if (req.body.cabangId) {
      const cabang = await Branch.findById(req.body.cabangId);
      if (!cabang) {
        return res.status(404).json({
          success: false,
          message: 'Cabang tidak ditemukan'
        });
      }
    }
    
    // Validasi status jika diubah
    if (req.body.status) {
      const validStatus = ['MENUNGGU', 'MUAT', 'BERANGKAT'];
      if (!validStatus.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: 'Status tidak valid'
        });
      }
    }
    
    // Update antrian truck
    const updatedTruckQueue = await TruckQueue.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('truckId', 'noPolisi namaKendaraan')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedTruckQueue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate antrian truck',
      error: error.message
    });
  }
};

// @desc      Delete truck queue
// @route     DELETE /api/truck-queues/:id
// @access    Private
exports.deleteTruckQueue = async (req, res) => {
  try {
    const truckQueue = await TruckQueue.findById(req.params.id);
    
    if (!truckQueue) {
      return res.status(404).json({
        success: false,
        message: 'Antrian truck tidak ditemukan'
      });
    }
    
    // Cek apakah antrian sedang digunakan di muat
    const Loading = require('../models/Loading');
    const isUsed = await Loading.findOne({ antrianTruckId: req.params.id });
    
    if (isUsed) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus antrian truck yang sedang digunakan'
      });
    }
    
    await truckQueue.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Antrian truck berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus antrian truck',
      error: error.message
    });
  }
};

// @desc      Update truck queue status
// @route     PUT /api/truck-queues/:id/status
// @access    Private
exports.updateTruckQueueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    const validStatus = ['MENUNGGU', 'MUAT', 'BERANGKAT'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const truckQueue = await TruckQueue.findById(req.params.id);
    
    if (!truckQueue) {
      return res.status(404).json({
        success: false,
        message: 'Antrian truck tidak ditemukan'
      });
    }
    
    // Update status antrian truck
    const updatedTruckQueue = await TruckQueue.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('truckId', 'noPolisi namaKendaraan')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedTruckQueue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status antrian truck',
      error: error.message
    });
  }
};

// @desc      Get truck queues by branch
// @route     GET /api/truck-queues/by-branch/:branchId
// @access    Private
exports.getTruckQueuesByBranch = async (req, res) => {
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
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const truckQueues = await TruckQueue.find(filter)
      .populate('truckId', 'noPolisi namaKendaraan')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .sort('urutan');
    
    res.status(200).json({
      success: true,
      count: truckQueues.length,
      data: truckQueues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data antrian truck',
      error: error.message
    });
  }
};

// @desc      Get truck queues by status
// @route     GET /api/truck-queues/by-status/:status
// @access    Private
exports.getTruckQueuesByStatus = async (req, res) => {
  try {
    // Validasi status
    const validStatus = ['MENUNGGU', 'MUAT', 'BERANGKAT'];
    if (!validStatus.includes(req.params.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    // Filter berdasarkan cabang pengguna jika bukan direktur atau manajer operasional
    const filter = { status: req.params.status };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    const truckQueues = await TruckQueue.find(filter)
      .populate('truckId', 'noPolisi namaKendaraan')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .sort('urutan');
    
    res.status(200).json({
      success: true,
      count: truckQueues.length,
      data: truckQueues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data antrian truck',
      error: error.message
    });
  }
};