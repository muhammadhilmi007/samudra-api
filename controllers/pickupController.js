// controllers/pickupController.js
const Pickup = require("../models/Pickup");
const Vehicle = require("../models/Vehicle");
const Customer = require("../models/Customer");
const STT = require("../models/STT");
const { paginationResult } = require("../utils/helpers");

// @desc      Get all pickups
// @route     GET /api/pickups
// @access    Private
exports.getPickups = async (req, res) => {
  try {
    // Filter based on query
    const filter = {};

    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (
      req.user.role !== "direktur" &&
      req.user.role !== "manajerOperasional"
    ) {
      // If not director or operations manager, only show pickups in your own branch
      filter.cabangId = req.user.cabangId;
    }

    if (req.query.pengirimId) {
      filter.pengirimId = req.query.pengirimId;
    }

    if (req.query.supirId) {
      filter.supirId = req.query.supirId;
    }

    if (req.query.kendaraanId) {
      filter.kendaraanId = req.query.kendaraanId;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Search by text
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      // Get customer IDs that match the search
      const customers = await Customer.find({
        nama: { $regex: searchRegex }
      }).select('_id');
      
      const customerIds = customers.map(customer => customer._id);
      
      // Search in multiple fields
      filter.$or = [
        { noPengambilan: { $regex: searchRegex } },
        { alamatPengambilan: { $regex: searchRegex } },
        { tujuan: { $regex: searchRegex } }
      ];
      
      // Add customer IDs to the search
      if (customerIds.length > 0) {
        filter.$or.push({ pengirimId: { $in: customerIds } });
      }
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.tanggal = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
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
    const total = await Pickup.countDocuments(filter);

    const pagination = paginationResult(page, limit, total);

    const pickups = await Pickup.find(filter)
      .populate("pengirimId", "nama alamat telepon")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .populate("sttIds", "noSTT")
      .populate("userId", "nama")
      .populate("cabangId", "namaCabang")
      .skip(startIndex)
      .limit(limit)
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: pickups.length,
      pagination: pagination.pagination,
      total,
      data: pickups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data pengambilan",
      error: error.message,
    });
  }
};

// @desc      Get single pickup
// @route     GET /api/pickups/:id
// @access    Private
exports.getPickup = async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id)
      .populate("pengirimId", "nama alamat telepon")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .populate(
        "sttIds",
        "noSTT namaBarang jumlahColly berat harga paymentType"
      )
      .populate("userId", "nama")
      .populate("cabangId", "namaCabang");

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pengambilan tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: pickup,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data pengambilan",
      error: error.message,
    });
  }
};

// @desc      Create new pickup
// @route     POST /api/pickups
// @access    Private
exports.createPickup = async (req, res) => {
  try {
    // Validate data
    if (!req.body.pengirimId) {
      return res.status(400).json({
        success: false,
        message: "Pengirim harus diisi",
      });
    }

    if (!req.body.supirId) {
      return res.status(400).json({
        success: false,
        message: "Supir harus diisi",
      });
    }

    if (!req.body.kendaraanId) {
      return res.status(400).json({
        success: false,
        message: "Kendaraan harus diisi",
      });
    }
    
    if (!req.body.alamatPengambilan) {
      return res.status(400).json({
        success: false,
        message: "Alamat pengambilan harus diisi",
      });
    }

    // Check if sender exists
    const pengirim = await Customer.findById(req.body.pengirimId);
    if (!pengirim) {
      return res.status(404).json({
        success: false,
        message: "Pengirim tidak ditemukan",
      });
    }

    // Check if vehicle exists
    const kendaraan = await Vehicle.findById(req.body.kendaraanId);
    if (!kendaraan) {
      return res.status(404).json({
        success: false,
        message: "Kendaraan tidak ditemukan",
      });
    }

    // Set userId and cabangId from logged in user
    req.body.userId = req.user.id;
    
    // Use branch from body if provided, otherwise use user's branch
    if (!req.body.cabangId) {
      req.body.cabangId = req.user.cabangId;
    }

    // Set date if not provided
    if (!req.body.tanggal) {
      req.body.tanggal = new Date();
    }
    
    // Set default status
    req.body.status = 'PENDING';

    // Create pickup
    const pickup = await Pickup.create(req.body);

    // Populate data for response
    const populatedPickup = await Pickup.findById(pickup._id)
      .populate("pengirimId", "nama alamat telepon")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .populate("sttIds", "noSTT")
      .populate("userId", "nama")
      .populate("cabangId", "namaCabang");

    res.status(201).json({
      success: true,
      data: populatedPickup,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal membuat pengambilan baru",
      error: error.message,
    });
  }
};

// @desc      Update pickup
// @route     PUT /api/pickups/:id
// @access    Private
exports.updatePickup = async (req, res) => {
  try {
    // Validate data if being updated
    if (req.body.pengirimId) {
      const pengirim = await Customer.findById(req.body.pengirimId);
      if (!pengirim) {
        return res.status(404).json({
          success: false,
          message: "Pengirim tidak ditemukan",
        });
      }
    }

    if (req.body.kendaraanId) {
      const kendaraan = await Vehicle.findById(req.body.kendaraanId);
      if (!kendaraan) {
        return res.status(404).json({
          success: false,
          message: "Kendaraan tidak ditemukan",
        });
      }
    }

    const pickup = await Pickup.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("pengirimId", "nama alamat telepon")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .populate("sttIds", "noSTT")
      .populate("userId", "nama")
      .populate("cabangId", "namaCabang");

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pengambilan tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: pickup,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate pengambilan",
      error: error.message,
    });
  }
};

