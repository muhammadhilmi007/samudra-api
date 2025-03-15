const STT = require('../models/STT');
const Branch = require('../models/Branch');
const Customer = require('../models/Customer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc      Get all STTs
// @route     GET /api/stt
// @access    Private
exports.getSTTs = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    if (req.query.cabangAsalId) {
      filter.cabangAsalId = req.query.cabangAsalId;
    }
    
    if (req.query.cabangTujuanId) {
      filter.cabangTujuanId = req.query.cabangTujuanId;
    }
    
    if (req.query.pengirimId) {
      filter.pengirimId = req.query.pengirimId;
    }
    
    if (req.query.penerimaId) {
      filter.penerimaId = req.query.penerimaId;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.paymentType) {
      filter.paymentType = req.query.paymentType;
    }
    
    if (req.query.noSTT) {
      filter.noSTT = new RegExp(req.query.noSTT, 'i');
    }
    
    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.createdAt = { $lte: new Date(req.query.endDate) };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await STT.countDocuments(filter);
    
    const stts = await STT.find(filter)
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('penerusId', 'namaPenerus')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    // Pagination result
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: stts.length,
      pagination,
      total,
      data: stts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data STT',
      error: error.message
    });
  }
};

// @desc      Get single STT
// @route     GET /api/stt/:id
// @access    Private
exports.getSTT = async (req, res) => {
  try {
    const stt = await STT.findById(req.params.id)
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama alamat telepon kota provinsi')
      .populate('penerimaId', 'nama alamat telepon kota provinsi')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('penerusId', 'namaPenerus');
    
    if (!stt) {
      return res.status(404).json({
        success: false,
        message: 'STT tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: stt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data STT',
      error: error.message
    });
  }
};

// @desc      Create new STT
// @route     POST /api/stt
// @access    Private
exports.createSTT = async (req, res) => {
  try {
    // Validasi data cabang
    const cabangAsal = await Branch.findById(req.body.cabangAsalId);
    if (!cabangAsal) {
      return res.status(404).json({
        success: false,
        message: 'Cabang asal tidak ditemukan'
      });
    }
    
    const cabangTujuan = await Branch.findById(req.body.cabangTujuanId);
    if (!cabangTujuan) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tujuan tidak ditemukan'
      });
    }
    
    // Validasi data pengirim dan penerima
    const pengirim = await Customer.findById(req.body.pengirimId);
    if (!pengirim) {
      return res.status(404).json({
        success: false,
        message: 'Pengirim tidak ditemukan'
      });
    }
    
    const penerima = await Customer.findById(req.body.penerimaId);
    if (!penerima) {
      return res.status(404).json({
        success: false,
        message: 'Penerima tidak ditemukan'
      });
    }
    
    // Set userId dan cabangId dari user yang login
    req.body.userId = req.user.id;
    req.body.cabangId = req.user.cabangId;
    
    // Hitung harga jika tidak diinput
    if (!req.body.harga && req.body.hargaPerKilo && req.body.berat) {
      req.body.harga = req.body.hargaPerKilo * req.body.berat;
    }
    
    const stt = await STT.create(req.body);
    
    // Populate data untuk response
    const populatedSTT = await STT.findById(stt._id)
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('penerusId', 'namaPenerus');
    
    res.status(201).json({
      success: true,
      data: populatedSTT
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat STT',
      error: error.message
    });
  }
};

