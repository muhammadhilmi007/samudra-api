const Delivery = require('../models/Delivery');
const STT = require('../models/STT');
const VehicleQueue = require('../models/VehicleQueue');
const Branch = require('../models/Branch');
const { paginationResult } = require('../utils/helpers');
const PDFDocument = require('pdfkit');
const config = require('../config/config');

// @desc      Get all deliveries
// @route     GET /api/deliveries
// @access    Private
exports.getDeliveries = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      // Jika bukan direktur atau manajer operasional, hanya tampilkan lansir di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.antrianKendaraanId) {
      filter.antrianKendaraanId = req.query.antrianKendaraanId;
    }
    
    if (req.query.checkerId) {
      filter.checkerId = req.query.checkerId;
    }
    
    if (req.query.adminId) {
      filter.adminId = req.query.adminId;
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
    const total = await Delivery.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const deliveries = await Delivery.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: {
          path: 'kendaraanId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat paymentType')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: deliveries.length,
      pagination: pagination.pagination,
      total,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data lansir',
      error: error.message
    });
  }
};

// @desc      Get single delivery
// @route     GET /api/deliveries/:id
// @access    Private
exports.getDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: [
          {
            path: 'kendaraanId',
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
            select: 'nama alamat telepon'
          },
          {
            path: 'penerimaId',
            select: 'nama alamat telepon'
          },
          {
            path: 'cabangAsalId',
            select: 'namaCabang'
          },
          {
            path: 'cabangTujuanId',
            select: 'namaCabang'
          }
        ]
      });
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Lansir tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data lansir',
      error: error.message
    });
  }
};

// @desc      Create new delivery
// @route     POST /api/deliveries
// @access    Private
exports.createDelivery = async (req, res) => {
  try {
    // Validasi data
    if (!req.body.antrianKendaraanId) {
      return res.status(400).json({
        success: false,
        message: 'Antrian kendaraan harus diisi'
      });
    }
    
    if (!req.body.checkerId) {
      return res.status(400).json({
        success: false,
        message: 'Checker harus diisi'
      });
    }
    
    if (!req.body.adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin harus diisi'
      });
    }
    
    if (!req.body.sttIds || !Array.isArray(req.body.sttIds) || req.body.sttIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'STT harus diisi'
      });
    }
    
    // Validasi antrian kendaraan
    const antrianKendaraan = await VehicleQueue.findById(req.body.antrianKendaraanId);
    if (!antrianKendaraan) {
      return res.status(404).json({
        success: false,
        message: 'Antrian kendaraan tidak ditemukan'
      });
    }
    
    // Cek apakah antrian kendaraan sudah digunakan
    const existingDelivery = await Delivery.findOne({
      antrianKendaraanId: req.body.antrianKendaraanId,
      status: { $in: ['LANSIR', 'TERKIRIM'] }
    });
    
    if (existingDelivery) {
      return res.status(400).json({
        success: false,
        message: 'Antrian kendaraan sudah digunakan di lansir lain'
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
      
      // Cek apakah STT sudah dilansir
      if (stt.status === 'LANSIR' || stt.status === 'TERKIRIM') {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} sudah dilansir`
        });
      }
      
      // Cek apakah STT sudah sampai di cabang tujuan
      if (stt.status !== 'TRANSIT' && stt.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} belum sampai di cabang tujuan`
        });
      }
    }
    
    // Set cabangId dari user yang login
    req.body.cabangId = req.user.cabangId;
    
    // Generate ID lansir
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Delivery.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    }) + 1;
    
    const idLansir = `L${dateString}${count.toString().padStart(4, '0')}`;
    req.body.idLansir = idLansir;
    
    // Set status default
    req.body.status = 'LANSIR';
    
    // Set waktu berangkat
    if (!req.body.berangkat) {
      req.body.berangkat = new Date();
    }
    
    // Buat delivery baru
    const delivery = await Delivery.create(req.body);
    
    // Update status STT menjadi LANSIR
    for (const sttId of req.body.sttIds) {
      await STT.findByIdAndUpdate(sttId, { status: 'LANSIR' });
    }
    
    // Update status antrian kendaraan menjadi LANSIR
    await VehicleQueue.findByIdAndUpdate(req.body.antrianKendaraanId, { status: 'LANSIR' });
    
    // Populate data untuk response
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: {
          path: 'kendaraanId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat paymentType');
    
    res.status(201).json({
      success: true,
      data: populatedDelivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat lansir baru',
      error: error.message
    });
  }
};

