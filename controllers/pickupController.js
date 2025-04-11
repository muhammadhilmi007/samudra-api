// controllers/pickupController.js - Improved pickup controller
const Pickup = require("../models/Pickup");
const PickupRequest = require("../models/PickupRequest");
const Vehicle = require("../models/Vehicle");
const Customer = require("../models/Customer");
const User = require("../models/User");
const STT = require("../models/STT");
const { paginationResult } = require("../utils/helpers");
const asyncHandler = require("../middlewares/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// Define standard population paths for code reuse
const populateFields = [
  { path: "pengirimId", select: "nama alamat telepon" },
  { path: "supirId", select: "nama" },
  { path: "kenekId", select: "nama" },
  { path: "kendaraanId", select: "noPolisi namaKendaraan tipe" },
  {
    path: "sttIds",
    select:
      "noSTT status createdAt namaBarang jumlahColly berat harga paymentType penerimaId",
    populate: { path: "penerimaId", select: "nama" },
  },
  { path: "userId", select: "nama" },
  { path: "cabangId", select: "namaCabang" },
  { path: "requestId", select: "_id noRequest" },
];

// @desc    Get all pickups with filtering, search, and pagination
// @route   GET /api/pickups
// @access  Private
exports.getPickups = asyncHandler(async (req, res) => {
  // Build filter object
  const filter = {};

  // Filter by branch if not director or operations manager
  if (req.query.cabangId) {
    filter.cabangId = req.query.cabangId;
  } else if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional"
  ) {
    // If not director or operations manager, only show pickups in your own branch
    filter.cabangId = req.user.cabangId;
  }

  // Filter by sender, driver, vehicle or status if specified
  if (req.query.pengirimId) filter.pengirimId = req.query.pengirimId;
  if (req.query.supirId) filter.supirId = req.query.supirId;
  if (req.query.kendaraanId) filter.kendaraanId = req.query.kendaraanId;
  if (req.query.status) filter.status = req.query.status;

  // Search functionality
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
      { notes: { $regex: searchRegex } },
    ];

    // Add customer IDs to the search
    if (customerIds.length > 0) {
      filter.$or.push({ pengirimId: { $in: customerIds } });
    }
  }

  // Date range filter
  if (req.query.dateFrom || req.query.dateTo) {
    filter.tanggal = {};

    if (req.query.dateFrom) {
      filter.tanggal.$gte = new Date(req.query.dateFrom);
    }

    if (req.query.dateTo) {
      // Add 1 day to include the end date fully
      const endDate = new Date(req.query.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      filter.tanggal.$lte = endDate;
    }
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const total = await Pickup.countDocuments(filter);

  // Sorting
  const sort = {};
  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(":");
    sort[parts[0]] = parts[1] === "desc" ? -1 : 1;
  } else {
    // Default sort by createdAt descending (newest first)
    sort.createdAt = -1;
  }

  // Execute query with pagination
  const pickups = await Pickup.find(filter)
    .populate(populateFields)
    .sort(sort)
    .skip(startIndex)
    .limit(limit);

  // Generate pagination data
  const pagination = paginationResult(page, limit, total);

  res.status(200).json({
    success: true,
    count: pickups.length,
    pagination,
    data: {
      data: pickups,
      total,
    },
  });
});

// @desc    Get single pickup by ID
// @route   GET /api/pickups/:id
// @access  Private
exports.getPickup = asyncHandler(async (req, res) => {
  const pickup = await Pickup.findById(req.params.id).populate(populateFields);

  if (!pickup) {
    return res.status(404).json({
      success: false,
      message: "Pengambilan tidak ditemukan",
    });
  }

  // Check if user has access to this pickup
  if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional" &&
    req.user.cabangId.toString() !== pickup.cabangId._id.toString() &&
    req.user._id.toString() !== pickup.supirId._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses ke pengambilan ini",
    });
  }

  res.status(200).json({
    success: true,
    data: pickup,
  });
});

// @desc    Create new pickup
// @route   POST /api/pickups
// @access  Private
exports.createPickup = asyncHandler(async (req, res) => {
  // Set cabang and user data
  req.body.cabangId = req.user.cabangId;
  req.body.userId = req.user._id;

  // If kenekId is empty string or "null", set to null
  if (
    req.body.kenekId === "" ||
    req.body.kenekId === "null" ||
    req.body.kenekId === "all"
  ) {
    req.body.kenekId = null;
  }

  // Validate required references exist
  await validateReferences(req.body);

  // Create pickup
  const pickup = await Pickup.create(req.body);

  // Update pickup request if creating from a request
  if (req.body.requestId) {
    await PickupRequest.findByIdAndUpdate(req.body.requestId, {
      status: "FINISH",
      pickupId: pickup._id,
    });
  }

  // Get populated pickup for response
  const populatedPickup = await Pickup.findById(pickup._id).populate(
    populateFields
  );

  res.status(201).json({
    success: true,
    data: populatedPickup,
  });
});

