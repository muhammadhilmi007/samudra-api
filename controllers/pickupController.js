// controllers/pickupController.js - Improve the pickup controller

const Pickup = require("../models/Pickup");
const PickupRequest = require("../models/PickupRequest");
const Vehicle = require("../models/Vehicle");
const Customer = require("../models/Customer");
const STT = require("../models/STT");
const { paginationResult } = require("../utils/helpers");
const asyncHandler = require("../middlewares/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

const populateFields = [
  { path: "pengirimId", select: "nama alamat telepon" },
  { path: "supirId", select: "nama" },
  { path: "kenekId", select: "nama" },
  { path: "kendaraanId", select: "noPolisi namaKendaraan" },
  {
    path: "sttIds",
    select:
      "noSTT status createdAt namaBarang jumlahColly berat harga paymentType",
  },
  { path: "userId", select: "nama" },
  { path: "cabangId", select: "namaCabang" },
  { path: "requestId", select: "noRequest" },
];

// @desc      Get all pickups
// @route     GET /api/pickups
// @access    Private
exports.getPickups = asyncHandler(async (req, res) => {
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
    const searchRegex = new RegExp(req.query.search, "i");

    // Get customer IDs that match the search
    const customers = await Customer.find({
      nama: { $regex: searchRegex },
    }).select("_id");

    const customerIds = customers.map((customer) => customer._id);

    // Search in multiple fields
    filter.$or = [
      { noPengambilan: { $regex: searchRegex } },
      { alamatPengambilan: { $regex: searchRegex } },
      { tujuan: { $regex: searchRegex } },
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
    .populate(populateFields)
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
});

// @desc      Get single pickup
// @route     GET /api/pickups/:id
// @access    Private
exports.getPickup = asyncHandler(async (req, res) => {
  const pickup = await Pickup.findById(req.params.id)
    .populate("pengirimId", "nama alamat telepon")
    .populate("supirId", "nama")
    .populate("kenekId", "nama")
    .populate("kendaraanId", "noPolisi namaKendaraan")
    .populate(
      "sttIds",
      "noSTT namaBarang jumlahColly berat harga paymentType status"
    )
    .populate("userId", "nama")
    .populate("cabangId", "namaCabang")
    .populate("requestId", "noRequest");

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
});

// @desc      Create new pickup
// @route     POST /api/pickups
// @access    Private
// Add this function to handle pickup creation with proper validation
exports.createPickup = asyncHandler(async (req, res) => {
  // Get branch ID from authenticated user
  req.body.cabangId = req.user.cabangId;
  req.body.userId = req.user._id;

  // Generate pickup number
  const dateString = getReverseDateString();
  const latestPickup = await Pickup.findOne({}, { noPengambilan: 1 })
    .sort({ createdAt: -1 })
    .limit(1);

  let sequence = 1;
  if (latestPickup && latestPickup.noPengambilan) {
    const lastNumber = parseInt(latestPickup.noPengambilan.split("-")[2]);
    sequence = lastNumber + 1;
  }

  req.body.noPengambilan = `PU-${dateString}-${formatNumber(sequence)}`;

  // Create pickup
  const pickup = await Pickup.create(req.body);

  // If created from request, update request status
  if (req.body.requestId) {
    await PickupRequest.findByIdAndUpdate(req.body.requestId, {
      status: "FINISH",
      pickupId: pickup._id,
    });
  }

  res.status(201).json({
    success: true,
    data: pickup,
  });
});

// Add this function to handle status updates with proper validation
// @desc      Update pickup status
// @route     PUT /api/pickups/:id/status
// @access    Private
exports.updatePickupStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  // Validate status
  if (!['PENDING', 'BERANGKAT', 'SELESAI', 'CANCELLED'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status tidak valid",
    });
  }

  // Find pickup
  const pickup = await Pickup.findById(req.params.id);

  if (!pickup) {
    return res.status(404).json({
      success: false,
      message: "Pengambilan tidak ditemukan",
    });
  }

  // Update status and notes
  pickup.status = status;
  
  // Only update notes if provided
  if (notes) {
    pickup.notes = notes;
  }

  // Set timestamps for specific status changes
  if (status === 'BERANGKAT' && pickup.status !== 'BERANGKAT') {
    pickup.waktuBerangkat = Date.now();
  } else if (status === 'SELESAI' && pickup.status !== 'SELESAI') {
    pickup.waktuPulang = Date.now();
  }

  await pickup.save();

  // Return updated pickup with populated fields
  const updatedPickup = await Pickup.findById(req.params.id).populate(populateFields);

  res.status(200).json({
    success: true,
    data: updatedPickup,
  });
});

// @desc      Update pickup
// @route     PUT /api/pickups/:id
// @access    Private
exports.updatePickup = asyncHandler(async (req, res) => {
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
    .populate("cabangId", "namaCabang")
    .populate("requestId", "noRequest");

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
});

// @desc      Delete pickup
// @route     DELETE /api/pickups/:id
// @access    Private
exports.deletePickup = asyncHandler(async (req, res) => {
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
});

// @desc      Add STT to pickup
// @route     PUT /api/pickups/:id/add-stt
// @access    Private
exports.addSTTToPickup = asyncHandler(async (req, res) => {
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
    .populate("sttIds", "noSTT namaBarang jumlahColly berat harga paymentType")
    .populate("userId", "nama")
    .populate("cabangId", "namaCabang")
    .populate("requestId", "noRequest");

  res.status(200).json({
    success: true,
    data: populatedPickup,
  });
});

// @desc      Remove STT from pickup
// @route     PUT /api/pickups/:id/remove-stt
// @access    Private
exports.removeSTTFromPickup = asyncHandler(async (req, res) => {
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
    .populate("sttIds", "noSTT namaBarang jumlahColly berat harga paymentType")
    .populate("userId", "nama")
    .populate("cabangId", "namaCabang")
    .populate("requestId", "noRequest");

  res.status(200).json({
    success: true,
    data: populatedPickup,
  });
});

// @desc      Get pickups by sender
// @route     GET /api/pickups/by-sender/:senderId
// @access    Private
exports.getPickupsBySender = asyncHandler(async (req, res) => {
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
    .populate("requestId", "noRequest")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: pickups.length,
    data: pickups,
  });
});

// @desc      Get pickups by driver
// @route     GET /api/pickups/by-driver/:driverId
// @access    Private
exports.getPickupsByDriver = asyncHandler(async (req, res) => {
  const pickups = await Pickup.find({ supirId: req.params.driverId })
    .populate(populateFields)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: pickups.length,
    data: pickups,
  });
});
