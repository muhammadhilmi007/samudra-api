const Pickup = require("../models/Pickup");
const PickupRequest = require("../models/PickupRequest");
const Vehicle = require("../models/Vehicle");
const Customer = require("../models/Customer");
const STT = require("../models/STT");
const { paginationResult } = require("../utils/helpers");
const asyncHandler = require("../middlewares/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const {
  validateSTTOperation,
  syncSTTStatus,
} = require("../middlewares/sttMiddleware");

// Define populate fields for reuse
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

// @desc      Get all pickups with advanced filtering
// @route     GET /api/pickups
// @access    Private
exports.getPickups = asyncHandler(async (req, res) => {
  // Build filter object based on query parameters
  const filter = {};

  // Branch filter - only show pickups for admin's branch unless they're director or operations manager
  if (req.query.cabangId) {
    filter.cabangId = req.query.cabangId;
  } else if (
    req.user.role !== "direktur" &&
    req.user.role !== "manajerOperasional"
  ) {
    filter.cabangId = req.user.cabangId;
  }

  // Filter by sender
  if (req.query.pengirimId) {
    filter.pengirimId = req.query.pengirimId;
  }

  // Filter by driver
  if (req.query.supirId) {
    filter.supirId = req.query.supirId;
  }

  // Filter by vehicle
  if (req.query.kendaraanId) {
    filter.kendaraanId = req.query.kendaraanId;
  }

  // Filter by status
  if (req.query.status) {
    filter.status = req.query.status;
  }

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
    ];

    // Add customer IDs to the search
    if (customerIds.length > 0) {
      filter.$or.push({ pengirimId: { $in: customerIds } });
    }
  }

  // Date range filter - improved naming for clarity
  if (req.query.startDate && req.query.endDate) {
    filter.tanggal = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate + "T23:59:59.999Z"), // Include the entire end date
    };
  } else if (req.query.startDate) {
    filter.tanggal = { $gte: new Date(req.query.startDate) };
  } else if (req.query.endDate) {
    filter.tanggal = { $lte: new Date(req.query.endDate + "T23:59:59.999Z") };
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const total = await Pickup.countDocuments(filter);

  // Build sort object
  let sort = { createdAt: -1 }; // Default sort
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith("-")
      ? req.query.sort.substring(1)
      : req.query.sort;
    const sortDirection = req.query.sort.startsWith("-") ? -1 : 1;
    sort = { [sortField]: sortDirection };
  }

  // Calculate pagination
  const pagination = paginationResult(page, limit, total);

  // Execute query with all filters
  const pickups = await Pickup.find(filter)
    .populate(populateFields)
    .skip(startIndex)
    .limit(limit)
    .sort(sort);

  res.status(200).json({
    success: true,
    count: pickups.length,
    pagination: pagination.pagination,
    total,
    data: pickups,
  });
});

// @desc      Get single pickup with full details
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
      "noSTT namaBarang jumlahColly berat harga paymentType status createdAt"
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

// Validation helper
const validatePickupData = async (data) => {
  const errors = [];

  // Required fields validation with specific messages
  if (!data.pengirimId) errors.push("Pengirim harus diisi");
  if (!data.kendaraanId) errors.push("Kendaraan harus diisi");
  if (!data.supirId) errors.push("Supir harus diisi");
  if (!data.alamatPengambilan) errors.push("Alamat pengambilan harus diisi");
  if (!data.tujuan) errors.push("Tujuan harus diisi");
  if (!data.jumlahColly) errors.push("Jumlah colly harus diisi");

  // Field length validation
  if (data.alamatPengambilan && data.alamatPengambilan.length < 10)
    errors.push("Alamat pengambilan minimal 10 karakter");
  if (data.alamatPengambilan && data.alamatPengambilan.length > 500)
    errors.push("Alamat pengambilan maksimal 500 karakter");
  if (data.tujuan && data.tujuan.length < 3)
    errors.push("Tujuan minimal 3 karakter");
  if (data.tujuan && data.tujuan.length > 200)
    errors.push("Tujuan maksimal 200 karakter");
  if (data.notes && data.notes.length > 1000)
    errors.push("Catatan maksimal 1000 karakter");

  // Numeric validation
  if (data.jumlahColly) {
    const colly = parseInt(data.jumlahColly);
    if (isNaN(colly) || colly <= 0)
      errors.push("Jumlah colly harus lebih dari 0");
    if (colly > 1000) errors.push("Jumlah colly maksimal 1000");
  }

  // Date validation
  if (data.estimasiPengambilan) {
    const estimasi = new Date(data.estimasiPengambilan);
    if (estimasi < new Date())
      errors.push("Estimasi pengambilan harus lebih dari waktu sekarang");
  }

  // Relationship validations
  if (data.pengirimId) {
    const pengirim = await Customer.findById(data.pengirimId);
    if (!pengirim) errors.push("Pengirim tidak ditemukan");
  }

  if (data.kendaraanId) {
    const kendaraan = await Vehicle.findById(data.kendaraanId);
    if (!kendaraan) errors.push("Kendaraan tidak ditemukan");

    // Check if vehicle is available
    const existingPickup = await Pickup.findOne({
      kendaraanId: data.kendaraanId,
      status: { $in: ["PENDING", "BERANGKAT"] },
      _id: { $ne: data._id }, // Exclude current pickup when updating
    });
    if (existingPickup)
      errors.push("Kendaraan sedang digunakan dalam pengambilan lain");
  }

  if (data.supirId) {
    const supir = await User.findById(data.supirId);
    if (!supir) errors.push("Supir tidak ditemukan");

    // Check if driver is available
    const existingPickup = await Pickup.findOne({
      supirId: data.supirId,
      status: { $in: ["PENDING", "BERANGKAT"] },
      _id: { $ne: data._id }, // Exclude current pickup when updating
    });
    if (existingPickup)
      errors.push("Supir sedang bertugas dalam pengambilan lain");
  }

  return errors;
};

