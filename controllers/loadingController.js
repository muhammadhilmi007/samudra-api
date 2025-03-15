const Loading = require('../models/Loading');
const STT = require('../models/STT');
const TruckQueue = require('../models/TruckQueue');
const Branch = require('../models/Branch');
const { paginationResult } = require('../utils/helpers');
const PDFDocument = require('pdfkit');
const config = require('../config/config');

// @desc      Get all loadings
// @route     GET /api/loadings
// @access    Private
exports.getLoadings = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangMuatId) {
      filter.cabangMuatId = req.query.cabangMuatId;
    }
    
    if (req.query.cabangBongkarId) {
      filter.cabangBongkarId = req.query.cabangBongkarId;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.antrianTruckId) {
      filter.antrianTruckId = req.query.antrianTruckId;
    }
    
    if (req.query.checkerId) {
      filter.checkerId = req.query.checkerId;
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
    const total = await Loading.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const loadings = await Loading.find(filter)
      .populate('cabangMuatId', 'namaCabang')
      .populate('cabangBongkarId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate({
        path: 'antrianTruckId',
        populate: {
          path: 'truckId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: loadings.length,
      pagination: pagination.pagination,
      total,
      data: loadings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data muat',
      error: error.message
    });
  }
};

// @desc      Get single loading
// @route     GET /api/loadings/:id
// @access    Private
exports.getLoading = async (req, res) => {
  try {
    const loading = await Loading.findById(req.params.id)
      .populate('cabangMuatId', 'namaCabang')
      .populate('cabangBongkarId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate({
        path: 'antrianTruckId',
        populate: [
          {
            path: 'truckId',
            select: 'noPolisi namaKendaraan'
          },
          {
            path: 'supirId',
            select: 'nama noTeleponSupir'
          },
          {
            path: 'kenekId',
            select: 'nama noTeleponKenek'
          }
        ]
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga paymentType pengirimId penerimaId cabangAsalId cabangTujuanId');
    
    if (!loading) {
      return res.status(404).json({
        success: false,
        message: 'Data muat tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: loading
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data muat',
      error: error.message
    });
  }
};

// @desc      Create new loading
// @route     POST /api/loadings
// @access    Private
exports.createLoading = async (req, res) => {
  try {
    // Validasi data
    if (!req.body.cabangMuatId) {
      return res.status(400).json({
        success: false,
        message: 'Cabang muat harus diisi'
      });
    }
    
    if (!req.body.cabangBongkarId) {
      return res.status(400).json({
        success: false,
        message: 'Cabang bongkar harus diisi'
      });
    }
    
    if (!req.body.antrianTruckId) {
      return res.status(400).json({
        success: false,
        message: 'Antrian truck harus diisi'
      });
    }
    
    if (!req.body.checkerId) {
      return res.status(400).json({
        success: false,
        message: 'Checker harus diisi'
      });
    }
    
    if (!req.body.sttIds || !Array.isArray(req.body.sttIds) || req.body.sttIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'STT harus diisi'
      });
    }
    
    // Validasi cabang
    const cabangMuat = await Branch.findById(req.body.cabangMuatId);
    if (!cabangMuat) {
      return res.status(404).json({
        success: false,
        message: 'Cabang muat tidak ditemukan'
      });
    }
    
    const cabangBongkar = await Branch.findById(req.body.cabangBongkarId);
    if (!cabangBongkar) {
      return res.status(404).json({
        success: false,
        message: 'Cabang bongkar tidak ditemukan'
      });
    }
    
    // Validasi antrian truck
    const antrianTruck = await TruckQueue.findById(req.body.antrianTruckId);
    if (!antrianTruck) {
      return res.status(404).json({
        success: false,
        message: 'Antrian truck tidak ditemukan'
      });
    }
    
    // Cek apakah antrian truck sudah digunakan
    const existingLoading = await Loading.findOne({
      antrianTruckId: req.body.antrianTruckId,
      status: { $in: ['MUAT', 'BERANGKAT'] }
    });
    
    if (existingLoading) {
      return res.status(400).json({
        success: false,
        message: 'Antrian truck sudah digunakan di muat lain'
      });
    }
    
    // Validasi STT
    for (const sttId of req.body.sttIds) {
      const stt = await STT.findById(sttId);
      
      if (!stt) {
        return res.status(404).json({
          success: false,
          message: `STT dengan ID ${sttId} tidak ditemukan`
        });
      }
      
      // Cek apakah STT sudah dimuat
      if (stt.status === 'MUAT' || stt.status === 'TRANSIT') {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} sudah dimuat`
        });
      }
      
      // Cek apakah cabang tujuan STT sesuai dengan cabang bongkar
      if (stt.cabangTujuanId.toString() !== req.body.cabangBongkarId) {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} memiliki cabang tujuan yang berbeda dengan cabang bongkar`
        });
      }
    }
    
    // Generate ID muat
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Loading.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    }) + 1;
    
    const idMuat = `M${dateString}${count.toString().padStart(4, '0')}`;
    req.body.idMuat = idMuat;
    
    // Set status default
    req.body.status = 'MUAT';
    
    // Buat loading baru
    const loading = await Loading.create(req.body);
    
    // Update status STT menjadi MUAT
    for (const sttId of req.body.sttIds) {
      await STT.findByIdAndUpdate(sttId, { status: 'MUAT' });
    }
    
    // Update status antrian truck menjadi MUAT
    await TruckQueue.findByIdAndUpdate(req.body.antrianTruckId, { status: 'MUAT' });
    
    // Populate data untuk response
    const populatedLoading = await Loading.findById(loading._id)
      .populate('cabangMuatId', 'namaCabang')
      .populate('cabangBongkarId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate({
        path: 'antrianTruckId',
        populate: {
          path: 'truckId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga');
    
    res.status(201).json({
      success: true,
      data: populatedLoading
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat data muat baru',
      error: error.message
    });
  }
};

