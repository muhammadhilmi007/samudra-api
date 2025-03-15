const Collection = require('../models/Collection');
const STT = require('../models/STT');
const Customer = require('../models/Customer');
const { paginationResult } = require('../utils/helpers');
const PDFDocument = require('pdfkit');
const config = require('../config/config');

// @desc      Get all collections
// @route     GET /api/collections
// @access    Private
exports.getCollections = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      // Jika bukan direktur atau manajer keuangan, hanya tampilkan penagihan di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.pelangganId) {
      filter.pelangganId = req.query.pelangganId;
    }
    
    if (req.query.tipePelanggan) {
      filter.tipePelanggan = req.query.tipePelanggan;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.overdue) {
      filter.overdue = req.query.overdue === 'true';
    }
    
    // Date range filter untuk tanggal bayar
    if (req.query.startDate && req.query.endDate) {
      filter.tanggalBayar = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.tanggalBayar = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.tanggalBayar = { $lte: new Date(req.query.endDate) };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Collection.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const collections = await Collection.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga paymentType')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: collections.length,
      pagination: pagination.pagination,
      total,
      data: collections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data penagihan',
      error: error.message
    });
  }
};

// @desc      Get single collection
// @route     GET /api/collections/:id
// @access    Private
exports.getCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon email perusahaan')
      .populate('createdBy', 'nama')
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
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Penagihan tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: collection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data penagihan',
      error: error.message
    });
  }
};

