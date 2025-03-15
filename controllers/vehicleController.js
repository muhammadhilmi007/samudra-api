const Vehicle = require('../models/Vehicle');
const { paginationResult } = require('../utils/helpers');

// @desc      Get all vehicles
// @route     GET /api/vehicles
// @access    Private
exports.getVehicles = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    if (req.query.tipe) {
      filter.tipe = req.query.tipe;
    }
    
    if (req.query.grup) {
      filter.grup = req.query.grup;
    }
    
    if (req.query.search) {
      filter.$or = [
        { noPolisi: { $regex: req.query.search, $options: 'i' } },
        { namaKendaraan: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Vehicle.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const vehicles = await Vehicle.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: vehicles.length,
      pagination: pagination.pagination,
      total,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kendaraan',
      error: error.message
    });
  }
};

// @desc      Get single vehicle
// @route     GET /api/vehicles/:id
// @access    Private
exports.getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama');
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Kendaraan tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kendaraan',
      error: error.message
    });
  }
};

// @desc      Create new vehicle
// @route     POST /api/vehicles
// @access    Private
exports.createVehicle = async (req, res) => {
  try {
    // Cek apakah nomor polisi sudah ada
    const existingVehicle = await Vehicle.findOne({
      noPolisi: req.body.noPolisi
    });
    
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Nomor polisi sudah terdaftar'
      });
    }
    
    // Buat kendaraan baru
    const vehicle = await Vehicle.create(req.body);
    
    // Populate data untuk response
    const populatedVehicle = await Vehicle.findById(vehicle._id)
      .populate('cabangId', 'namaCabang')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama');
    
    res.status(201).json({
      success: true,
      data: populatedVehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat kendaraan baru',
      error: error.message
    });
  }
};

// @desc      Update vehicle
// @route     PUT /api/vehicles/:id
// @access    Private
exports.updateVehicle = async (req, res) => {
  try {
    // Cek apakah nomor polisi sudah ada jika diupdate
    if (req.body.noPolisi) {
      const existingVehicle = await Vehicle.findOne({
        noPolisi: req.body.noPolisi,
        _id: { $ne: req.params.id }
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Nomor polisi sudah terdaftar'
        });
      }
    }
    
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama');
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Kendaraan tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate kendaraan',
      error: error.message
    });
  }
};

// @desc      Delete vehicle
// @route     DELETE /api/vehicles/:id
// @access    Private
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Kendaraan tidak ditemukan'
      });
    }
    
    // Cek apakah kendaraan sedang digunakan di modul lain
    // Contoh: cek penggunaan di pengambilan, muat, lansir, dll.
    const Pickup = require('../models/Pickup');
    const Loading = require('../models/Loading');
    const Delivery = require('../models/Delivery');
    
    const hasPickup = await Pickup.findOne({ kendaraanId: req.params.id });
    const hasTruckQueue = await Loading.findOne({ truckId: req.params.id });
    const hasDelivery = await Delivery.findOne({ kendaraanId: req.params.id });
    
    if (hasPickup || hasTruckQueue || hasDelivery) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus kendaraan yang sedang digunakan'
      });
    }
    
    await vehicle.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Kendaraan berhasil dihapus'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus kendaraan',
      error: error.message
    });
  }
};

// @desc      Get vehicles by branch
// @route     GET /api/vehicles/by-branch/:branchId
// @access    Private
exports.getVehiclesByBranch = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      cabangId: req.params.branchId
    })
      .populate('cabangId', 'namaCabang')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kendaraan',
      error: error.message
    });
  }
};

// @desc      Get trucks (kendaraan with tipe 'antar_cabang')
// @route     GET /api/vehicles/trucks
// @access    Private
exports.getTrucks = async (req, res) => {
  try {
    const filter = {
      tipe: 'antar_cabang'
    };
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    const trucks = await Vehicle.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: trucks.length,
      data: trucks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data truck',
      error: error.message
    });
  }
};

// @desc      Get delivery vehicles (kendaraan with tipe 'lansir')
// @route     GET /api/vehicles/delivery
// @access    Private
exports.getDeliveryVehicles = async (req, res) => {
  try {
    const filter = {
      tipe: 'lansir'
    };
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    const deliveryVehicles = await Vehicle.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('supirId', 'nama')
      .populate('kenekId', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: deliveryVehicles.length,
      data: deliveryVehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data kendaraan pengiriman',
      error: error.message
    });
  }
};