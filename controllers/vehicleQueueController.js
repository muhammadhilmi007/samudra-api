const VehicleQueue = require('../models/VehicleQueue');
const Vehicle = require('../models/Vehicle');
const Branch = require('../models/Branch');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');

// @desc      Get all vehicle queues
// @route     GET /api/vehicle-queues
// @access    Private
exports.getVehicleQueues = async (req, res) => {
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
    
    if (req.query.kendaraanId) {
      filter.kendaraanId = req.query.kendaraanId;
    }
    
    if (req.query.supirId) {
      filter.supirId = req.query.supirId;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await VehicleQueue.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const vehicleQueues = await VehicleQueue.find(filter)
      .populate({
        path: 'kendaraanId',
        select: 'noPolisi namaKendaraan tipe'
      })
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .skip(startIndex)
      .limit(limit)
      .sort('urutan');
    
    res.status(200).json({
      success: true,
      count: vehicleQueues.length,
      pagination: pagination.pagination,
      total,
      data: vehicleQueues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data antrian kendaraan',
      error: error.message
    });
  }
};

// @desc      Get single vehicle queue
// @route     GET /api/vehicle-queues/:id
// @access    Private
exports.getVehicleQueue = async (req, res) => {
  try {
    const vehicleQueue = await VehicleQueue.findById(req.params.id)
      .populate({
        path: 'kendaraanId',
        select: 'noPolisi namaKendaraan tipe'
      })
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    if (!vehicleQueue) {
      return res.status(404).json({
        success: false,
        message: 'Antrian kendaraan tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: vehicleQueue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data antrian kendaraan',
      error: error.message
    });
  }
};

// @desc      Create new vehicle queue
// @route     POST /api/vehicle-queues
// @access    Private
exports.createVehicleQueue = async (req, res) => {
  try {
    // Validasi data
    if (!req.body.kendaraanId) {
      return res.status(400).json({
        success: false,
        message: 'Kendaraan harus diisi'
      });
    }
    
    // Validasi kendaraan
    const kendaraan = await Vehicle.findById(req.body.kendaraanId);
    if (!kendaraan) {
      return res.status(404).json({
        success: false,
        message: 'Kendaraan tidak ditemukan'
      });
    }
    
    // Cek tipe kendaraan (harus lansir)
    if (kendaraan.tipe !== 'lansir') {
      return res.status(400).json({
        success: false,
        message: 'Hanya kendaraan dengan tipe lansir yang dapat masuk antrian'
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
      // Gunakan supir dari kendaraan jika tidak diisi
      req.body.supirId = kendaraan.supirId;
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
      // Gunakan kenek dari kendaraan jika tidak diisi
      req.body.kenekId = kendaraan.kenekId;
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
    
    // Cek apakah kendaraan sudah dalam antrian dengan status MENUNGGU atau LANSIR
    const existingQueue = await VehicleQueue.findOne({
      kendaraanId: req.body.kendaraanId,
      status: { $in: ['MENUNGGU', 'LANSIR'] },
      cabangId: req.body.cabangId
    });
    
    if (existingQueue) {
      return res.status(400).json({
        success: false,
        message: 'Kendaraan sudah dalam antrian'
      });
    }
    
    // Set createdBy dari user yang login
    req.body.createdBy = req.user.id;
    
    // Set status default
    if (!req.body.status) {
      req.body.status = 'MENUNGGU';
    }
    
    // Dapatkan urutan terakhir
    const lastQueue = await VehicleQueue.findOne({
      cabangId: req.body.cabangId
    }).sort('-urutan');
    
    // Set urutan baru
    req.body.urutan = lastQueue ? lastQueue.urutan + 1 : 1;
    
    // Buat antrian kendaraan baru
    const vehicleQueue = await VehicleQueue.create(req.body);
    
    // Populate data untuk response
    const populatedVehicleQueue = await VehicleQueue.findById(vehicleQueue._id)
      .populate({
        path: 'kendaraanId',
        select: 'noPolisi namaKendaraan tipe'
      })
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    res.status(201).json({
      success: true,
      data: populatedVehicleQueue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat antrian kendaraan baru',
      error: error.message
    });
  }
};

// @desc      Update vehicle queue
// @route     PUT /api/vehicle-queues/:id
// @access    Private
exports.updateVehicleQueue = async (req, res) => {
  try {
    const vehicleQueue = await VehicleQueue.findById(req.params.id);
    
    if (!vehicleQueue) {
      return res.status(404).json({
        success: false,
        message: 'Antrian kendaraan tidak ditemukan'
      });
    }
    
    // Validasi kendaraan jika diubah
    if (req.body.kendaraanId) {
      const kendaraan = await Vehicle.findById(req.body.kendaraanId);
      if (!kendaraan) {
        return res.status(404).json({
          success: false,
          message: 'Kendaraan tidak ditemukan'
        });
      }
      
      // Cek tipe kendaraan (harus lansir)
      if (kendaraan.tipe !== 'lansir') {
        return res.status(400).json({
          success: false,
          message: 'Hanya kendaraan dengan tipe lansir yang dapat masuk antrian'
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
      const validStatus = ['MENUNGGU', 'LANSIR', 'KEMBALI'];
      if (!validStatus.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: 'Status tidak valid'
        });
      }
    }
    
    // Update antrian kendaraan
    const updatedVehicleQueue = await VehicleQueue.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate({
        path: 'kendaraanId',
        select: 'noPolisi namaKendaraan tipe'
      })
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedVehicleQueue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate antrian kendaraan',
      error: error.message
    });
  }
};

// @desc      Delete vehicle queue
// @route     DELETE /api/vehicle-queues/:id
// @access    Private
exports.deleteVehicleQueue = async (req, res) => {
  try {
    const vehicleQueue = await VehicleQueue.findById(req.params.id);
    
    if (!vehicleQueue) {
      return res.status(404).json({
        success: false,
        message: 'Antrian kendaraan tidak ditemukan'
      });
    }
    
    // Cek apakah antrian sedang digunakan di lansir
    const Delivery = require('../models/Delivery');
    const isUsed = await Delivery.findOne({ antrianKendaraanId: req.params.id });
    
    if (isUsed) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus antrian kendaraan yang sedang digunakan'
      });
    }
    
    await vehicleQueue.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Antrian kendaraan berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus antrian kendaraan',
      error: error.message
    });
  }
};