// @desc      Update delivery
// @route     PUT /api/deliveries/:id
// @access    Private
exports.updateDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Lansir tidak ditemukan'
      });
    }
    
    // Validasi jika status diubah
    if (req.body.status && req.body.status !== delivery.status) {
      // Jika status diubah menjadi TERKIRIM
      if (req.body.status === 'TERKIRIM') {
        // Cek status sebelumnya harus LANSIR
        if (delivery.status !== 'LANSIR') {
          return res.status(400).json({
            success: false,
            message: 'Status harus LANSIR sebelum diubah menjadi TERKIRIM'
          });
        }
        
        // Cek apakah nama penerima sudah diisi
        if (!req.body.namaPenerima && !delivery.namaPenerima) {
          return res.status(400).json({
            success: false,
            message: 'Nama penerima harus diisi'
          });
        }
        
        // Set waktu sampai
        if (!req.body.sampai) {
          req.body.sampai = new Date();
        }
        
        // Update status STT menjadi TERKIRIM
        for (const sttId of delivery.sttIds) {
          await STT.findByIdAndUpdate(sttId, { status: 'TERKIRIM' });
        }
        
        // Update status antrian kendaraan menjadi KEMBALI
        await VehicleQueue.findByIdAndUpdate(delivery.antrianKendaraanId, { status: 'KEMBALI' });
      }
      
      // Jika status diubah menjadi BELUM SELESAI
      if (req.body.status === 'BELUM_SELESAI') {
        // Cek status sebelumnya harus LANSIR
        if (delivery.status !== 'LANSIR') {
          return res.status(400).json({
            success: false,
            message: 'Status harus LANSIR sebelum diubah menjadi BELUM_SELESAI'
          });
        }
        
        // Set waktu sampai
        if (!req.body.sampai) {
          req.body.sampai = new Date();
        }
        
        // Cek apakah keterangan sudah diisi
        if (!req.body.keterangan && !delivery.keterangan) {
          return res.status(400).json({
            success: false,
            message: 'Keterangan harus diisi'
          });
        }
        
        // Update status antrian kendaraan menjadi KEMBALI
        await VehicleQueue.findByIdAndUpdate(delivery.antrianKendaraanId, { status: 'KEMBALI' });
      }
    }
    
    // Update delivery
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: {
          path: 'kendaraanId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat paymentType');
    
    res.status(200).json({
      success: true,
      data: updatedDelivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate lansir',
      error: error.message
    });
  }
};