// @desc      Delete pickup
// @route     DELETE /api/pickups/:id
// @access    Private
exports.deletePickup = async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pengambilan tidak ditemukan",
      });
    }

    // Check if there are STTs associated
    if (pickup.sttIds && pickup.sttIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus pengambilan yang memiliki STT terkait",
      });
    }

    await pickup.deleteOne();

    res.status(200).json({
      success: true,
      message: "Pengambilan berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pengambilan",
      error: error.message,
    });
  }
};

// @desc      Add STT to pickup
// @route     PUT /api/pickups/:id/add-stt
// @access    Private
exports.addSTTToPickup = async (req, res) => {
  try {
    const { sttIds } = req.body;

    if (!sttIds || !Array.isArray(sttIds) || sttIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "STT IDs harus diisi",
      });
    }

    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pengambilan tidak ditemukan",
      });
    }

    // Validate each STT
    for (const sttId of sttIds) {
      const stt = await STT.findById(sttId);

      if (!stt) {
        return res.status(404).json({
          success: false,
          message: `STT dengan ID ${sttId} tidak ditemukan`,
        });
      }

      // controllers/pickupController.js (continued)
      // Check if STT already exists in another pickup
      const existingPickup = await Pickup.findOne({
        _id: { $ne: req.params.id },
        sttIds: sttId,
      });

      if (existingPickup) {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} sudah ada di pengambilan lain`,
        });
      }

      // Add STT to pickup if not already included
      if (!pickup.sttIds.includes(sttId)) {
        pickup.sttIds.push(sttId);
      }
    }

    await pickup.save();

    // Populate data for response
    const populatedPickup = await Pickup.findById(pickup._id)
      .populate("pengirimId", "nama alamat telepon")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .populate(
        "sttIds",
        "noSTT namaBarang jumlahColly berat harga paymentType"
      )
      .populate("userId", "nama")
      .populate("cabangId", "namaCabang");

    res.status(200).json({
      success: true,
      data: populatedPickup,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan STT ke pengambilan",
      error: error.message,
    });
  }
};

// @desc      Remove STT from pickup
// @route     PUT /api/pickups/:id/remove-stt
// @access    Private
exports.removeSTTFromPickup = async (req, res) => {
  try {
    const { sttId } = req.body;

    if (!sttId) {
      return res.status(400).json({
        success: false,
        message: "STT ID harus diisi",
      });
    }

    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pengambilan tidak ditemukan",
      });
    }

    // Check if STT exists in pickup
    if (!pickup.sttIds.includes(sttId)) {
      return res.status(400).json({
        success: false,
        message: "STT tidak ditemukan di pengambilan ini",
      });
    }

    // Remove STT from pickup
    pickup.sttIds = pickup.sttIds.filter((id) => id.toString() !== sttId);
    await pickup.save();

    // Populate data for response
    const populatedPickup = await Pickup.findById(pickup._id)
      .populate("pengirimId", "nama alamat telepon")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .populate(
        "sttIds",
        "noSTT namaBarang jumlahColly berat harga paymentType"
      )
      .populate("userId", "nama")
      .populate("cabangId", "namaCabang");

    res.status(200).json({
      success: true,
      data: populatedPickup,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus STT dari pengambilan",
      error: error.message,
    });
  }
};

// @desc      Get pickups by sender
// @route     GET /api/pickups/by-sender/:senderId
// @access    Private
exports.getPickupsBySender = async (req, res) => {
  try {
    const pickups = await Pickup.find({
      pengirimId: req.params.senderId,
    })
      .populate("pengirimId", "nama alamat telepon")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .populate("sttIds", "noSTT")
      .populate("userId", "nama")
      .populate("cabangId", "namaCabang")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: pickups.length,
      data: pickups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data pengambilan",
      error: error.message,
    });
  }
};

// @desc      Update pickup status
// @route     PUT /api/pickups/:id/status
// @access    Private
exports.updatePickupStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status harus diisi",
      });
    }

    const validStatuses = ["PENDING", "BERANGKAT", "SELESAI", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    let updateData = { status };

    // If status is BERANGKAT, set waktuBerangkat to now
    if (status === "BERANGKAT") {
      updateData.waktuBerangkat = new Date();
    }

    // If status is SELESAI, set waktuPulang to now
    if (status === "SELESAI") {
      updateData.waktuPulang = new Date();
    }

    const pickup = await Pickup.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("pengirimId", "nama alamat telepon")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .populate("sttIds", "noSTT")
      .populate("userId", "nama")
      .populate("cabangId", "namaCabang");

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pengambilan tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: pickup,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate status pengambilan",
      error: error.message,
    });
  }
};