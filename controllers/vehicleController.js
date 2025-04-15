// controllers/vehicleController.js
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const Branch = require("../models/Branch");
const { paginationResult } = require("../utils/helpers");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const asyncHandler = require("../middlewares/asyncHandler");

// Configure file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads/vehicles");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG and JPEG files are allowed"), false);
    }
  },
}).fields([
  { name: "fotoSupir", maxCount: 1 },
  { name: "fotoKTPSupir", maxCount: 1 },
  { name: "fotoKenek", maxCount: 1 },
  { name: "fotoKTPKenek", maxCount: 1 },
]);

// @desc      Get all vehicles
// @route     GET /api/vehicles
// @access    Private
exports.getVehicles = asyncHandler(async (req, res) => {
  // Filter based on query
  const filter = {};

  if (req.query.cabangId) {
    filter.cabangId = req.query.cabangId;
  }

  if (req.query.tipe) {
    filter.tipe = req.query.tipe.toLowerCase().replace(" ", "_");
  }

  if (req.query.grup) {
    filter.grup = req.query.grup;
  }

  if (req.query.search) {
    filter.$or = [
      { noPolisi: { $regex: req.query.search, $options: "i" } },
      { namaKendaraan: { $regex: req.query.search, $options: "i" } },
    ];
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const total = await Vehicle.countDocuments(filter);

  const pagination = paginationResult(page, limit, total);

  const vehicles = await Vehicle.find(filter)
    .populate("cabangId", "namaCabang")
    .populate("supirId", "nama")
    .populate("kenekId", "nama");

  res.status(200).json({
    success: true,
    count: vehicles.length,
    pagination: pagination.pagination,
    total,
    data: vehicles,
  });
});

// @desc      Get single vehicle
// @route     GET /api/vehicles/:id
// @access    Private
exports.getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id)
    .populate("cabangId", "namaCabang")
    .populate("supirId", "nama")
    .populate("kenekId", "nama");

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Kendaraan tidak ditemukan",
    });
  }

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

// @desc      Create new vehicle
// @route     POST /api/vehicles
// @access    Private
exports.createVehicle = asyncHandler(async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: `${err.message}`,
      });
    }

    // Check if number plate already exists
    const existingVehicle = await Vehicle.findOne({
      noPolisi: req.body.noPolisi,
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Nomor polisi sudah terdaftar",
      });
    }

    // Prepare vehicle data
    const vehicleData = {
      ...req.body,
      // Convert frontend form field to database field
      tipe: req.body.tipe === "Antar Cabang" ? "antar_cabang" : req.body.tipe,
    };

    // Add file paths if files were uploaded
    if (req.files) {
      if (req.files.fotoSupir) {
        vehicleData.fotoSupir = `/uploads/vehicles/${req.files.fotoSupir[0].filename}`;
      }
      if (req.files.fotoKTPSupir) {
        vehicleData.fotoKTPSupir = `/uploads/vehicles/${req.files.fotoKTPSupir[0].filename}`;
      }
      if (req.files.fotoKenek) {
        vehicleData.fotoKenek = `/uploads/vehicles/${req.files.fotoKenek[0].filename}`;
      }
      if (req.files.fotoKTPKenek) {
        vehicleData.fotoKTPKenek = `/uploads/vehicles/${req.files.fotoKTPKenek[0].filename}`;
      }
    }

    try {
      // Create new vehicle
      const vehicle = await Vehicle.create(vehicleData);

      // Populate data for response
      const populatedVehicle = await Vehicle.findById(vehicle._id)
        .populate("cabangId", "namaCabang")
        .populate("supirId", "nama")
        .populate("kenekId", "nama");

      res.status(201).json({
        success: true,
        data: populatedVehicle,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Gagal membuat kendaraan baru",
        error: error.message,
      });
    }
  });
});

// @desc      Update vehicle
// @route     PUT /api/vehicles/:id
// @access    Private
exports.updateVehicle = asyncHandler(async (req, res) => {
  // Find vehicle by id
  let vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Kendaraan tidak ditemukan",
    });
  }

  // Process the request body to handle empty or invalid ObjectId fields
  const updateData = { ...req.body };

  // Handle kenekId - if it's empty string or "all", set to null
  if (updateData.kenekId === "" || updateData.kenekId === "all") {
    updateData.kenekId = null;
  }

  // Update vehicle data with the processed data
  vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate([
    { path: "supirId", select: "nama jabatan" },
    { path: "kenekId", select: "nama jabatan" },
    { path: "cabangId", select: "namaCabang" },
  ]);

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