// @desc      Update delivery status
// @route     PUT /api/deliveries/:id/status
// @access    Private
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    if (!['LANSIR', 'TERKIRIM', 'BELUM_SELESAI'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Lansir tidak ditemukan'
      });
    }
    
    // Data tambahan berdasarkan status
    const updateData = { status };
    
    // Jika status TERKIRIM, update sampai dan validasi namaPenerima
    if (status === 'TERKIRIM') {
      // Cek status sebelumnya harus LANSIR
      if (delivery.status !== 'LANSIR') {
        return res.status(400).json({
          success: false,
          message: 'Status harus LANSIR sebelum diubah menjadi TERKIRIM'
        });
      }
      
      // Cek apakah nama penerima sudah diisi
      if (!req.body.namaPenerima && !delivery.namaPenerima) {
        return res.status(400).json({
          success: false,
          message: 'Nama penerima harus diisi'
        });
      }
      
      updateData.sampai = new Date();
      
      if (req.body.namaPenerima) {
        updateData.namaPenerima = req.body.namaPenerima;
      }
      
      if (req.body.kilometerPulang) {
        updateData.kilometerPulang = req.body.kilometerPulang;
      }
      
      // Update status STT menjadi TERKIRIM
      for (const sttId of delivery.sttIds) {
        await STT.findByIdAndUpdate(sttId, { status: 'TERKIRIM' });
      }
      
      // Update status antrian kendaraan menjadi KEMBALI
      await VehicleQueue.findByIdAndUpdate(delivery.antrianKendaraanId, { status: 'KEMBALI' });
    }
    
    // Jika status BELUM_SELESAI, update sampai dan validasi keterangan
    if (status === 'BELUM_SELESAI') {
      // Cek status sebelumnya harus LANSIR
      if (delivery.status !== 'LANSIR') {
        return res.status(400).json({
          success: false,
          message: 'Status harus LANSIR sebelum diubah menjadi BELUM_SELESAI'
        });
      }
      
      // Cek apakah keterangan sudah diisi
      if (!req.body.keterangan && !delivery.keterangan) {
        return res.status(400).json({
          success: false,
          message: 'Keterangan harus diisi'
        });
      }
      
      updateData.sampai = new Date();
      
      if (req.body.keterangan) {
        updateData.keterangan = req.body.keterangan;
      }
      
      if (req.body.kilometerPulang) {
        updateData.kilometerPulang = req.body.kilometerPulang;
      }
      
      // Update status antrian kendaraan menjadi KEMBALI
      await VehicleQueue.findByIdAndUpdate(delivery.antrianKendaraanId, { status: 'KEMBALI' });
    }
    
    // Update delivery
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: {
          path: 'kendaraanId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat paymentType');
    
    res.status(200).json({
      success: true,
      data: updatedDelivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status lansir',
      error: error.message
    });
  }
};

// @desc      Get deliveries by STT
// @route     GET /api/deliveries/by-stt/:sttId
// @access    Private
exports.getDeliveriesBySTT = async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      sttIds: req.params.sttId
    })
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: {
          path: 'kendaraanId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat paymentType')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data lansir',
      error: error.message
    });
  }
};

// @desc      Get deliveries by vehicle
// @route     GET /api/deliveries/by-vehicle/:vehicleId
// @access    Private
exports.getDeliveriesByVehicle = async (req, res) => {
  try {
    // Cari semua antrian kendaraan dengan kendaraanId yang diberikan
    const vehicleQueues = await VehicleQueue.find({ kendaraanId: req.params.vehicleId });
    const vehicleQueueIds = vehicleQueues.map(queue => queue._id);
    
    // Cari semua delivery dengan antrianKendaraanId yang ada di vehicleQueueIds
    const deliveries = await Delivery.find({
      antrianKendaraanId: { $in: vehicleQueueIds }
    })
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: {
          path: 'kendaraanId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat paymentType')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data lansir',
      error: error.message
    });
  }
};