// @desc    Update pickup
// @route   PUT /api/pickups/:id
// @access  Private
exports.updatePickup = asyncHandler(async (req, res) => {
  let pickup = await Pickup.findById(req.params.id);

  if (!pickup) {
    return res.status(404).json({
      success: false,
      message: "Pengambilan tidak ditemukan",
    });
  }

  // Check if user can update this pickup
  if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional" &&
    req.user.role !== "kepalaGudang" &&
    req.user.cabangId.toString() !== pickup.cabangId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses untuk mengubah pengambilan ini",
    });
  }

  // Handle kenekId special case
  if (
    req.body.kenekId === "" ||
    req.body.kenekId === "null" ||
    req.body.kenekId === "all"
  ) {
    req.body.kenekId = null;
  }

  // Validate references if being updated
  if (req.body.pengirimId || req.body.supirId || req.body.kendaraanId) {
    await validateReferences(req.body);
  }

  // Update pickup
  pickup = await Pickup.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate(populateFields);

  res.status(200).json({
    success: true,
    data: pickup,
  });
});

// @desc    Update pickup status
// @route   PUT /api/pickups/:id/status
// @access  Private
exports.updatePickupStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  // Validate status
  if (!["PENDING", "BERANGKAT", "SELESAI", "CANCELLED"].includes(status)) {
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

  // Check if user can update this pickup's status
  const isSupir = req.user._id.toString() === pickup.supirId.toString();
  const isAuthorized =
    req.user.role === "direktur" ||
    req.user.role === "manajerOperasional" ||
    req.user.role === "kepalaGudang" ||
    req.user.cabangId.toString() === pickup.cabangId.toString() ||
    isSupir;

  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message:
        "Anda tidak memiliki akses untuk mengubah status pengambilan ini",
    });
  }

  // If user is supir, they can only update to certain statuses
  if (isSupir && !["BERANGKAT", "SELESAI"].includes(status)) {
    return res.status(403).json({
      success: false,
      message:
        "Supir hanya dapat mengubah status menjadi Berangkat atau Selesai",
    });
  }

  // Update status and notes
  pickup.status = status;

  // Update timestamps based on status
  if (status === "BERANGKAT" && !pickup.waktuBerangkat) {
    pickup.waktuBerangkat = new Date();
  } else if (status === "SELESAI" && !pickup.waktuPulang) {
    pickup.waktuPulang = new Date();
  }

  // Only update notes if provided
  if (notes) {
    pickup.notes = notes;
  }

  await pickup.save();

  // Get fully populated pickup
  const updatedPickup = await Pickup.findById(req.params.id).populate(
    populateFields
  );

  res.status(200).json({
    success: true,
    data: updatedPickup,
  });
});

// @desc    Delete pickup
// @route   DELETE /api/pickups/:id
// @access  Private (Admin, Director, Operations Manager)
exports.deletePickup = asyncHandler(async (req, res) => {
  const pickup = await Pickup.findById(req.params.id);

  if (!pickup) {
    return res.status(404).json({
      success: false,
      message: "Pengambilan tidak ditemukan",
    });
  }

  // Check if user can delete this pickup
  if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional" &&
    req.user.cabangId.toString() !== pickup.cabangId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses untuk menghapus pengambilan ini",
    });
  }

  // Check if there are STTs associated with this pickup
  if (pickup.sttIds && pickup.sttIds.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Tidak dapat menghapus pengambilan yang memiliki STT terkait",
    });
  }

  // If pickup is from a request, update request status
  if (pickup.requestId) {
    await PickupRequest.findByIdAndUpdate(pickup.requestId, {
      status: "PENDING",
      pickupId: null,
    });
  }

  await pickup.deleteOne();

  res.status(200).json({
    success: true,
    message: "Pengambilan berhasil dihapus",
  });
});

// @desc    Add STT to pickup
// @route   PUT /api/pickups/:id/add-stt
// @access  Private
exports.addSTTToPickup = asyncHandler(async (req, res) => {
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

  // Check if user can update this pickup
  if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional" &&
    req.user.role !== "kepalaGudang" &&
    req.user.cabangId.toString() !== pickup.cabangId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses untuk mengubah pengambilan ini",
    });
  }

  // Validate STT exists
  const stt = await STT.findById(sttId);
  if (!stt) {
    return res.status(404).json({
      success: false,
      message: "STT tidak ditemukan",
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
      message: `STT sudah ada di pengambilan lain (${existingPickup.noPengambilan})`,
    });
  }

  // Check if STT already in this pickup
  if (pickup.sttIds.includes(sttId)) {
    return res.status(400).json({
      success: false,
      message: "STT sudah ada di pengambilan ini",
    });
  }

  // Add STT to pickup
  pickup.sttIds.push(sttId);
  await pickup.save();

  // Get fully populated pickup
  const updatedPickup = await Pickup.findById(req.params.id).populate(
    populateFields
  );

  res.status(200).json({
    success: true,
    data: updatedPickup,
  });
});