// @desc      Delete vehicle
// @route     DELETE /api/vehicles/:id
// @access    Private
exports.deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Kendaraan tidak ditemukan",
    });
  }

  // Check if vehicle is being used in other modules
  const Pickup = require("../models/Pickup");
  const Loading = require("../models/Loading");
  const Delivery = require("../models/Delivery");

  const hasPickup = await Pickup.findOne({ kendaraanId: req.params.id });
  const hasTruckQueue = await Loading.findOne({ truckId: req.params.id });
  const hasDelivery = await Delivery.findOne({ kendaraanId: req.params.id });

  if (hasPickup || hasTruckQueue || hasDelivery) {
    return res.status(400).json({
      success: false,
      message: "Tidak dapat menghapus kendaraan yang sedang digunakan",
    });
  }

  // Delete files if they exist
  if (vehicle.fotoSupir) {
    const photoPath = path.join(__dirname, "..", vehicle.fotoSupir);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }
  }

  if (vehicle.fotoKTPSupir) {
    const idPath = path.join(__dirname, "..", vehicle.fotoKTPSupir);
    if (fs.existsSync(idPath)) {
      fs.unlinkSync(idPath);
    }
  }

  if (vehicle.fotoKenek) {
    const photoPath = path.join(__dirname, "..", vehicle.fotoKenek);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }
  }

  if (vehicle.fotoKTPKenek) {
    const idPath = path.join(__dirname, "..", vehicle.fotoKTPKenek);
    if (fs.existsSync(idPath)) {
      fs.unlinkSync(idPath);
    }
  }

  await vehicle.deleteOne();

  res.status(200).json({
    success: true,
    message: "Kendaraan berhasil dihapus",
  });
});

// @desc      Upload vehicle photo (driver or helper)
// @route     POST /api/vehicles/:id/upload-photo
// @access    Private
exports.uploadVehiclePhoto = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Kendaraan tidak ditemukan",
    });
  }

  // Handle file upload with multer
  const uploadSingle = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
      if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"
      ) {
        cb(null, true);
      } else {
        cb(new Error("Only PNG, JPG and JPEG files are allowed"), false);
      }
    },
  }).single("photo");

  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Silakan pilih file untuk diunggah",
      });
    }

    // Get photo type from query params (driver or helper)
    const photoType = req.query.type;

    if (photoType !== "driver" && photoType !== "helper") {
      return res.status(400).json({
        success: false,
        message: "Tipe foto tidak valid",
      });
    }

    // Set the file path in the database
    const fieldName = photoType === "driver" ? "fotoSupir" : "fotoKenek";
    const filePath = `/uploads/vehicles/${req.file.filename}`;

    // Update vehicle with the new photo
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { [fieldName]: filePath },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedVehicle,
    });
  });
});

// @desc      Upload vehicle document (driver or helper ID card)
// @route     POST /api/vehicles/:id/upload-document
// @access    Private
exports.uploadVehicleDocument = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: "Kendaraan tidak ditemukan",
    });
  }

  // Handle file upload with multer
  const uploadSingle = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
      if (
        file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"
      ) {
        cb(null, true);
      } else {
        cb(new Error("Only PNG, JPG and JPEG files are allowed"), false);
      }
    },
  }).single("document");

  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Silakan pilih file untuk diunggah",
      });
    }

    // Get document type from query params (driverIDCard or helperIDCard)
    const documentType = req.query.type;

    if (documentType !== "driverIDCard" && documentType !== "helperIDCard") {
      return res.status(400).json({
        success: false,
        message: "Tipe dokumen tidak valid",
      });
    }

    // Set the file path in the database
    const fieldName =
      documentType === "driverIDCard" ? "fotoKTPSupir" : "fotoKTPKenek";
    const filePath = `/uploads/vehicles/${req.file.filename}`;

    // Update vehicle with the new document
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { [fieldName]: filePath },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedVehicle,
    });
  });
});

// @desc      Get delivery vehicles
// @route     GET /api/vehicles/delivery
// @access    Private
exports.getDeliveryVehicles = async (req, res) => {
  console.log("getDeliveryVehicles endpoint called");
  try {
    // Count all vehicles first to see what's available
    const totalVehicles = await Vehicle.countDocuments();
    console.log(`Total vehicles in database: ${totalVehicles}`);
    
    // TEMPORARY: Return all vehicles without filtering
    // This is just to make the dropdown work until proper data is available
    const vehicles = await Vehicle.find({})
      .populate("cabangId", "namaCabang")
      .populate("supirId", "nama")
      .populate("kenekId", "nama");

    console.log(`Found ${vehicles.length} vehicles (returning all vehicles temporarily)`);
    
    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    console.error("Error in getDeliveryVehicles:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data kendaraan pengiriman",
      error: error.message,
    });
  }
};