// @desc      Generate delivery form
// @route     GET /api/deliveries/generate-form/:id
// @access    Private
exports.generateDeliveryForm = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: [
          {
            path: 'kendaraanId',
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
            select: 'nama alamat telepon'
          },
          {
            path: 'penerimaId',
            select: 'nama alamat telepon'
          },
          {
            path: 'cabangAsalId',
            select: 'namaCabang'
          },
          {
            path: 'cabangTujuanId',
            select: 'namaCabang'
          }
        ]
      });
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Lansir tidak ditemukan'
      });
    }
    
    // Create a document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Lansir-${delivery.idLansir}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add header
    doc.fontSize(16).text('FORM LANSIR / PENGIRIMAN LOKAL', { align: 'center' });
    doc.fontSize(12).text(`Nomor: ${delivery.idLansir}`, { align: 'center' });
    doc.moveDown();
    
    // Add delivery info
    doc.fontSize(10).text(`Cabang: ${delivery.cabangId.namaCabang}`);
    doc.fontSize(10).text(`Checker: ${delivery.checkerId.nama}`);
    doc.fontSize(10).text(`Admin: ${delivery.adminId.nama}`);
    
    if (delivery.antrianKendaraanId && delivery.antrianKendaraanId.kendaraanId) {
      doc.fontSize(10).text(`Nomor Polisi: ${delivery.antrianKendaraanId.kendaraanId.noPolisi}`);
      doc.fontSize(10).text(`Kendaraan: ${delivery.antrianKendaraanId.kendaraanId.namaKendaraan}`);
    }
    
    if (delivery.antrianKendaraanId && delivery.antrianKendaraanId.supirId) {
      doc.fontSize(10).text(`Supir: ${delivery.antrianKendaraanId.supirId.nama}`);
    }
    
    if (delivery.antrianKendaraanId && delivery.antrianKendaraanId.kenekId) {
      doc.fontSize(10).text(`Kenek: ${delivery.antrianKendaraanId.kenekId.nama}`);
    }
    
    doc.fontSize(10).text(`Status: ${delivery.status}`);
    
    if (delivery.estimasiLansir) {
      doc.fontSize(10).text(`Estimasi Lansir: ${delivery.estimasiLansir}`);
    }
    
    if (delivery.berangkat) {
      doc.fontSize(10).text(`Waktu Berangkat: ${new Date(delivery.berangkat).toLocaleString('id-ID')}`);
    }
    
    if (delivery.sampai) {
      doc.fontSize(10).text(`Waktu Sampai: ${new Date(delivery.sampai).toLocaleString('id-ID')}`);
    }
    
    if (delivery.kilometerBerangkat) {
      doc.fontSize(10).text(`Kilometer Berangkat: ${delivery.kilometerBerangkat}`);
    }
    
    if (delivery.kilometerPulang) {
      doc.fontSize(10).text(`Kilometer Pulang: ${delivery.kilometerPulang}`);
    }
    
    if (delivery.namaPenerima) {
      doc.fontSize(10).text(`Penerima: ${delivery.namaPenerima}`);
    }
    
    if (delivery.keterangan) {
      doc.fontSize(10).text(`Keterangan: ${delivery.keterangan}`);
    }
    
    doc.moveDown();
    
    // Add STT list header
    doc.fontSize(12).text('Daftar STT', { underline: true });
    doc.moveDown(0.5);
    
    // Define table columns
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [80, 100, 80, 100, 60, 70];
    const colLabels = ['No STT', 'Nama Barang', 'Pengirim', 'Penerima', 'Colly', 'Alamat'];
    
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
    
    for (const stt of delivery.sttIds) {
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
      
      // Alamat (ringkas)
      const alamat = stt.penerimaId ? stt.penerimaId.alamat.substring(0, 20) + '...' : '-';
      doc.text(alamat, xPos, yPos, { width: colWidths[5] });
      
      // Update totals
      totalColly += stt.jumlahColly;
      
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
      message: 'Gagal generate PDF form lansir',
      error: error.message
    });
  }
};

// @desc      Get deliveries for mobile app
// @route     GET /api/mobile/deliveries
// @access    Private
exports.getDeliveriesForMobile = async (req, res) => {
  try {
    // Filter berdasarkan role dan cabang pengguna
    const filter = {};
    
    // Jika supir, tampilkan lansir dengan supirId nya
    if (req.user.role === 'supir') {
      // Cari semua antrian kendaraan dengan supirId pengguna
      const vehicleQueues = await VehicleQueue.find({ supirId: req.user.id });
      const vehicleQueueIds = vehicleQueues.map(queue => queue._id);
      
      filter.antrianKendaraanId = { $in: vehicleQueueIds };
      filter.status = { $in: ['LANSIR'] }; // Hanya tampilkan yang sedang berlangsung
    } else {
      // Untuk checker dan kepala gudang, tampilkan lansir di cabang mereka
      filter.cabangId = req.user.cabangId;
      
      // Filter tambahan jika ada
      if (req.query.status) {
        filter.status = req.query.status;
      }
    }
    
    const deliveries = await Delivery.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('checkerId', 'nama')
      .populate('adminId', 'nama')
      .populate({
        path: 'antrianKendaraanId',
        populate: {
          path: 'kendaraanId',
          select: 'noPolisi namaKendaraan'
        }
      })
      .populate({
        path: 'sttIds',
        populate: [
          {
            path: 'pengirimId',
            select: 'nama alamat telepon'
          },
          {
            path: 'penerimaId',
            select: 'nama alamat telepon'
          }
        ]
      })
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data lansir',
      error: error.message
    });
  }
};