// @desc      Update STT
// @route     PUT /api/stt/:id
// @access    Private
exports.updateSTT = async (req, res) => {
  try {
    // Validasi data jika diupdate
    if (req.body.cabangAsalId) {
      const cabangAsal = await Branch.findById(req.body.cabangAsalId);
      if (!cabangAsal) {
        return res.status(404).json({
          success: false,
          message: 'Cabang asal tidak ditemukan'
        });
      }
    }
    
    if (req.body.cabangTujuanId) {
      const cabangTujuan = await Branch.findById(req.body.cabangTujuanId);
      if (!cabangTujuan) {
        return res.status(404).json({
          success: false,
          message: 'Cabang tujuan tidak ditemukan'
        });
      }
    }
    
    if (req.body.pengirimId) {
      const pengirim = await Customer.findById(req.body.pengirimId);
      if (!pengirim) {
        return res.status(404).json({
          success: false,
          message: 'Pengirim tidak ditemukan'
        });
      }
    }
    
    if (req.body.penerimaId) {
      const penerima = await Customer.findById(req.body.penerimaId);
      if (!penerima) {
        return res.status(404).json({
          success: false,
          message: 'Penerima tidak ditemukan'
        });
      }
    }
    
    // Hitung harga jika perlu
    if (req.body.hargaPerKilo && req.body.berat) {
      req.body.harga = req.body.hargaPerKilo * req.body.berat;
    }
    
    const stt = await STT.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('penerusId', 'namaPenerus');
    
    if (!stt) {
      return res.status(404).json({
        success: false,
        message: 'STT tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: stt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate STT',
      error: error.message
    });
  }
};

// @desc      Update STT status
// @route     PUT /api/stt/:id/status
// @access    Private
exports.updateSTTStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    const stt = await STT.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang');
    
    if (!stt) {
      return res.status(404).json({
        success: false,
        message: 'STT tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: stt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status STT',
      error: error.message
    });
  }
};

// Add these methods to your sttController.js file

/**
 * @desc    Get STTs available for truck assignment
 * @route   GET /api/mobile/stt/truck-assignment
 * @access  Private (checker, kepala_gudang)
 */
exports.getSTTsForTruckAssignment = async (req, res, next) => {
  try {
    // Implement your logic here to fetch STTs that need to be assigned to trucks
    // For example:
    const stts = await STT.find({ status: 'ready_for_assignment' })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: stts.length,
      data: stts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Assign STT to a truck
 * @route   POST /api/mobile/stt/truck-assignment
 * @access  Private (checker, kepala_gudang)
 */
exports.assignSTTToTruck = async (req, res, next) => {
  try {
    const { sttId, truckId } = req.body;
    
    // Validate input
    if (!sttId || !truckId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both STT ID and truck ID'
      });
    }
    
    // Implement your logic to assign the STT to the truck
    // For example:
    const stt = await STT.findByIdAndUpdate(
      sttId,
      { 
        vehicle: truckId,
        status: 'assigned_to_truck',
        assignedAt: Date.now()
      },
      { new: true }
    );
    
    if (!stt) {
      return res.status(404).json({
        success: false,
        error: 'STT not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: stt
    });
  } catch (err) {
    next(err);
  }
};

// @desc      Generate PDF STT
// @route     GET /api/stt/generate-pdf/:id
// @access    Private
exports.generatePDF = async (req, res) => {
  try {
    const stt = await STT.findById(req.params.id)
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama alamat telepon kota provinsi')
      .populate('penerimaId', 'nama alamat telepon kota provinsi')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('penerusId', 'namaPenerus');
    
    if (!stt) {
      return res.status(404).json({
        success: false,
        message: 'STT tidak ditemukan'
      });
    }
    
    // Create a document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=STT-${stt.noSTT}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add logo and header
    // doc.image(path.join(__dirname, '../assets/logo.png'), 50, 45, { width: 50 })
    doc.fontSize(16).text('SAMUDRA EKSPEDISI', 50, 50);
    doc.fontSize(12).text('Surat Tanda Terima (STT)', 50, 70);
    doc.fontSize(10).text(`Nomor: ${stt.noSTT}`, 50, 90);
    
    // Add barcode
    doc.fontSize(10).text(`Barcode: ${stt.barcode}`, 350, 50);
    
    // Add horizontal line
    doc.moveTo(50, 110).lineTo(550, 110).stroke();
    
    // Add sender and recipient info
    doc.fontSize(12).text('Pengirim:', 50, 130);
    doc.fontSize(10).text(`Nama: ${stt.pengirimId.nama}`, 50, 150);
    doc.fontSize(10).text(`Alamat: ${stt.pengirimId.alamat}`, 50, 170);
    doc.fontSize(10).text(`Telepon: ${stt.pengirimId.telepon}`, 50, 190);
    doc.fontSize(10).text(`Kota: ${stt.pengirimId.kota}`, 50, 210);
    
    doc.fontSize(12).text('Penerima:', 300, 130);
    doc.fontSize(10).text(`Nama: ${stt.penerimaId.nama}`, 300, 150);
    doc.fontSize(10).text(`Alamat: ${stt.penerimaId.alamat}`, 300, 170);
    doc.fontSize(10).text(`Telepon: ${stt.penerimaId.telepon}`, 300, 190);
    doc.fontSize(10).text(`Kota: ${stt.penerimaId.kota}`, 300, 210);
    
    // Add package info
    doc.fontSize(12).text('Informasi Pengiriman:', 50, 240);
    doc.fontSize(10).text(`Cabang Asal: ${stt.cabangAsalId.namaCabang}`, 50, 260);
    doc.fontSize(10).text(`Cabang Tujuan: ${stt.cabangTujuanId.namaCabang}`, 50, 280);
    doc.fontSize(10).text(`Nama Barang: ${stt.namaBarang}`, 50, 300);
    doc.fontSize(10).text(`Komoditi: ${stt.komoditi}`, 50, 320);
    doc.fontSize(10).text(`Packing: ${stt.packing}`, 50, 340);
    doc.fontSize(10).text(`Jumlah Colly: ${stt.jumlahColly}`, 50, 360);
    doc.fontSize(10).text(`Berat: ${stt.berat} kg`, 50, 380);
    
    // Add payment info
    doc.fontSize(12).text('Informasi Pembayaran:', 300, 240);
    doc.fontSize(10).text(`Harga Per Kilo: Rp ${stt.hargaPerKilo.toLocaleString()}`, 300, 260);
    doc.fontSize(10).text(`Total Harga: Rp ${stt.harga.toLocaleString()}`, 300, 280);
    doc.fontSize(10).text(`Metode Pembayaran: ${stt.paymentType}`, 300, 300);
    
    if (stt.kodePenerus !== '70') {
      doc.fontSize(10).text(`Kode Penerus: ${stt.kodePenerus}`, 300, 320);
      if (stt.penerusId) {
        doc.fontSize(10).text(`Penerus: ${stt.penerusId.namaPenerus}`, 300, 340);
      }
    }
    
    if (stt.keterangan) {
      doc.fontSize(10).text(`Keterangan: ${stt.keterangan}`, 300, 360);
    }
    
    // Add signature section
    doc.fontSize(10).text('Petugas', 100, 450);
    doc.fontSize(10).text('Pengirim', 300, 450);
    doc.fontSize(10).text('Penerima', 500, 450);
    
    // Add lines for signatures
    doc.moveTo(50, 500).lineTo(150, 500).stroke();
    doc.moveTo(250, 500).lineTo(350, 500).stroke();
    doc.moveTo(450, 500).lineTo(550, 500).stroke();
    
    // Add footer
    doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 550);
    doc.fontSize(8).text('Samudra Ekspedisi - Solusi Pengiriman Terpercaya', 50, 570);
    
    // Finalize PDF
    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal generate PDF STT',
      error: error.message
    });
  }
};

