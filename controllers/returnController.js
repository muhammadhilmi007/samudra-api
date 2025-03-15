const Return = require('../models/Return');
const STT = require('../models/STT');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');

// @desc      Get all returns
// @route     GET /api/returns
// @access    Private
exports.getReturns = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      // Jika bukan direktur atau manajer operasional, hanya tampilkan retur di cabang sendiri
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
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
    const total = await Return.countDocuments(filter);
    
    const pagination = paginationResult(page, limit, total);
    
    const returns = await Return.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat pengirimId penerimaId')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: returns.length,
      pagination: pagination.pagination,
      total,
      data: returns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data retur',
      error: error.message
    });
  }
};

// @desc      Get single return
// @route     GET /api/returns/:id
// @access    Private
exports.getReturn = async (req, res) => {
  try {
    const returnItem = await Return.findById(req.params.id)
      .populate('cabangId', 'namaCabang')
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
    
    if (!returnItem) {
      return res.status(404).json({
        success: false,
        message: 'Retur tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: returnItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data retur',
      error: error.message
    });
  }
};

// @desc      Create new return
// @route     POST /api/returns
// @access    Private
exports.createReturn = async (req, res) => {
  try {
    // Validasi data
    if (!req.body.sttIds || !Array.isArray(req.body.sttIds) || req.body.sttIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'STT harus diisi'
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
      
      // Cek apakah STT sudah diretur
      if (stt.status === 'RETURN') {
        return res.status(400).json({
          success: false,
          message: `STT dengan ID ${sttId} sudah diretur`
        });
      }
    }
    
    // Set cabangId dan createdBy dari user yang login
    req.body.cabangId = req.user.cabangId;
    req.body.createdBy = req.user.id;
    
    // Generate ID retur
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Return.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    }) + 1;
    
    const idRetur = `R${dateString}${count.toString().padStart(4, '0')}`;
    req.body.idRetur = idRetur;
    
    // Set tanggal kirim jika tidak disediakan
    if (!req.body.tanggalKirim) {
      req.body.tanggalKirim = new Date();
    }
    
    // Set status default
    req.body.status = 'PROSES';
    
    // Buat retur baru
    const returnItem = await Return.create(req.body);
    
    // Update status STT menjadi RETURN
    for (const sttId of req.body.sttIds) {
      await STT.findByIdAndUpdate(sttId, { status: 'RETURN' });
    }
    
    // Populate data untuk response
    const populatedReturn = await Return.findById(returnItem._id)
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat pengirimId penerimaId');
    
    res.status(201).json({
      success: true,
      data: populatedReturn
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat retur baru',
      error: error.message
    });
  }
};

// @desc      Update return
// @route     PUT /api/returns/:id
// @access    Private
exports.updateReturn = async (req, res) => {
  try {
    const returnItem = await Return.findById(req.params.id);
    
    if (!returnItem) {
      return res.status(404).json({
        success: false,
        message: 'Retur tidak ditemukan'
      });
    }
    
    // Validasi jika status diubah
    if (req.body.status && req.body.status !== returnItem.status) {
      // Jika status diubah menjadi SAMPAI
      if (req.body.status === 'SAMPAI') {
        // Cek status sebelumnya harus PROSES
        if (returnItem.status !== 'PROSES') {
          return res.status(400).json({
            success: false,
            message: 'Status harus PROSES sebelum diubah menjadi SAMPAI'
          });
        }
        
        // Set tanggal sampai
        if (!req.body.tanggalSampai) {
          req.body.tanggalSampai = new Date();
        }
        
        // Cek apakah tanda terima sudah diisi
        if (!req.body.tandaTerima && !returnItem.tandaTerima) {
          return res.status(400).json({
            success: false,
            message: 'Tanda terima harus diisi'
          });
        }
      }
    }
    
    // Update return
    const updatedReturn = await Return.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat pengirimId penerimaId');
    
    res.status(200).json({
      success: true,
      data: updatedReturn
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate retur',
      error: error.message
    });
  }
};

// @desc      Update return status
// @route     PUT /api/returns/:id/status
// @access    Private
exports.updateReturnStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status harus diisi'
      });
    }
    
    // Validasi status
    if (!['PROSES', 'SAMPAI'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }
    
    const returnItem = await Return.findById(req.params.id);
    
    if (!returnItem) {
      return res.status(404).json({
        success: false,
        message: 'Retur tidak ditemukan'
      });
    }
    
    // Data tambahan berdasarkan status
    const updateData = { status };
    
    // Jika status SAMPAI, update tanggalSampai dan validasi tandaTerima
    if (status === 'SAMPAI') {
      // Cek status sebelumnya harus PROSES
      if (returnItem.status !== 'PROSES') {
        return res.status(400).json({
          success: false,
          message: 'Status harus PROSES sebelum diubah menjadi SAMPAI'
        });
      }
      
      // Cek apakah tanda terima sudah diisi
      if (!req.body.tandaTerima && !returnItem.tandaTerima) {
        return res.status(400).json({
          success: false,
          message: 'Tanda terima harus diisi'
        });
      }
      
      updateData.tanggalSampai = new Date();
      
      if (req.body.tandaTerima) {
        updateData.tandaTerima = req.body.tandaTerima;
      }
    }
    
    // Update return
    const updatedReturn = await Return.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat pengirimId penerimaId');
    
    res.status(200).json({
      success: true,
      data: updatedReturn
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status retur',
      error: error.message
    });
  }
};

// @desc      Get returns by STT
// @route     GET /api/returns/by-stt/:sttId
// @access    Private
exports.getReturnsBySTT = async (req, res) => {
  try {
    const returns = await Return.find({
      sttIds: req.params.sttId
    })
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang jumlahColly berat pengirimId penerimaId')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: returns.length,
      data: returns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data retur',
      error: error.message
    });
  }
};