// @desc      Update vehicle queue status
// @route     PUT /api/vehicle-queues/:id/status
// @access    Private
exports.updateVehicleQueueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    const validStatus = ['MENUNGGU', 'LANSIR', 'KEMBALI'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const vehicleQueue = await VehicleQueue.findById(req.params.id);
    
    if (!vehicleQueue) {
      return res.status(404).json({
        success: false,
        message: 'Antrian kendaraan tidak ditemukan'
      });
    }
    
    // Update status antrian kendaraan
    const updatedVehicleQueue = await VehicleQueue.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    )
      .populate({
        path: 'kendaraanId',
        select: 'noPolisi namaKendaraan tipe'
      })
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama');
    
    res.status(200).json({
      success: true,
      data: updatedVehicleQueue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status antrian kendaraan',
      error: error.message
    });
  }
};

// @desc      Get vehicle queues by branch
// @route     GET /api/vehicle-queues/by-branch/:branchId
// @access    Private
exports.getVehicleQueuesByBranch = async (req, res) => {
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
    
    const vehicleQueues = await VehicleQueue.find(filter)
      .populate({
        path: 'kendaraanId',
        select: 'noPolisi namaKendaraan tipe'
      })
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .sort('urutan');
    
    res.status(200).json({
      success: true,
      count: vehicleQueues.length,
      data: vehicleQueues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data antrian kendaraan',
      error: error.message
    });
  }
};

// @desc      Get vehicle queues by status
// @route     GET /api/vehicle-queues/by-status/:status
// @access    Private
exports.getVehicleQueuesByStatus = async (req, res) => {
  try {
    // Validasi status
    const validStatus = ['MENUNGGU', 'LANSIR', 'KEMBALI'];
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
    
    const vehicleQueues = await VehicleQueue.find(filter)
      .populate({
        path: 'kendaraanId',
        select: 'noPolisi namaKendaraan tipe'
      })
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .sort('urutan');
    
    res.status(200).json({
      success: true,
      count: vehicleQueues.length,
      data: vehicleQueues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data antrian kendaraan',
      error: error.message
    });
  }
};