// @desc      Track STT by number
// @route     GET /api/stt/track/:sttNumber
// @access    Public
exports.trackSTT = async (req, res) => {
  try {
    const stt = await STT.findOne({ noSTT: req.params.sttNumber })
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .select('noSTT status createdAt cabangAsalId cabangTujuanId pengirimId penerimaId namaBarang');
    
    if (!stt) {
      return res.status(404).json({
        success: false,
        message: 'STT tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: stt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal melacak STT',
      error: error.message
    });
  }
};

// @desc      Get STTs by branch
// @route     GET /api/stt/by-branch/:branchId
// @access    Private
exports.getSTTsByBranch = async (req, res) => {
  try {
    const stts = await STT.find({
      $or: [
        { cabangAsalId: req.params.branchId },
        { cabangTujuanId: req.params.branchId }
      ]
    })
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: stts.length,
      data: stts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data STT',
      error: error.message
    });
  }
};

// @desc      Get STTs by status
// @route     GET /api/stt/by-status/:status
// @access    Private
exports.getSTTsByStatus = async (req, res) => {
  try {
    // Filter berdasarkan cabang user jika bukan direktur
    const filter = { status: req.params.status };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      filter.cabangId = req.user.cabangId;
    }
    
    const stts = await STT.find(filter)
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: stts.length,
      data: stts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data STT',
      error: error.message
    });
  }
};