// @desc    Remove STT from pickup
// @route   PUT /api/pickups/:id/remove-stt
// @access  Private
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

  // Check if user can update this pickup
  if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional" &&
    req.user.role !== "kepalaGudang" &&
    req.user.cabangId.toString() !== pickup.cabangId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Anda tidak memiliki akses untuk mengubah pengambilan ini",
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

  // Get fully populated pickup
  const updatedPickup = await Pickup.findById(req.params.id).populate(
    populateFields
  );

  res.status(200).json({
    success: true,
    data: updatedPickup,
  });
});

// @desc    Get pickups by sender
// @route   GET /api/pickups/by-sender/:senderId
// @access  Private
exports.getPickupsBySender = asyncHandler(async (req, res) => {
  // Validate sender exists
  const sender = await Customer.findById(req.params.senderId);
  if (!sender) {
    return res.status(404).json({
      success: false,
      message: "Pengirim tidak ditemukan",
    });
  }

  // Build filter
  const filter = { pengirimId: req.params.senderId };

  // Filter by branch if not director or operations manager
  if (req.user.role !== "direktur" && req.user.role !== "manajerOperasional") {
    filter.cabangId = req.user.cabangId;
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const total = await Pickup.countDocuments(filter);

  // Get pickups
  const pickups = await Pickup.find(filter)
    .populate(populateFields)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  // Generate pagination data
  const pagination = paginationResult(page, limit, total);

  res.status(200).json({
    success: true,
    count: pickups.length,
    pagination,
    data: {
      data: pickups,
      total,
    },
  });
});

// @desc    Get pickups by driver
// @route   GET /api/pickups/by-driver/:driverId
// @access  Private
exports.getPickupsByDriver = asyncHandler(async (req, res) => {
  // Validate driver exists
  const driver = await User.findById(req.params.driverId);
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: "Supir tidak ditemukan",
    });
  }

  // Build filter
  const filter = { supirId: req.params.driverId };

  // Filter by branch if not director or operations manager
  if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional" &&
    req.user._id.toString() !== req.params.driverId
  ) {
    filter.cabangId = req.user.cabangId;
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const total = await Pickup.countDocuments(filter);

  // Get pickups
  const pickups = await Pickup.find(filter)
    .populate(populateFields)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  // Generate pagination data
  const pagination = paginationResult(page, limit, total);

  res.status(200).json({
    success: true,
    count: pickups.length,
    pagination,
    data: {
      data: pickups,
      total,
    },
  });
});

// @desc    Get today's pickups for dashboard
// @route   GET /api/pickups/today
// @access  Private
exports.getTodayPickups = asyncHandler(async (req, res) => {
  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Build filter
  const filter = {
    tanggal: {
      $gte: today,
      $lt: tomorrow,
    },
  };

  // Filter by branch if not director or operations manager
  if (req.query.cabangId) {
    filter.cabangId = req.query.cabangId;
  } else if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional"
  ) {
    filter.cabangId = req.user.cabangId;
  }

  // Get pickup counts by status
  const counts = await Pickup.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Format counts into object
  const statusCounts = {
    PENDING: 0,
    BERANGKAT: 0,
    SELESAI: 0,
    CANCELLED: 0,
    TOTAL: 0,
  };

  counts.forEach((item) => {
    statusCounts[item._id] = item.count;
    statusCounts.TOTAL += item.count;
  });

  // Get latest pickups for display
  const recentPickups = await Pickup.find(filter)
    .populate(populateFields)
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: {
      counts: statusCounts,
      recent: recentPickups,
    },
  });
});

// Helper function to validate references
const validateReferences = async (data) => {
  // Validate sender exists
  if (data.pengirimId) {
    const sender = await Customer.findById(data.pengirimId);
    if (!sender) {
      throw new ErrorResponse("Pengirim tidak ditemukan", 404);
    }

    // Validate sender is of correct type
    if (sender.tipe !== "pengirim" && sender.tipe !== "keduanya") {
      throw new ErrorResponse("Customer bukan pengirim", 400);
    }
  }

  // Validate driver exists
  if (data.supirId) {
    const driver = await User.findById(data.supirId);
    if (!driver) {
      throw new ErrorResponse("Supir tidak ditemukan", 404);
    }
  }

  // Validate kenekId if provided
  if (data.kenekId && data.kenekId !== "null" && data.kenekId !== "") {
    const kenek = await User.findById(data.kenekId);
    if (!kenek) {
      throw new ErrorResponse("Kenek tidak ditemukan", 404);
    }
  }

  // Validate vehicle exists
  if (data.kendaraanId) {
    const vehicle = await Vehicle.findById(data.kendaraanId);
    if (!vehicle) {
      throw new ErrorResponse("Kendaraan tidak ditemukan", 404);
    }
  }

  // Validate pickup request if provided
  if (data.requestId) {
    const request = await PickupRequest.findById(data.requestId);
    if (!request) {
      throw new ErrorResponse("Request pengambilan tidak ditemukan", 404);
    }

    // Check if request is already processed
    if (
      request.status === "FINISH" &&
      request.pickupId &&
      request.pickupId.toString() !== data._id?.toString()
    ) {
      throw new ErrorResponse("Request pengambilan sudah diproses", 400);
    }
  }
};