// @desc      Create new pickup
// @route     POST /api/pickups
// @access    Private
exports.createPickup = asyncHandler(async (req, res) => {
  // Validate data
  const validationErrors = await validatePickupData(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validasi gagal",
      errors: validationErrors,
    });
  }

  // Get branch ID from authenticated user
  req.body.cabangId = req.user.cabangId;
  req.body.userId = req.user._id;

  // Generate pickup number
  const date = new Date();
  const branch = await Branch.findById(req.user.cabangId);
  const branchCode = branch
    ? branch.namaCabang.substring(0, 3).toUpperCase()
    : "XXX";

  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const dateString = `${day}${month}${year}`;

  // Find the latest pickup for this branch today
  const latestPickup = await Pickup.findOne({
    noPengambilan: new RegExp(`PKP-${branchCode}-${dateString}-`),
  }).sort({ noPengambilan: -1 });

  let sequence = 1;
  if (latestPickup && latestPickup.noPengambilan) {
    const parts = latestPickup.noPengambilan.split("-");
    if (parts.length === 4) {
      sequence = parseInt(parts[3], 10) + 1;
    }
  }

  const sequenceString = sequence.toString().padStart(4, "0");
  req.body.noPengambilan = `PKP-${branchCode}-${dateString}-${sequenceString}`;

  // Set default status if not provided
  if (!req.body.status) {
    req.body.status = "PENDING";
  }

  // Set default tanggal if not provided
  if (!req.body.tanggal) {
    req.body.tanggal = new Date();
  }

  // Create pickup
  const pickup = await Pickup.create(req.body);

  // If created from request, update request status
  if (req.body.requestId) {
    await PickupRequest.findByIdAndUpdate(req.body.requestId, {
      status: "FINISH",
      pickupId: pickup._id,
    });
  }

  // Return the newly created pickup with populated fields
  const populatedPickup = await Pickup.findById(pickup._id).populate(
    populateFields
  );

  res.status(201).json({
    success: true,
    data: populatedPickup,
  });
});

// @desc      Update pickup status with validation
// @route     PUT /api/pickups/:id/status
// @access    Private
exports.updatePickupStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  // Validate status
  if (!["PENDING", "BERANGKAT", "SELESAI", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status tidak valid",
    });
  }

  // Find pickup with populated fields for validation
  const pickup = await Pickup.findById(req.params.id)
    .populate(populateFields)
    .populate({
      path: "sttIds",
      select: "noSTT status createdAt",
    });

  if (!pickup) {
    return res.status(404).json({
      success: false,
      message: "Pengambilan tidak ditemukan",
    });
  }

  // Validate status transitions
  const validTransitions = {
    PENDING: ["BERANGKAT", "CANCELLED"],
    BERANGKAT: ["SELESAI", "CANCELLED"],
    SELESAI: ["CANCELLED"],
    CANCELLED: ["PENDING"],
  };

  if (!validTransitions[pickup.status]?.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Tidak dapat mengubah status dari ${pickup.status} ke ${status}`,
    });
  }

  // Additional validations based on status
  if (status === "BERANGKAT") {
    // Validate vehicle and driver availability
    const activePickup = await Pickup.findOne({
      _id: { $ne: pickup._id },
      $or: [
        { kendaraanId: pickup.kendaraanId, status: "BERANGKAT" },
        { supirId: pickup.supirId, status: "BERANGKAT" },
      ],
    });

    if (activePickup) {
      return res.status(400).json({
        success: false,
        message: activePickup.kendaraanId.equals(pickup.kendaraanId)
          ? "Kendaraan sedang digunakan dalam pengambilan lain"
          : "Supir sedang bertugas dalam pengambilan lain",
      });
    }
  }

  if (status === "SELESAI") {
    // Validate STTs
    if (!pickup.sttIds?.length) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menyelesaikan pengambilan tanpa STT",
      });
    }

    // Check if all STTs are in valid status
    const pendingStts = pickup.sttIds.filter(
      (stt) => !["SELESAI", "DITERIMA"].includes(stt.status)
    );

    if (pendingStts.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Terdapat ${pendingStts.length} STT yang belum selesai`,
      });
    }
  }

  if (status === "CANCELLED" && !notes) {
    return res.status(400).json({
      success: false,
      message: "Alasan pembatalan harus diisi",
    });
  }

  // Create status history entry
  const statusHistory = {
    status,
    timestamp: new Date(),
    userId: req.user._id,
    notes: notes || undefined,
  };

  // Update pickup
  pickup.status = status;
  pickup.statusHistory = pickup.statusHistory || [];
  pickup.statusHistory.push(statusHistory);

  if (notes) {
    pickup.notes = notes;
  }

  // Set timestamps and update related data
  if (status === "BERANGKAT") {
    pickup.waktuBerangkat = new Date();
    await Vehicle.findByIdAndUpdate(pickup.kendaraanId, {
      status: "DIGUNAKAN",
    });
  } else if (status === "SELESAI") {
    pickup.waktuPulang = new Date();
    await Vehicle.findByIdAndUpdate(pickup.kendaraanId, { status: "TERSEDIA" });
  } else if (status === "CANCELLED") {
    await Vehicle.findByIdAndUpdate(pickup.kendaraanId, { status: "TERSEDIA" });
  }

  await pickup.save();

  // Return updated pickup with populated fields
  const updatedPickup = await Pickup.findById(pickup._id)
    .populate(populateFields)
    .populate({
      path: "statusHistory.userId",
      select: "nama",
    });

  res.status(200).json({
    success: true,
    data: updatedPickup,
  });
});

