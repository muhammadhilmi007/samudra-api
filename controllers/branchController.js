const Branch = require("../models/Branch");
const Division = require("../models/Division");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const asyncHandler = require("../middlewares/asyncHandler");

// @desc      Get all branches
// @route     GET /api/branches
// @access    Private
exports.getBranches = asyncHandler(async (req, res) => {
  // Filter berdasarkan query
  const filter = {};

  if (req.query.divisiId) {
    filter.divisiId = req.query.divisiId;
  }

  const branches = await Branch.find(filter).populate("divisiId");

  res.status(200).json({
    success: true,
    count: branches.length,
    data: branches,
  });
});

// @desc      Get single branch
// @route     GET /api/branches/:id
// @access    Private
exports.getBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id).populate("divisiId");

  if (!branch) {
    return res.status(404).json({
      success: false,
      message: "Cabang tidak ditemukan",
    });
  }

  res.status(200).json({
    success: true,
    data: branch,
  });
});

// @desc      Create new branch
// @route     POST /api/branches
// @access    Private
exports.createBranch = asyncHandler(async (req, res) => {
  // Cek apakah divisi ada
  const division = await Division.findById(req.body.divisiId);

  if (!division) {
    return res.status(404).json({
      success: false,
      message: "Divisi tidak ditemukan",
    });
  }

  // Cek apakah nama cabang sudah ada
  const existingBranch = await Branch.findOne({
    namaCabang: req.body.namaCabang,
  });

  if (existingBranch) {
    return res.status(400).json({
      success: false,
      message: "Nama cabang sudah ada",
    });
  }

  // Persiapkan data cabang
  let branchData = { ...req.body };

  // Pastikan kontakPenanggungJawab sesuai format
  if (
    req.body["kontakPenanggungJawab.nama"] !== undefined ||
    req.body["kontakPenanggungJawab.telepon"] !== undefined ||
    req.body["kontakPenanggungJawab.email"] !== undefined
  ) {
    // Format dot notation ke bentuk nested object
    branchData.kontakPenanggungJawab = {
      nama: req.body["kontakPenanggungJawab.nama"] || "",
      telepon: req.body["kontakPenanggungJawab.telepon"] || "",
      email: req.body["kontakPenanggungJawab.email"] || "",
    };

    // Hapus properti dot notation
    delete branchData["kontakPenanggungJawab.nama"];
    delete branchData["kontakPenanggungJawab.telepon"];
    delete branchData["kontakPenanggungJawab.email"];
  }
  // Jika kontakPenanggungJawab tidak ada atau kosong, gunakan format default
  else if (!branchData.kontakPenanggungJawab) {
    branchData.kontakPenanggungJawab = {
      nama: "",
      telepon: "",
      email: "",
    };
  }

  // Log data yang akan disimpan untuk debugging
  console.log(
    "Creating branch with data:",
    JSON.stringify(branchData, null, 2)
  );

  try {
    const branch = await Branch.create(branchData);

    res.status(201).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error creating branch:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);

      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: messages,
      });
    }

    // Re-throw to global error handler
    throw error;
  }
});

// @desc      Get branches by division
// @route     GET /api/branches/by-division/:divisionId
// @access    Private
exports.getBranchesByDivision = asyncHandler(async (req, res) => {
  const divisionId = req.params.divisionId;

  // Validate if division exists
  const division = await Division.findById(divisionId);

  if (!division) {
    return res.status(404).json({
      success: false,
      message: "Divisi tidak ditemukan",
    });
  }

  const branches = await Branch.find({ divisiId: divisionId }).populate(
    "divisiId"
  );

  res.status(200).json({
    success: true,
    count: branches.length,
    data: branches,
  });
});

