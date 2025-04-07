// controllers/customerController.js
const Customer = require("../models/Customer");
const STT = require("../models/STT");
const Collection = require("../models/Collection");
const Pickup = require("../models/Pickup");
const { paginationResult } = require("../utils/helpers");

// @desc      Get all customers
// @route     GET /api/customers
// @access    Private
exports.getCustomers = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};

    if (req.query.tipe) {
      // Allow case-insensitive search for tipe
      filter.tipe = { $regex: new RegExp(`^${req.query.tipe}$`, "i") };
    }

    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }

    // Filter pencarian berdasarkan nama atau telepon
    if (req.query.search) {
      filter.$or = [
        { nama: { $regex: req.query.search, $options: "i" } },
        { telepon: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { perusahaan: { $regex: req.query.search, $options: "i" } },
        { alamat: { $regex: req.query.search, $options: "i" } },
        { kota: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Customer.countDocuments(filter);

    const pagination = paginationResult(page, limit, total);

    const customers = await Customer.find(filter)
      .populate("cabangId", "namaCabang")
      .populate("createdBy", "nama")
      .skip(startIndex)
      .limit(limit)
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: customers.length,
      pagination: pagination.pagination,
      total,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data pelanggan",
      error: error.message,
    });
  }
};

// @desc      Get single customer
// @route     GET /api/customers/:id
// @access    Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate("cabangId", "namaCabang")
      .populate("createdBy", "nama");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data pelanggan",
      error: error.message,
    });
  }
};

// @desc      Create new customer
// @route     POST /api/customers
// @access    Private
exports.createCustomer = async (req, res) => {
  try {
    // Set cabangId dan createdBy dari user yang login
    if (!req.body.cabangId) {
      req.body.cabangId = req.user.cabangId;
    }
    req.body.createdBy = req.user.id;

    // Normalisasi tipe customer ke lowercase
    if (req.body.tipe) {
      req.body.tipe = req.body.tipe.toLowerCase();
    }

    // Buat customer baru
    const customer = await Customer.create(req.body);

    // Populate data untuk response
    const populatedCustomer = await Customer.findById(customer._id)
      .populate("cabangId", "namaCabang")
      .populate("createdBy", "nama");

    res.status(201).json({
      success: true,
      data: populatedCustomer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal membuat pelanggan baru",
      error: error.message,
    });
  }
};

// @desc      Update customer
// @route     PUT /api/customers/:id
// @access    Private
exports.updateCustomer = async (req, res) => {
  try {
    console.log("Updating customer with ID:", req.params.id);
    console.log("Update data received:", req.body);
    
    // Create update data object
    const updateData = { ...req.body };
    
    // Ensure cabangId is properly handled
    if (updateData.cabangId) {
      console.log("Original cabangId:", updateData.cabangId);
      // Make sure it's a valid ObjectId string
      updateData.cabangId = updateData.cabangId.toString();
      console.log("Formatted cabangId for update:", updateData.cabangId);
    }
    
    // Find customer by ID and update
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate("cabangId", "namaCabang");
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan"
      });
    }
    
    console.log("Updated customer:", customer);
    
    res.status(200).json({
      success: true,
      message: "Pelanggan berhasil diperbarui",
      data: customer
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui pelanggan",
      error: error.message
    });
  }
};

// @desc      Delete customer
// @route     DELETE /api/customers/:id
// @access    Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    // Cek apakah customer memiliki data terkait
    // Cek apakah ada STT dengan customer sebagai pengirim atau penerima
    const hasSTTs = await STT.findOne({
      $or: [{ pengirimId: req.params.id }, { penerimaId: req.params.id }],
    });

    if (hasSTTs) {
      return res.status(400).json({
        success: false,
        message:
          "Tidak dapat menghapus pelanggan yang memiliki data pengiriman",
      });
    }

    // Cek penagihan
    const hasCollections = await Collection.findOne({
      pelangganId: req.params.id,
    });

    if (hasCollections) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus pelanggan yang memiliki data penagihan",
      });
    }

    // Cek pengambilan
    const hasPickups = await Pickup.findOne({
      pengirimId: req.params.id,
    });

    if (hasPickups) {
      return res.status(400).json({
        success: false,
        message:
          "Tidak dapat menghapus pelanggan yang memiliki data pengambilan",
      });
    }

    await customer.deleteOne();

    res.status(200).json({
      success: true,
      message: "Pelanggan berhasil dihapus",
      data: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pelanggan",
      error: error.message,
    });
  }
};