// @desc      Update pickup details
// @route     PUT /api/pickups/:id
// @access    Private
exports.updatePickup = asyncHandler(async (req, res) => {
  // Don't allow changing the noPengambilan
  if (req.body.noPengambilan) {
    delete req.body.noPengambilan;
  }

  // Validate relationships if being updated
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

  if (req.body.supirId) {
    const supir = await User.findById(req.body.supirId);
    if (!supir) {
      return res.status(404).json({
        success: false,
        message: "Supir tidak ditemukan",
      });
    }
  }

  // Update the pickup
  const pickup = await Pickup.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate(populateFields);

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

// @desc      Delete pickup with validation
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

  // Check if status is appropriate for deletion
  if (pickup.status !== "PENDING" && pickup.status !== "CANCELLED") {
    return res.status(400).json({
      success: false,
      message:
        "Hanya pengambilan dengan status PENDING atau CANCELLED yang dapat dihapus",
    });
  }

  await pickup.deleteOne();

  res.status(200).json({
    success: true,
    message: "Pengambilan berhasil dihapus",
    data: {},
  });
});

// @desc      Add STT to pickup
// @route     PUT /api/pickups/:id/add-stt
// @access    Private
// STT-related controller functions
exports.addSTTToPickup = [
  validateSTTOperation,
  syncSTTStatus,
  asyncHandler(async (req, res) => {
    const pickup = req.pickup; // Already validated by middleware
    const { sttIds } = req.body;

    // Add STTs to pickup
    pickup.sttIds = [...new Set([...pickup.sttIds, ...sttIds])];

    // Update STT statuses
    await STT.updateMany(
      { _id: { $in: sttIds } },
      {
        $set: {
          pickupId: pickup._id,
          status: pickup.status === "BERANGKAT" ? "PROSES" : "PENDING",
          lastUpdated: new Date(),
          lastUpdatedBy: req.user._id,
        },
      }
    );

    await pickup.save();

    // Return updated pickup with populated fields
    const populatedPickup = await Pickup.findById(pickup._id)
      .populate(populateFields)
      .populate({
        path: "sttIds",
        select:
          "noSTT status createdAt namaBarang jumlahColly berat harga paymentType",
      });

    res.status(200).json({
      success: true,
      data: populatedPickup,
    });
  }),
];

// @desc      Remove STT from pickup
// @route     PUT /api/pickups/:id/remove-stt
// @access    Private
exports.removeSTTFromPickup = [
  validateSTTOperation,
  asyncHandler(async (req, res) => {
    const pickup = req.pickup; // Already validated by middleware
    const { sttId } = req.body;

    if (!sttId) {
      return res.status(400).json({
        success: false,
        message: "STT ID harus diisi",
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

    // Update STT status
    await STT.findByIdAndUpdate(sttId, {
      $set: {
        pickupId: null,
        status: "PENDING",
        lastUpdated: new Date(),
        lastUpdatedBy: req.user._id,
      },
    });

    await pickup.save();

    // Return updated pickup with populated fields
    const populatedPickup = await Pickup.findById(pickup._id)
      .populate(populateFields)
      .populate({
        path: "sttIds",
        select:
          "noSTT status createdAt namaBarang jumlahColly berat harga paymentType",
      });

    res.status(200).json({
      success: true,
      data: populatedPickup,
    });
  }),
];

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