// @desc      Update branch
// @route     PUT /api/branches/:id
// @access    Private
exports.updateBranch = asyncHandler(async (req, res) => {
  // Cek apakah divisi ada jika divisiId diupdate
  if (req.body.divisiId) {
    const division = await Division.findById(req.body.divisiId);

    if (!division) {
      return res.status(404).json({
        success: false,
        message: "Divisi tidak ditemukan",
      });
    }
  }

  // Cek apakah nama cabang sudah ada (jika nama diubah)
  if (req.body.namaCabang) {
    const existingBranch = await Branch.findOne({
      namaCabang: req.body.namaCabang,
      _id: { $ne: req.params.id }, // Exclude current branch
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: "Nama cabang sudah ada",
      });
    }
  }

  // Persiapkan data cabang
  let branchData = { ...req.body };

  // Pastikan kontakPenanggungJawab sesuai format
  if (
    req.body["kontakPenanggungJawab.nama"] !== undefined ||
    req.body["kontakPenanggungJawab.telepon"] !== undefined ||
    req.body["kontakPenanggungJawab.email"] !== undefined
  ) {
    // Format dot notation ke bentuk nested object
    branchData.kontakPenanggungJawab = {
      nama: req.body["kontakPenanggungJawab.nama"] || "",
      telepon: req.body["kontakPenanggungJawab.telepon"] || "",
      email: req.body["kontakPenanggungJawab.email"] || "",
    };

    // Hapus properti dot notation
    delete branchData["kontakPenanggungJawab.nama"];
    delete branchData["kontakPenanggungJawab.telepon"];
    delete branchData["kontakPenanggungJawab.email"];
  }

  // Log data yang akan diupdate untuk debugging
  console.log(
    `Updating branch ${req.params.id} with data:`,
    JSON.stringify(branchData, null, 2)
  );

  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, branchData, {
      new: true, // Return updated document
      runValidators: true, // Run model validators
    }).populate("divisiId");

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Cabang tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error updating branch:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);

      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: messages,
      });
    }

    // Re-throw to global error handler
    throw error;
  }
});

// @desc      Delete branch
// @route     DELETE /api/branches/:id
// @access    Private
exports.deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    return res.status(404).json({
      success: false,
      message: "Cabang tidak ditemukan",
    });
  }

  // Cek apakah cabang memiliki data terkait
  // Cek pegawai
  const hasUsers = await User.findOne({ cabangId: req.params.id });

  if (hasUsers) {
    return res.status(400).json({
      success: false,
      message: "Tidak dapat menghapus cabang yang memiliki pegawai",
    });
  }

  // Cek kendaraan
  const hasVehicles = await Vehicle.findOne({ cabangId: req.params.id });

  if (hasVehicles) {
    return res.status(400).json({
      success: false,
      message: "Tidak dapat menghapus cabang yang memiliki kendaraan",
    });
  }

  await branch.deleteOne();

  res.status(200).json({
    success: true,
    message: "Cabang berhasil dihapus",
  });
});

// @desc      Get branch statistics
// @route     GET /api/branches/:id/stats
// @access    Private
exports.getBranchStats = asyncHandler(async (req, res) => {
  const branchId = req.params.id;

  // Cek apakah cabang ada
  const branch = await Branch.findById(branchId);

  if (!branch) {
    return res.status(404).json({
      success: false,
      message: "Cabang tidak ditemukan",
    });
  }

  // Hitung jumlah pegawai
  const employeeCount = await User.countDocuments({ cabangId: branchId });

  // Hitung jumlah kendaraan
  const vehicleCount = await Vehicle.countDocuments({ cabangId: branchId });

  // Hitung jumlah truck antar cabang
  const truckCount = await Vehicle.countDocuments({
    cabangId: branchId,
    tipe: "antar_cabang",
  });

  // Hitung jumlah kendaraan lansir
  const lansirCount = await Vehicle.countDocuments({
    cabangId: branchId,
    tipe: "lansir",
  });

  res.status(200).json({
    success: true,
    data: {
      employeeCount,
      vehicleCount,
      truckCount,
      lansirCount,
    },
  });
});