// @desc      Update loading
// @route     PUT /api/loadings/:id
// @access    Private
exports.updateLoading = async (req, res) => {
  try {
    const loading = await Loading.findById(req.params.id);
    
    if (!loading) {
      return res.status(404).json({
        success: false,
        message: 'Data muat tidak ditemukan'
      });
    }
    
    // Validasi jika status diubah
    if (req.body.status && req.body.status !== loading.status) {
      // Jika status diubah menjadi BERANGKAT
      if (req.body.status === 'BERANGKAT') {
        if (!req.body.waktuBerangkat) {
          req.body.waktuBerangkat = new Date();
        }
        
        // Update status antrian truck menjadi BERANGKAT
        await TruckQueue.findByIdAndUpdate(loading.antrianTruckId, { status: 'BERANGKAT' });
        
        // Update status STT menjadi TRANSIT
        for (const sttId of loading.sttIds) {
          await STT.findByIdAndUpdate(sttId, { status: 'TRANSIT' });
        }
      }
      
      // Jika status diubah menjadi SAMPAI
      if (req.body.status === 'SAMPAI') {
        if (!req.body.waktuSampai) {
          req.body.waktuSampai = new Date();
        }
        
        // Cek status sebelumnya harus BERANGKAT
        if (loading.status !== 'BERANGKAT') {
          return res.status(400).json({
            success: false,
            message: 'Status harus BERANGKAT sebelum diubah menjadi SAMPAI'
          });
        }
      }
    }
    
    // Update loading
    const updatedLoading = await Loading.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangMuatId', 'namaCabang')
      .populate('cabangBongkarId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate({
        path: 'antrianTruckId',
        populate: {
          path: 'truckId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga');
    
    res.status(200).json({
      success: true,
      data: updatedLoading
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate data muat',
      error: error.message
    });
  }
};

// @desc      Update loading status
// @route     PUT /api/loadings/:id/status
// @access    Private
exports.updateLoadingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    if (!['MUAT', 'BERANGKAT', 'SAMPAI'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const loading = await Loading.findById(req.params.id);
    
    if (!loading) {
      return res.status(404).json({
        success: false,
        message: 'Data muat tidak ditemukan'
      });
    }
    
    // Data tambahan berdasarkan status
    const updateData = { status };
    
    // Jika status BERANGKAT, update waktuBerangkat
    if (status === 'BERANGKAT') {
      updateData.waktuBerangkat = new Date();
      
      // Update status antrian truck menjadi BERANGKAT
      await TruckQueue.findByIdAndUpdate(loading.antrianTruckId, { status: 'BERANGKAT' });
      
      // Update status STT menjadi TRANSIT
      for (const sttId of loading.sttIds) {
        await STT.findByIdAndUpdate(sttId, { status: 'TRANSIT' });
      }
    }
    
    // Jika status SAMPAI, update waktuSampai
    if (status === 'SAMPAI') {
      // Cek status sebelumnya harus BERANGKAT
      if (loading.status !== 'BERANGKAT') {
        return res.status(400).json({
          success: false,
          message: 'Status harus BERANGKAT sebelum diubah menjadi SAMPAI'
        });
      }
      
      updateData.waktuSampai = new Date();
    }
    
    // Update loading
    const updatedLoading = await Loading.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangMuatId', 'namaCabang')
      .populate('cabangBongkarId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate({
        path: 'antrianTruckId',
        populate: {
          path: 'truckId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga');
    
    res.status(200).json({
      success: true,
      data: updatedLoading
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status muat',
      error: error.message
    });
  }
};

// @desc      Get loadings by STT
// @route     GET /api/loadings/by-stt/:sttId
// @access    Private
exports.getLoadingsBySTT = async (req, res) => {
  try {
    const loadings = await Loading.find({
      sttIds: req.params.sttId
    })
      .populate('cabangMuatId', 'namaCabang')
      .populate('cabangBongkarId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate({
        path: 'antrianTruckId',
        populate: {
          path: 'truckId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: loadings.length,
      data: loadings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data muat',
      error: error.message
    });
  }
};

// @desc      Get loadings by truck
// @route     GET /api/loadings/by-truck/:truckId
// @access    Private
exports.getLoadingsByTruck = async (req, res) => {
  try {
    // Cari semua antrian truck dengan truckId yang diberikan
    const truckQueues = await TruckQueue.find({ truckId: req.params.truckId });
    const truckQueueIds = truckQueues.map(queue => queue._id);
    
    // Cari semua loading dengan antrianTruckId yang ada di truckQueueIds
    const loadings = await Loading.find({
      antrianTruckId: { $in: truckQueueIds }
    })
      .populate('cabangMuatId', 'namaCabang')
      .populate('cabangBongkarId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate({
        path: 'antrianTruckId',
        populate: {
          path: 'truckId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: loadings.length,
      data: loadings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data muat',
      error: error.message
    });
  }
};

// @desc      Generate loading manifest PDF (DMB)
// @route     GET /api/loadings/generate-dmb/:id
// @access    Private
exports.generateDMB = async (req, res) => {
  try {
    const loading = await Loading.findById(req.params.id)
      .populate('cabangMuatId', 'namaCabang')
      .populate('cabangBongkarId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate({
        path: 'antrianTruckId',
        populate: [
          {
            path: 'truckId',
            select: 'noPolisi namaKendaraan'
          },
          {
            path: 'supirId',
            select: 'nama'
          },
          {
            path: 'kenekId',
            select: 'nama'
          }
        ]
      })
      .populate({
        path: 'sttIds',
        populate: [
          {
            path: 'pengirimId',
            select: 'nama'
          },
          {
            path: 'penerimaId',
            select: 'nama'
          }
        ]
      });
    
    if (!loading) {
      return res.status(404).json({
        success: false,
        message: 'Data muat tidak ditemukan'
      });
    }
    
    // Create a document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=DMB-${loading.idMuat}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add header
    doc.fontSize(16).text('DAFTAR MUAT BARANG (DMB)', { align: 'center' });
    doc.fontSize(12).text(`Nomor DMB: ${loading.idMuat}`, { align: 'center' });
    doc.moveDown();
    
    // Add loading info
    doc.fontSize(10).text(`Cabang Muat: ${loading.cabangMuatId.namaCabang}`);
    doc.fontSize(10).text(`Cabang Bongkar: ${loading.cabangBongkarId.namaCabang}`);
    doc.fontSize(10).text(`Checker: ${loading.checkerId.nama}`);
    
    if (loading.antrianTruckId && loading.antrianTruckId.truckId) {
      doc.fontSize(10).text(`Nomor Polisi: ${loading.antrianTruckId.truckId.noPolisi}`);
      doc.fontSize(10).text(`Kendaraan: ${loading.antrianTruckId.truckId.namaKendaraan}`);
    }
    
    if (loading.antrianTruckId && loading.antrianTruckId.supirId) {
      doc.fontSize(10).text(`Supir: ${loading.antrianTruckId.supirId.nama}`);
    }
    
    if (loading.antrianTruckId && loading.antrianTruckId.kenekId) {
      doc.fontSize(10).text(`Kenek: ${loading.antrianTruckId.kenekId.nama}`);
    }
    
    doc.fontSize(10).text(`Status: ${loading.status}`);
    
    if (loading.waktuBerangkat) {
      doc.fontSize(10).text(`Waktu Berangkat: ${new Date(loading.waktuBerangkat).toLocaleString('id-ID')}`);
    }
    
    if (loading.waktuSampai) {
      doc.fontSize(10).text(`Waktu Sampai: ${new Date(loading.waktuSampai).toLocaleString('id-ID')}`);
    }
    
    if (loading.keterangan) {
      doc.fontSize(10).text(`Keterangan: ${loading.keterangan}`);
    }
    
    doc.moveDown();
    
    // Add STT list header
    doc.fontSize(12).text('Daftar STT', { underline: true });
    doc.moveDown(0.5);
    
    // Define table columns
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [80, 100, 80, 80, 60, 70];
    const colLabels = ['No STT', 'Nama Barang', 'Pengirim', 'Penerima', 'Colly', 'Berat (kg)'];
    
    // Draw table header
    doc.fontSize(8);
    let xPos = tableLeft;
    for (let i = 0; i < colLabels.length; i++) {
      doc.text(colLabels[i], xPos, tableTop, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    }
    
    // Draw header line
    doc.moveTo(tableLeft, tableTop + 15)
      .lineTo(tableLeft + colWidths.reduce((sum, width) => sum + width, 0), tableTop + 15)
      .stroke();
    
    // Draw table rows
    let yPos = tableTop + 20;
    let totalColly = 0;
    let totalBerat = 0;
    
    for (const stt of loading.sttIds) {
      xPos = tableLeft;
      
      // No STT
      doc.text(stt.noSTT, xPos, yPos, { width: colWidths[0], align: 'center' });
      xPos += colWidths[0];
      
      // Nama Barang
      doc.text(stt.namaBarang, xPos, yPos, { width: colWidths[1] });
      xPos += colWidths[1];
      
      // Pengirim
      doc.text(stt.pengirimId ? stt.pengirimId.nama : '-', xPos, yPos, { width: colWidths[2] });
      xPos += colWidths[2];
      
      // Penerima
      doc.text(stt.penerimaId ? stt.penerimaId.nama : '-', xPos, yPos, { width: colWidths[3] });
      xPos += colWidths[3];
      
      // Colly
      doc.text(stt.jumlahColly.toString(), xPos, yPos, { width: colWidths[4], align: 'center' });
      xPos += colWidths[4];
      
      // Berat
      doc.text(stt.berat.toString(), xPos, yPos, { width: colWidths[5], align: 'center' });
      
      // Update totals
      totalColly += stt.jumlahColly;
      totalBerat += stt.berat;
      
      yPos += 15;
      
      // Add a new page if we're at the bottom of the page
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
    }
    
    // Draw total line
    doc.moveTo(tableLeft, yPos)
      .lineTo(tableLeft + colWidths.reduce((sum, width) => sum + width, 0), yPos)
      .stroke();
    
    // Add totals
    yPos += 5;
    doc.fontSize(9).text('TOTAL:', tableLeft, yPos);
    doc.text(totalColly.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos, { width: colWidths[4], align: 'center' });
    doc.text(totalBerat.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], yPos, { width: colWidths[5], align: 'center' });
    
    yPos += 30;
    
    // Add signature section
    const sigWidth = 150;
    doc.fontSize(10).text('Checker', tableLeft, yPos, { width: sigWidth, align: 'center' });
    doc.fontSize(10).text('Supir', tableLeft + sigWidth, yPos, { width: sigWidth, align: 'center' });
    doc.fontSize(10).text('Penerima', tableLeft + sigWidth * 2, yPos, { width: sigWidth, align: 'center' });
    
    yPos += 50;
    
    // Add signature lines
    doc.moveTo(tableLeft + 20, yPos).lineTo(tableLeft + sigWidth - 20, yPos).stroke();
    doc.moveTo(tableLeft + sigWidth + 20, yPos).lineTo(tableLeft + sigWidth * 2 - 20, yPos).stroke();
    doc.moveTo(tableLeft + sigWidth * 2 + 20, yPos).lineTo(tableLeft + sigWidth * 3 - 20, yPos).stroke();
    
    // Add footer
    doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 750);
    doc.fontSize(8).text('Samudra Ekspedisi - Solusi Pengiriman Terpercaya', 50, 765);
    
    // Finalize PDF
    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal generate PDF DMB',
      error: error.message
    });
  }
};