// @desc      Get senders (pelanggan with tipe pengirim atau keduanya)
// @route     GET /api/customers/senders
// @access    Private
exports.getSenders = async (req, res) => {
  try {
    // Filter untuk tipe pengirim atau keduanya (case insensitive)
    const filter = {
      tipe: { $in: [/^pengirim$/i, /^keduanya$/i] },
    };

    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }

    if (req.query.search) {
      filter.$or = [
        { nama: { $regex: req.query.search, $options: "i" } },
        { telepon: { $regex: req.query.search, $options: "i" } },
        { perusahaan: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const senders = await Customer.find(filter)
      .select("nama alamat telepon kota tipe perusahaan cabangId")
      .populate("cabangId", "namaCabang")
      .sort("nama");

    res.status(200).json({
      success: true,
      count: senders.length,
      data: senders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data pengirim",
      error: error.message,
    });
  }
};

// @desc      Get recipients (pelanggan with tipe penerima atau keduanya)
// @route     GET /api/customers/recipients
// @access    Private
exports.getRecipients = async (req, res) => {
  try {
    // Filter untuk tipe penerima atau keduanya (case insensitive)
    const filter = {
      tipe: { $in: [/^penerima$/i, /^keduanya$/i] },
    };

    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }

    if (req.query.search) {
      filter.$or = [
        { nama: { $regex: req.query.search, $options: "i" } },
        { telepon: { $regex: req.query.search, $options: "i" } },
        { perusahaan: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const recipients = await Customer.find(filter)
      .select("nama alamat telepon kota tipe perusahaan cabangId")
      .populate("cabangId", "namaCabang")
      .sort("nama");

    res.status(200).json({
      success: true,
      count: recipients.length,
      data: recipients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data penerima",
      error: error.message,
    });
  }
};

// @desc      Get customers by branch
// @route     GET /api/customers/by-branch/:branchId
// @access    Private
exports.getCustomersByBranch = async (req, res) => {
  try {
    const filter = { cabangId: req.params.branchId };

    // Filter tambahan jika ada
    if (req.query.tipe) {
      filter.tipe = { $regex: new RegExp(`^${req.query.tipe}$`, "i") };
    }

    if (req.query.search) {
      filter.$or = [
        { nama: { $regex: req.query.search, $options: "i" } },
        { telepon: { $regex: req.query.search, $options: "i" } },
        { perusahaan: { $regex: req.query.search, $options: "i" } },
        { alamat: { $regex: req.query.search, $options: "i" } },
        { kota: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(filter)
      .populate("cabangId", "namaCabang")
      .populate("createdBy", "nama")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data pelanggan",
      error: error.message,
    });
  }
};

// @desc      Get STTs by customer
// @route     GET /api/customers/:customerId/stts
// @access    Private
exports.getCustomerSTTs = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    // Cek apakah customer ada
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    // Cari STT dimana customer sebagai pengirim atau penerima
    const stts = await STT.find({
      $or: [{ pengirimId: customerId }, { penerimaId: customerId }],
    })
      .populate("cabangAsalId", "namaCabang")
      .populate("cabangTujuanId", "namaCabang")
      .populate("pengirimId", "nama")
      .populate("penerimaId", "nama")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: stts.length,
      data: stts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data STT pelanggan",
      error: error.message,
    });
  }
};

// @desc      Get Collections by customer
// @route     GET /api/customers/:customerId/collections
// @access    Private
exports.getCustomerCollections = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    // Cek apakah customer ada
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    // Cari penagihan untuk customer
    const collections = await Collection.find({
      pelangganId: customerId,
    })
      .populate("cabangId", "namaCabang")
      .populate("createdBy", "nama")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data penagihan pelanggan",
      error: error.message,
    });
  }
};

// @desc      Get Pickups by customer
// @route     GET /api/customers/:customerId/pickups
// @access    Private
exports.getCustomerPickups = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    // Cek apakah customer ada
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    // Cari pengambilan untuk customer
    const pickups = await Pickup.find({
      pengirimId: customerId,
    })
      .populate("cabangId", "namaCabang")
      .populate("supirId", "nama")
      .populate("kenekId", "nama")
      .populate("kendaraanId", "noPolisi namaKendaraan")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: pickups.length,
      data: pickups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan data pengambilan pelanggan",
      error: error.message,
    });
  }
};