// @desc      Create new collection
// @route     POST /api/collections
// @access    Private
exports.createCollection = async (req, res) => {
  try {
    // Validasi data
    if (!req.body.pelangganId) {
      return res.status(400).json({
        success: false,
        message: 'Pelanggan harus diisi'
      });
    }
    
    if (!req.body.tipePelanggan) {
      return res.status(400).json({
        success: false,
        message: 'Tipe pelanggan (pengirim/penerima) harus diisi'
      });
    }
    
    if (!req.body.sttIds || !Array.isArray(req.body.sttIds) || req.body.sttIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'STT harus diisi'
      });
    }
    
    // Validasi pelanggan
    const customer = await Customer.findById(req.body.pelangganId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan'
      });
    }
    
    // Validasi STT
    let totalTagihan = 0;
    for (const sttId of req.body.sttIds) {
      const stt = await STT.findById(sttId);
      
      if (!stt) {
        return res.status(404).json({
          success: false,
          message: `STT dengan ID ${sttId} tidak ditemukan`
        });
      }
      
      // Cek apakah STT sesuai dengan tipe pelanggan
      if (req.body.tipePelanggan === 'pengirim' && stt.pengirimId.toString() !== req.body.pelangganId) {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} bukan milik pengirim ini`
        });
      }
      
      if (req.body.tipePelanggan === 'penerima' && stt.penerimaId.toString() !== req.body.pelangganId) {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} bukan milik penerima ini`
        });
      }
      
      // Cek apakah STT sudah ditagih di penagihan lain
      const existingCollection = await Collection.findOne({
        sttIds: sttId,
        status: 'BELUM_LUNAS'
      });
      
      if (existingCollection) {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} sudah ditagih di penagihan lain`
        });
      }
      
      // Hitung total tagihan
      totalTagihan += stt.harga;
    }
    
    // Set cabangId dan createdBy dari user yang login
    req.body.cabangId = req.user.cabangId;
    req.body.createdBy = req.user.id;
    
    // Generate nomor penagihan
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Collection.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    }) + 1;
    
    const noPenagihan = `INV${dateString}${count.toString().padStart(4, '0')}`;
    req.body.noPenagihan = noPenagihan;
    
    // Set nilai default
    req.body.status = 'BELUM_LUNAS';
    req.body.overdue = false;
    req.body.totalTagihan = totalTagihan;
    
    // Inisialisasi jumlahBayarTermin jika belum ada
    if (!req.body.jumlahBayarTermin) {
      req.body.jumlahBayarTermin = [];
    }
    
    // Buat collection baru
    const collection = await Collection.create(req.body);
    
    // Populate data untuk response
    const populatedCollection = await Collection.findById(collection._id)
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga paymentType');
    
    res.status(201).json({
      success: true,
      data: populatedCollection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat penagihan baru',
      error: error.message
    });
  }
};

// @desc      Update collection
// @route     PUT /api/collections/:id
// @access    Private
exports.updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Penagihan tidak ditemukan'
      });
    }
    
    // Validasi jika status diubah
    if (req.body.status && req.body.status !== collection.status) {
      // Jika status diubah menjadi LUNAS
      if (req.body.status === 'LUNAS') {
        // Set tanggal bayar jika belum diisi
        if (!req.body.tanggalBayar) {
          req.body.tanggalBayar = new Date();
        }
        
        // Validasi jumlah bayar
        let totalBayar = 0;
        
        // Hitung total bayar dari termin-termin sebelumnya
        if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
          for (const termin of collection.jumlahBayarTermin) {
            totalBayar += termin;
          }
        }
        
        // Hitung total bayar dari termin baru jika ada
        if (req.body.jumlahBayarTermin && Array.isArray(req.body.jumlahBayarTermin)) {
          for (const termin of req.body.jumlahBayarTermin) {
            totalBayar += termin;
          }
        }
        
        // Jika total bayar kurang dari total tagihan, status tidak bisa diubah menjadi LUNAS
        if (totalBayar < collection.totalTagihan) {
          return res.status(400).json({
            success: false,
            message: 'Total pembayaran kurang dari total tagihan'
          });
        }
      }
    }
    
    // Update collection
    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga paymentType');
    
    res.status(200).json({
      success: true,
      data: updatedCollection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate penagihan',
      error: error.message
    });
  }
};

// @desc      Update collection status
// @route     PUT /api/collections/:id/status
// @access    Private
exports.updateCollectionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    if (!['LUNAS', 'BELUM_LUNAS'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Penagihan tidak ditemukan'
      });
    }
    
    // Data tambahan berdasarkan status
    const updateData = { status };
    
    // Jika status LUNAS, update tanggalBayar dan validasi jumlah bayar
    if (status === 'LUNAS') {
      // Set tanggal bayar jika belum diisi
      if (!collection.tanggalBayar) {
        updateData.tanggalBayar = new Date();
      }
      
      // Validasi jumlah bayar dari req.body
      if (req.body.jumlahBayar) {
        // Hitung total bayar sebelumnya
        let totalBayarSebelumnya = 0;
        if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
          for (const termin of collection.jumlahBayarTermin) {
            totalBayarSebelumnya += termin;
          }
        }
        
        // Tambahkan pembayaran baru
        const totalBayar = totalBayarSebelumnya + req.body.jumlahBayar;
        
        // Jika total bayar kurang dari total tagihan, status tidak bisa diubah menjadi LUNAS
        if (totalBayar < collection.totalTagihan) {
          return res.status(400).json({
            success: false,
            message: 'Total pembayaran kurang dari total tagihan'
          });
        }
        
        // Tambahkan pembayaran baru ke jumlahBayarTermin
        updateData.jumlahBayarTermin = [...collection.jumlahBayarTermin, req.body.jumlahBayar];
      } else {
        // Jika tidak ada jumlahBayar di req.body, cek apakah total bayar sudah cukup
        let totalBayar = 0;
        if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
          for (const termin of collection.jumlahBayarTermin) {
            totalBayar += termin;
          }
        }
        
        if (totalBayar < collection.totalTagihan) {
          return res.status(400).json({
            success: false,
            message: 'Total pembayaran kurang dari total tagihan'
          });
        }
      }
    }
    
    // Update collection
    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga paymentType');
    
    res.status(200).json({
      success: true,
      data: updatedCollection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status penagihan',
      error: error.message
    });
  }
};

// @desc      Add payment to collection
// @route     PUT /api/collections/:id/payment
// @access    Private
exports.addPayment = async (req, res) => {
  try {
    const { jumlahBayar } = req.body;
    
    if (!jumlahBayar || jumlahBayar <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah bayar harus diisi dan lebih dari 0'
      });
    }
    
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Penagihan tidak ditemukan'
      });
    }
    
    // Cek apakah penagihan sudah lunas
    if (collection.status === 'LUNAS') {
      return res.status(400).json({
        success: false,
        message: 'Penagihan sudah lunas'
      });
    }
    
    // Hitung total bayar sebelumnya
    let totalBayarSebelumnya = 0;
    if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
      for (const termin of collection.jumlahBayarTermin) {
        totalBayarSebelumnya += termin;
      }
    }
    
    // Tambahkan pembayaran baru
    const totalBayar = totalBayarSebelumnya + jumlahBayar;
    
    // Perbarui jumlahBayarTermin dan status
    const updateData = {
      jumlahBayarTermin: [...collection.jumlahBayarTermin, jumlahBayar]
    };
    
    // Jika total bayar sudah mencapai atau melebihi total tagihan, ubah status menjadi LUNAS
    if (totalBayar >= collection.totalTagihan) {
      updateData.status = 'LUNAS';
      updateData.tanggalBayar = new Date();
    }
    
    // Update collection
    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga paymentType');
    
    res.status(200).json({
      success: true,
      data: updatedCollection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan pembayaran',
      error: error.message
    });
  }
};

// @desc      Get collections by customer
// @route     GET /api/collections/by-customer/:customerId
// @access    Private
exports.getCollectionsByCustomer = async (req, res) => {
  try {
    const collections = await Collection.find({
      pelangganId: req.params.customerId
    })
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga paymentType')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data penagihan',
      error: error.message
    });
  }
};

// @desc      Get collections by status
// @route     GET /api/collections/by-status/:status
// @access    Private
exports.getCollectionsByStatus = async (req, res) => {
  try {
    // Validasi status
    if (!['LUNAS', 'BELUM_LUNAS'].includes(req.params.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    // Filter berdasarkan cabang pengguna jika bukan direktur atau manajer keuangan
    const filter = { status: req.params.status };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    const collections = await Collection.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat harga paymentType')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data penagihan',
      error: error.message
    });
  }
};

// @desc      Generate invoice PDF
// @route     GET /api/collections/generate-invoice/:id
// @access    Private
exports.generateInvoice = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('cabangId', 'namaCabang alamat kota provinsi')
      .populate('pelangganId', 'nama alamat telepon email perusahaan kota provinsi')
      .populate('createdBy', 'nama')
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
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Penagihan tidak ditemukan'
      });
    }
    
    // Create a document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${collection.noPenagihan}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add header
    doc.fontSize(16).text('INVOICE', { align: 'center' });
    doc.fontSize(12).text(`No. ${collection.noPenagihan}`, { align: 'center' });
    doc.moveDown();
    
    // Add company info
    doc.fontSize(10).text('Dari:', 50, 140);
    doc.fontSize(12).text('SAMUDRA EKSPEDISI', 50, 155);
    doc.fontSize(10).text(`Cabang ${collection.cabangId.namaCabang}`, 50, 170);
    if (collection.cabangId.alamat) {
      doc.fontSize(10).text(collection.cabangId.alamat, 50, 185);
      doc.fontSize(10).text(`${collection.cabangId.kota}, ${collection.cabangId.provinsi}`, 50, 200);
    }
    
    // Add customer info
    doc.fontSize(10).text('Kepada:', 300, 140);
    doc.fontSize(12).text(collection.pelangganId.nama, 300, 155);
    if (collection.pelangganId.perusahaan) {
      doc.fontSize(10).text(collection.pelangganId.perusahaan, 300, 170);
    }
    doc.fontSize(10).text(collection.pelangganId.alamat, 300, 185);
    doc.fontSize(10).text(`${collection.pelangganId.kota}, ${collection.pelangganId.provinsi}`, 300, 200);
    doc.fontSize(10).text(`Telepon: ${collection.pelangganId.telepon}`, 300, 215);
    if (collection.pelangganId.email) {
      doc.fontSize(10).text(`Email: ${collection.pelangganId.email}`, 300, 230);
    }
    
    // Add invoice details
    doc.moveDown(10);
    doc.fontSize(10).text(`Tanggal Invoice: ${new Date().toLocaleDateString('id-ID')}`, 50, 250);
    doc.fontSize(10).text(`Status: ${collection.status === 'LUNAS' ? 'LUNAS' : 'BELUM LUNAS'}`, 300, 250);
    if (collection.tanggalBayar) {
      doc.fontSize(10).text(`Tanggal Pembayaran: ${new Date(collection.tanggalBayar).toLocaleDateString('id-ID')}`, 300, 265);
    }
    doc.moveDown();
    
    // Add invoice items table
    doc.fontSize(12).text('Detail Pengiriman', { underline: true });
    doc.moveDown(0.5);
    
    // Define table columns
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [80, 100, 90, 60, 70, 90];
    const colLabels = ['No. STT', 'Nama Barang', 'Rute', 'Colly', 'Berat (kg)', 'Harga (Rp)'];
    
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
    
    for (const stt of collection.sttIds) {
      xPos = tableLeft;
      
      // No STT
      doc.text(stt.noSTT, xPos, yPos, { width: colWidths[0], align: 'center' });
      xPos += colWidths[0];
      
      // Nama Barang
      doc.text(stt.namaBarang, xPos, yPos, { width: colWidths[1] });
      xPos += colWidths[1];
      
      // Rute
      const rute = `${stt.cabangAsalId.namaCabang} - ${stt.cabangTujuanId.namaCabang}`;
      doc.text(rute, xPos, yPos, { width: colWidths[2] });
      xPos += colWidths[2];
      
      // Colly
      doc.text(stt.jumlahColly.toString(), xPos, yPos, { width: colWidths[3], align: 'center' });
      xPos += colWidths[3];
      
      // Berat
      doc.text(stt.berat.toString(), xPos, yPos, { width: colWidths[4], align: 'center' });
      xPos += colWidths[4];
      
      // Harga
      doc.text(stt.harga.toLocaleString('id-ID'), xPos, yPos, { width: colWidths[5], align: 'right' });
      
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
    
    yPos += 5;
    
    // Add totals
    doc.fontSize(9).text('SUBTOTAL:', tableLeft, yPos);
    doc.text(totalColly.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2], yPos, { width: colWidths[3], align: 'center' });
    doc.text(totalBerat.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos, { width: colWidths[4], align: 'center' });
    doc.text(collection.totalTagihan.toLocaleString('id-ID'), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], yPos, { width: colWidths[5], align: 'right' });
    
    yPos += 25;
    
    // Add payment info
    doc.fontSize(10).text('Informasi Pembayaran:', tableLeft, yPos, { underline: true });
    yPos += 15;
    
    doc.fontSize(9).text('Total Tagihan:', tableLeft, yPos);
    doc.text(`Rp ${collection.totalTagihan.toLocaleString('id-ID')}`, tableLeft + 150, yPos);
    
    yPos += 15;
    
    // Add payment terms
    if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
      doc.fontSize(9).text('Riwayat Pembayaran:', tableLeft, yPos);
      yPos += 15;
      
      let totalBayar = 0;
      for (let i = 0; i < collection.jumlahBayarTermin.length; i++) {
        const termin = collection.jumlahBayarTermin[i];
        totalBayar += termin;
        
        doc.fontSize(9).text(`Termin ${i + 1}:`, tableLeft, yPos);
        doc.text(`Rp ${termin.toLocaleString('id-ID')}`, tableLeft + 150, yPos);
        yPos += 15;
      }
      
      doc.fontSize(9).text('Total Pembayaran:', tableLeft, yPos);
      doc.text(`Rp ${totalBayar.toLocaleString('id-ID')}`, tableLeft + 150, yPos);
      yPos += 15;
      
      doc.fontSize(9).text('Sisa Tagihan:', tableLeft, yPos);
      const sisaTagihan = Math.max(0, collection.totalTagihan - totalBayar);
      doc.text(`Rp ${sisaTagihan.toLocaleString('id-ID')}`, tableLeft + 150, yPos);
    }
    
    yPos += 25;
    
    // Add payment instructions
    doc.fontSize(9).text('Pembayaran dapat dilakukan melalui transfer bank ke:', tableLeft, yPos);
    yPos += 15;
    doc.fontSize(9).text('Bank Mandiri', tableLeft, yPos);
    doc.fontSize(9).text('No. Rekening: 1234567890', tableLeft, yPos + 15);
    doc.fontSize(9).text('Atas Nama: PT Sarana Mudah Raya', tableLeft, yPos + 30);
    
    // Add notes if any
    if (collection.status === 'BELUM_LUNAS') {
      yPos += 60;
      doc.fontSize(9).text('Catatan:', tableLeft, yPos);
      doc.fontSize(9).text('Harap melakukan pembayaran dalam waktu 14 hari sejak tanggal invoice.', tableLeft, yPos + 15);
    }
    
    // Add authorized signature
    yPos = 650;
    doc.fontSize(10).text('Hormat Kami,', tableLeft, yPos, { align: 'right', width: 200 });
    yPos += 40;
    doc.fontSize(10).text('Samudra Ekspedisi', tableLeft, yPos, { align: 'right', width: 200 });
    
    // Add footer
    doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 750);
    doc.fontSize(8).text('Samudra Ekspedisi - Solusi Pengiriman Terpercaya', 50, 765);
    
    // Finalize PDF
    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal generate PDF invoice',
      error: error.message
    });
  }
};