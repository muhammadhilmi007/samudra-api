const STT = require('../models/STT');
const Loading = require('../models/Loading');
const Delivery = require('../models/Delivery');
const Return = require('../models/Return');
const Collection = require('../models/Collection');
const Journal = require('../models/Journal');
const CashBranch = require('../models/BranchCash');
const CashHeadquarter = require('../models/HeadquarterCash');
const BankStatement = require('../models/BankStatement');
const Branch = require('../models/Branch');
const Vehicle = require('../models/Vehicle');
const Customer = require('../models/Customer');
const Asset = require('../models/Asset');
const Account = require('../models/Account');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

// ================ LOADING REPORTS ================

// @desc      Get loading manifest report
// @route     GET /api/reports/loading-manifest
// @access    Private
exports.getLoadingManifestReport = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    // Filter berdasarkan cabang user jika bukan direktur atau manajer operasional
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      filter.cabangMuatId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangMuatId) {
      filter.cabangMuatId = req.query.cabangMuatId;
    }
    
    // Tambahkan filter cabang tujuan jika disediakan
    if (req.query.cabangBongkarId) {
      filter.cabangBongkarId = req.query.cabangBongkarId;
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
      })
      .sort('-createdAt');
    
    // Format data untuk report
    const report = loadings.map(loading => {
      // Hitung total colly dan berat
      let totalColly = 0;
      let totalBerat = 0;
      
      loading.sttIds.forEach(stt => {
        totalColly += stt.jumlahColly;
        totalBerat += stt.berat;
      });
      
      return {
        idMuat: loading.idMuat,
        cabangMuat: loading.cabangMuatId ? loading.cabangMuatId.namaCabang : '',
        cabangBongkar: loading.cabangBongkarId ? loading.cabangBongkarId.namaCabang : '',
        kendaraan: loading.antrianTruckId && loading.antrianTruckId.truckId ? 
          `${loading.antrianTruckId.truckId.noPolisi} - ${loading.antrianTruckId.truckId.namaKendaraan}` : '',
        jumlahSTT: loading.sttIds.length,
        totalColly,
        totalBerat,
        status: loading.status,
        waktuBerangkat: loading.waktuBerangkat ? moment(loading.waktuBerangkat).format('DD/MM/YYYY HH:mm') : '',
        waktuSampai: loading.waktuSampai ? moment(loading.waktuSampai).format('DD/MM/YYYY HH:mm') : '',
        details: loading.sttIds.map(stt => ({
          noSTT: stt.noSTT,
          namaBarang: stt.namaBarang,
          pengirim: stt.pengirimId ? stt.pengirimId.nama : '',
          penerima: stt.penerimaId ? stt.penerimaId.nama : '',
          jumlahColly: stt.jumlahColly,
          berat: stt.berat
        }))
      };
    });
    
    res.status(200).json({
      success: true,
      count: report.length,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan manifest muat',
      error: error.message
    });
  }
};

// ================ SALES REPORTS ================

// @desc      Get sales report
// @route     GET /api/reports/sales
// @access    Private
exports.getSalesReport = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    // Filter berdasarkan cabang user jika bukan direktur atau manajer operasional
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Tambahkan filter cabang asal jika disediakan
    if (req.query.cabangAsalId) {
      filter.cabangAsalId = req.query.cabangAsalId;
    }
    
    // Tambahkan filter cabang tujuan jika disediakan
    if (req.query.cabangTujuanId) {
      filter.cabangTujuanId = req.query.cabangTujuanId;
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
    
    // Tambahkan filter payment type jika disediakan
    if (req.query.paymentType) {
      filter.paymentType = req.query.paymentType;
    }
    
    const stts = await STT.find(filter)
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .sort('-createdAt');
    
    // Format data untuk report
    const report = stts.map(stt => {
      return {
        noSTT: stt.noSTT,
        tanggal: moment(stt.createdAt).format('DD/MM/YYYY'),
        cabangAsal: stt.cabangAsalId ? stt.cabangAsalId.namaCabang : '',
        cabangTujuan: stt.cabangTujuanId ? stt.cabangTujuanId.namaCabang : '',
        pengirim: stt.pengirimId ? stt.pengirimId.nama : '',
        penerima: stt.penerimaId ? stt.penerimaId.nama : '',
        namaBarang: stt.namaBarang,
        komoditi: stt.komoditi,
        jumlahColly: stt.jumlahColly,
        berat: stt.berat,
        hargaPerKilo: stt.hargaPerKilo,
        harga: stt.harga,
        paymentType: stt.paymentType,
        status: stt.status,
        createdBy: stt.userId ? stt.userId.nama : ''
      };
    });
    
    // Hitung total pendapatan
    const totalPendapatan = stts.reduce((total, stt) => total + stt.harga, 0);
    
    // Hitung jumlah STT per payment type
    const paymentTypeCount = {
      CASH: stts.filter(stt => stt.paymentType === 'CASH').length,
      COD: stts.filter(stt => stt.paymentType === 'COD').length,
      CAD: stts.filter(stt => stt.paymentType === 'CAD').length
    };
    
    // Hitung jumlah STT per cabang asal
    const cabangAsalCount = {};
    stts.forEach(stt => {
      const cabangAsal = stt.cabangAsalId ? stt.cabangAsalId.namaCabang : 'Unknown';
      cabangAsalCount[cabangAsal] = (cabangAsalCount[cabangAsal] || 0) + 1;
    });
    
    res.status(200).json({
      success: true,
      count: report.length,
      totalPendapatan,
      paymentTypeCount,
      cabangAsalCount,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan penjualan',
      error: error.message
    });
  }
};

// @desc      Get sales report by branch
// @route     GET /api/reports/sales-by-branch/:branchId
// @access    Private
exports.getSalesReportByBranch = async (req, res) => {
  try {
    // Validasi cabang
    const branch = await Branch.findById(req.params.branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
    
    // Filter untuk STT dari cabang tertentu
    const filter = {
      cabangId: req.params.branchId
    };
    
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
    
    const stts = await STT.find(filter)
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('pengirimId', 'nama')
      .populate('penerimaId', 'nama')
      .populate('userId', 'nama')
      .sort('-createdAt');
    
    // Format data untuk report
    const report = stts.map(stt => {
      return {
        noSTT: stt.noSTT,
        tanggal: moment(stt.createdAt).format('DD/MM/YYYY'),
        cabangAsal: stt.cabangAsalId ? stt.cabangAsalId.namaCabang : '',
        cabangTujuan: stt.cabangTujuanId ? stt.cabangTujuanId.namaCabang : '',
        pengirim: stt.pengirimId ? stt.pengirimId.nama : '',
        penerima: stt.penerimaId ? stt.penerimaId.nama : '',
        namaBarang: stt.namaBarang,
        komoditi: stt.komoditi,
        jumlahColly: stt.jumlahColly,
        berat: stt.berat,
        hargaPerKilo: stt.hargaPerKilo,
        harga: stt.harga,
        paymentType: stt.paymentType,
        status: stt.status,
        createdBy: stt.userId ? stt.userId.nama : ''
      };
    });
    
    // Hitung total pendapatan
    const totalPendapatan = stts.reduce((total, stt) => total + stt.harga, 0);
    
    // Hitung jumlah STT per payment type
    const paymentTypeCount = {
      CASH: stts.filter(stt => stt.paymentType === 'CASH').length,
      COD: stts.filter(stt => stt.paymentType === 'COD').length,
      CAD: stts.filter(stt => stt.paymentType === 'CAD').length
    };
    
    res.status(200).json({
      success: true,
      cabang: branch.namaCabang,
      count: report.length,
      totalPendapatan,
      paymentTypeCount,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan penjualan per cabang',
      error: error.message
    });
  }
};

// ================ REVENUE REPORTS ================

// @desc      Get revenue report
// @route     GET /api/reports/revenue
// @access    Private
exports.getRevenueReport = async (req, res) => {
  try {
    // Tentukan periode laporan (default: bulan ini)
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Filter berdasarkan cabang jika bukan direktur atau manajer keuangan
    const filter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Dapatkan data STT untuk periode tersebut
    const stts = await STT.find(filter)
      .populate('cabangId', 'namaCabang')
      .sort('createdAt');
    
    // Hitung total pendapatan per hari
    const revenueByDay = {};
    const revenueByBranch = {};
    const revenueByPaymentType = {
      CASH: 0,
      COD: 0,
      CAD: 0
    };
    
    stts.forEach(stt => {
      const dateKey = moment(stt.createdAt).format('YYYY-MM-DD');
      const branchName = stt.cabangId ? stt.cabangId.namaCabang : 'Unknown';
      
      // Akumulasi pendapatan per hari
      revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + stt.harga;
      
      // Akumulasi pendapatan per cabang
      revenueByBranch[branchName] = (revenueByBranch[branchName] || 0) + stt.harga;
      
      // Akumulasi pendapatan per payment type
      revenueByPaymentType[stt.paymentType] += stt.harga;
    });
    
    // Format data untuk report
    const dailyReport = Object.keys(revenueByDay).map(date => ({
      tanggal: date,
      pendapatan: revenueByDay[date],
      jumlahSTT: stts.filter(stt => moment(stt.createdAt).format('YYYY-MM-DD') === date).length
    })).sort((a, b) => moment(a.tanggal).diff(moment(b.tanggal)));
    
    const branchReport = Object.keys(revenueByBranch).map(branch => ({
      cabang: branch,
      pendapatan: revenueByBranch[branch],
      jumlahSTT: stts.filter(stt => stt.cabangId && stt.cabangId.namaCabang === branch).length
    })).sort((a, b) => b.pendapatan - a.pendapatan);
    
    const paymentTypeReport = Object.keys(revenueByPaymentType).map(type => ({
      jenisPembayaran: type,
      pendapatan: revenueByPaymentType[type],
      jumlahSTT: stts.filter(stt => stt.paymentType === type).length
    })).sort((a, b) => b.pendapatan - a.pendapatan);
    
    // Hitung total pendapatan
    const totalPendapatan = stts.reduce((total, stt) => total + stt.harga, 0);
    
    res.status(200).json({
      success: true,
      periode: {
        mulai: moment(startDate).format('DD/MM/YYYY'),
        sampai: moment(endDate).format('DD/MM/YYYY')
      },
      totalPendapatan,
      jumlahSTT: stts.length,
      pendapatanHarian: dailyReport,
      pendapatanPerCabang: branchReport,
      pendapatanPerJenisPembayaran: paymentTypeReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan pendapatan',
      error: error.message
    });
  }
};

// @desc      Get monthly revenue report
// @route     GET /api/reports/revenue/monthly
// @access    Private
exports.getMonthlyRevenueReport = async (req, res) => {
  try {
    // Tentukan periode laporan (default: 12 bulan terakhir)
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const startDate = req.query.startDate ? 
      new Date(req.query.startDate) : 
      new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1); // 12 bulan ke belakang
    
    // Filter berdasarkan cabang jika bukan direktur atau manajer keuangan
    const filter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Dapatkan data STT untuk periode tersebut
    const stts = await STT.find(filter)
      .populate('cabangId', 'namaCabang')
      .sort('createdAt');
    
    // Hitung total pendapatan per bulan
    const revenueByMonth = {};
    
    stts.forEach(stt => {
      const monthKey = moment(stt.createdAt).format('YYYY-MM');
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + stt.harga;
    });
    
    // Generate array bulan untuk periode yang dipilih
    const months = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthKey = moment(currentDate).format('YYYY-MM');
      months.push(monthKey);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Format data untuk report
    const monthlyReport = months.map(month => ({
      bulan: month,
      pendapatan: revenueByMonth[month] || 0,
      jumlahSTT: stts.filter(stt => moment(stt.createdAt).format('YYYY-MM') === month).length
    }));
    
    // Hitung total pendapatan
    const totalPendapatan = stts.reduce((total, stt) => total + stt.harga, 0);
    
    res.status(200).json({
      success: true,
      periode: {
        mulai: moment(startDate).format('MM/YYYY'),
        sampai: moment(endDate).format('MM/YYYY')
      },
      totalPendapatan,
      jumlahSTT: stts.length,
      pendapatanBulanan: monthlyReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan pendapatan bulanan',
      error: error.message
    });
  }
};

// @desc      Get daily revenue report
// @route     GET /api/reports/revenue/daily
// @access    Private
exports.getDailyRevenueReport = async (req, res) => {
  try {
    // Tentukan periode laporan (default: bulan ini)
    const today = new Date();
    const startDate = req.query.startDate ? 
      new Date(req.query.startDate) : 
      new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = req.query.endDate ? 
      new Date(req.query.endDate) : 
      new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Filter berdasarkan cabang jika bukan direktur atau manajer keuangan
    const filter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Dapatkan data STT untuk periode tersebut
    const stts = await STT.find(filter)
      .populate('cabangId', 'namaCabang')
      .sort('createdAt');
    
    // Generate array tanggal untuk periode yang dipilih
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = moment(currentDate).format('YYYY-MM-DD');
      dates.push(dateKey);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Hitung total pendapatan per hari
    const revenueByDay = {};
    
    stts.forEach(stt => {
      const dateKey = moment(stt.createdAt).format('YYYY-MM-DD');
      revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + stt.harga;
    });
    
    // Format data untuk report
    const dailyReport = dates.map(date => ({
      tanggal: date,
      hari: moment(date).format('dddd'),
      pendapatan: revenueByDay[date] || 0,
      jumlahSTT: stts.filter(stt => moment(stt.createdAt).format('YYYY-MM-DD') === date).length
    }));
    
    // Hitung total pendapatan
    const totalPendapatan = stts.reduce((total, stt) => total + stt.harga, 0);
    
    res.status(200).json({
      success: true,
      periode: {
        mulai: moment(startDate).format('DD/MM/YYYY'),
        sampai: moment(endDate).format('DD/MM/YYYY')
      },
      totalPendapatan,
      jumlahSTT: stts.length,
      pendapatanHarian: dailyReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan pendapatan harian',
      error: error.message
    });
  }
};

// ================ OTHER REPORTS ================

// @desc      Get return report
// @route     GET /api/reports/returns
// @access    Private
exports.getReturnReport = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    // Filter berdasarkan cabang user jika bukan direktur atau manajer operasional
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
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
    
    const returns = await Return.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('createdBy', 'nama')
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
      })
      .sort('-createdAt');
    
    // Format data untuk report
    const report = returns.map(returnItem => {
      return {
        idRetur: returnItem.idRetur,
        tanggal: moment(returnItem.createdAt).format('DD/MM/YYYY'),
        cabang: returnItem.cabangId ? returnItem.cabangId.namaCabang : '',
        jumlahSTT: returnItem.sttIds.length,
        tanggalKirim: returnItem.tanggalKirim ? moment(returnItem.tanggalKirim).format('DD/MM/YYYY') : '',
        tanggalSampai: returnItem.tanggalSampai ? moment(returnItem.tanggalSampai).format('DD/MM/YYYY') : '',
        status: returnItem.status,
        createdBy: returnItem.createdBy ? returnItem.createdBy.nama : '',
        details: returnItem.sttIds.map(stt => ({
          noSTT: stt.noSTT,
          namaBarang: stt.namaBarang,
          pengirim: stt.pengirimId ? stt.pengirimId.nama : '',
          penerima: stt.penerimaId ? stt.penerimaId.nama : '',
          cabangAsal: stt.cabangAsalId ? stt.cabangAsalId.namaCabang : '',
          cabangTujuan: stt.cabangTujuanId ? stt.cabangTujuanId.namaCabang : '',
          jumlahColly: stt.jumlahColly,
          berat: stt.berat
        }))
      };
    });
    
    res.status(200).json({
      success: true,
      count: report.length,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan retur',
      error: error.message
    });
  }
};

// @desc      Get receivables report
// @route     GET /api/reports/receivables
// @access    Private
exports.getReceivablesReport = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    // Filter berdasarkan cabang user jika bukan direktur atau manajer keuangan
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Tambahkan filter status jika disediakan
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      // Default: hanya yang belum lunas
      filter.status = 'BELUM_LUNAS';
    }
    
    // Tambahkan filter overdue jika disediakan
    if (req.query.overdue !== undefined) {
      filter.overdue = req.query.overdue === 'true';
    }
    
    const collections = await Collection.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang harga paymentType createdAt')
      .sort('-createdAt');
    
    // Format data untuk report
    const report = collections.map(collection => {
      // Hitung total pembayaran dari termin
      let totalBayar = 0;
      if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
        totalBayar = collection.jumlahBayarTermin.reduce((total, termin) => total + termin, 0);
      }
      
      // Hitung sisa tagihan
      const sisaTagihan = collection.totalTagihan - totalBayar;
      
      // Hitung umur piutang (dalam hari)
      const umurPiutang = collection.sttIds.length > 0 ? 
        moment().diff(moment(collection.sttIds[0].createdAt), 'days') : 0;
      
      return {
        noPenagihan: collection.noPenagihan,
        tanggal: moment(collection.createdAt).format('DD/MM/YYYY'),
        cabang: collection.cabangId ? collection.cabangId.namaCabang : '',
        pelanggan: collection.pelangganId ? collection.pelangganId.nama : '',
        tipePelanggan: collection.tipePelanggan,
        jumlahSTT: collection.sttIds.length,
        totalTagihan: collection.totalTagihan,
        totalBayar,
        sisaTagihan,
        status: collection.status,
        overdue: collection.overdue,
        umurPiutang,
        tanggalBayar: collection.tanggalBayar ? moment(collection.tanggalBayar).format('DD/MM/YYYY') : '',
        createdBy: collection.createdBy ? collection.createdBy.nama : '',
        details: collection.sttIds.map(stt => ({
          noSTT: stt.noSTT,
          namaBarang: stt.namaBarang,
          harga: stt.harga,
          paymentType: stt.paymentType,
          tanggal: moment(stt.createdAt).format('DD/MM/YYYY')
        }))
      };
    });
    
    // Hitung total tagihan
    const totalTagihan = collections.reduce((total, collection) => total + collection.totalTagihan, 0);
    
    // Hitung total pembayaran
    let totalPembayaran = 0;
    collections.forEach(collection => {
      if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
        totalPembayaran += collection.jumlahBayarTermin.reduce((total, termin) => total + termin, 0);
      }
    });
    
    // Hitung total sisa tagihan
    const totalSisaTagihan = totalTagihan - totalPembayaran;
    
    res.status(200).json({
      success: true,
      count: report.length,
      totalTagihan,
      totalPembayaran,
      totalSisaTagihan,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan piutang',
      error: error.message
    });
  }
};

// @desc      Get collections report
// @route     GET /api/reports/collections
// @access    Private
exports.getCollectionsReport = async (req, res) => {
  try {
    // Filter berdasarkan query
    const filter = {};
    
    // Filter berdasarkan cabang user jika bukan direktur atau manajer keuangan
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Tambahkan filter status jika disediakan
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
    
    const collections = await Collection.find(filter)
      .populate('cabangId', 'namaCabang')
      .populate('pelangganId', 'nama alamat telepon')
      .populate('createdBy', 'nama')
      .populate('sttIds', 'noSTT namaBarang harga paymentType')
      .sort('-createdAt');
    
    // Format data untuk report
    const report = collections.map(collection => {
      // Hitung total pembayaran dari termin
      let totalBayar = 0;
      const terminDetails = [];
      
      if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
        totalBayar = collection.jumlahBayarTermin.reduce((total, termin) => total + termin, 0);
        
        collection.jumlahBayarTermin.forEach((termin, index) => {
          terminDetails.push({
            termin: index + 1,
            jumlah: termin
          });
        });
      }
      
      return {
        noPenagihan: collection.noPenagihan,
        tanggal: moment(collection.createdAt).format('DD/MM/YYYY'),
        cabang: collection.cabangId ? collection.cabangId.namaCabang : '',
        pelanggan: collection.pelangganId ? collection.pelangganId.nama : '',
        alamat: collection.pelangganId ? collection.pelangganId.alamat : '',
        telepon: collection.pelangganId ? collection.pelangganId.telepon : '',
        tipePelanggan: collection.tipePelanggan,
        jumlahSTT: collection.sttIds.length,
        totalTagihan: collection.totalTagihan,
        totalBayar,
        sisaTagihan: collection.totalTagihan - totalBayar,
        status: collection.status,
        tanggalBayar: collection.tanggalBayar ? moment(collection.tanggalBayar).format('DD/MM/YYYY') : '',
        createdBy: collection.createdBy ? collection.createdBy.nama : '',
        terminPembayaran: terminDetails,
        details: collection.sttIds.map(stt => ({
          noSTT: stt.noSTT,
          namaBarang: stt.namaBarang,
          harga: stt.harga,
          paymentType: stt.paymentType
        }))
      };
    });
    
    // Hitung summary
    const totalTagihan = collections.reduce((total, collection) => total + collection.totalTagihan, 0);
    
    let totalDibayar = 0;
    collections.forEach(collection => {
      if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
        totalDibayar += collection.jumlahBayarTermin.reduce((total, termin) => total + termin, 0);
      }
    });
    
    res.status(200).json({
      success: true,
      count: report.length,
      totalTagihan,
      totalDibayar,
      totalSisa: totalTagihan - totalDibayar,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan penagihan',
      error: error.message
    });
  }
};

// @desc      Get daily cash report by branch
// @route     GET /api/reports/cash-daily/:branchId
// @access    Private
exports.getDailyCashReportByBranch = async (req, res) => {
  try {
    // Validasi cabang
    const branch = await Branch.findById(req.params.branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Cabang tidak ditemukan'
      });
    }
    
    // Tentukan tanggal (default: hari ini)
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startDate = new Date(date.setHours(0, 0, 0, 0));
    const endDate = new Date(date.setHours(23, 59, 59, 999));
    
    // Dapatkan data kas untuk tanggal dan cabang tersebut
    const cashTransactions = await CashBranch.find({
      cabangId: req.params.branchId,
      tanggal: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .populate('cabangId', 'namaCabang')
      .populate('userId', 'nama')
      .sort('tanggal');
    
    // Dapatkan saldo awal (saldo terakhir dari hari sebelumnya)
    const prevDate = new Date(startDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    const lastPrevDayTransaction = await CashBranch.findOne({
      cabangId: req.params.branchId,
      tanggal: { $lt: startDate }
    }).sort('-tanggal');
    
    const saldoAwal = lastPrevDayTransaction ? lastPrevDayTransaction.saldo : 0;
    
    // Format data untuk report
    const report = cashTransactions.map(transaction => ({
      id: transaction._id,
      tanggal: moment(transaction.tanggal).format('DD/MM/YYYY HH:mm'),
      tipeKas: transaction.tipeKas,
      keterangan: transaction.keterangan,
      debet: transaction.debet,
      kredit: transaction.kredit,
      saldo: transaction.saldo,
      createdBy: transaction.userId ? transaction.userId.nama : ''
    }));
    
    // Hitung summary
    const totalDebet = cashTransactions.reduce((total, transaction) => total + transaction.debet, 0);
    const totalKredit = cashTransactions.reduce((total, transaction) => total + transaction.kredit, 0);
    const saldoAkhir = cashTransactions.length > 0 ? 
      cashTransactions[cashTransactions.length - 1].saldo : saldoAwal;
    
    // Group by tipe kas
    const kasByType = {};
    cashTransactions.forEach(transaction => {
      if (!kasByType[transaction.tipeKas]) {
        kasByType[transaction.tipeKas] = {
          totalDebet: 0,
          totalKredit: 0,
          saldoAkhir: 0
        };
      }
      
      kasByType[transaction.tipeKas].totalDebet += transaction.debet;
      kasByType[transaction.tipeKas].totalKredit += transaction.kredit;
    });
    
    // Update saldo akhir per tipe kas
    Object.keys(kasByType).forEach(tipeKas => {
      const lastTransactionOfType = cashTransactions
        .filter(t => t.tipeKas === tipeKas)
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))[0];
      
      kasByType[tipeKas].saldoAkhir = lastTransactionOfType ? lastTransactionOfType.saldo : 0;
    });
    
    res.status(200).json({
      success: true,
      cabang: branch.namaCabang,
      tanggal: moment(startDate).format('DD/MM/YYYY'),
      saldoAwal,
      totalDebet,
      totalKredit,
      saldoAkhir,
      kasByType,
      count: report.length,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan kas harian',
      error: error.message
    });
  }
};

// @desc      Get balance sheet
// @route     GET /api/reports/balance-sheet
// @access    Private
exports.getBalanceSheet = async (req, res) => {
  try {
    // Hanya direktur dan manajer keuangan yang bisa akses laporan keuangan
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk melihat laporan neraca'
      });
    }
    
    // Tentukan tanggal (default: hari ini)
    const date = req.query.date ? new Date(req.query.date) : new Date();
    
    // Get account data
    const accounts = await Account.find().sort('kodeAccount');
    
    // Get journal entries up to the specified date
    const journals = await Journal.find({
      tanggal: { $lte: date },
      status: 'FINAL'
    })
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .sort('tanggal');
    
    // Calculate account balances
    const accountBalances = {};
    
    // Initialize balances
    accounts.forEach(account => {
      accountBalances[account._id.toString()] = {
        kodeAccount: account.kodeAccount,
        namaAccount: account.namaAccount,
        tipeAccount: account.tipeAccount,
        debet: 0,
        kredit: 0,
        saldo: 0
      };
    });
    
    // Calculate balances from journal entries
    journals.forEach(journal => {
      const accountId = journal.accountId._id.toString();
      
      if (accountBalances[accountId]) {
        accountBalances[accountId].debet += journal.debet || 0;
        accountBalances[accountId].kredit += journal.kredit || 0;
      }
    });
    
    // Calculate saldo for each account based on account type
    Object.values(accountBalances).forEach(account => {
      if (['Aset', 'Biaya'].includes(account.tipeAccount)) {
        account.saldo = account.debet - account.kredit;
      } else {
        account.saldo = account.kredit - account.debet;
      }
    });
    
    // Group accounts by type
    const groupedAccounts = {
      Aset: [],
      Kewajiban: [],
      Ekuitas: []
    };
    
    Object.values(accountBalances).forEach(account => {
      if (account.tipeAccount === 'Aset') {
        groupedAccounts.Aset.push(account);
      } else if (account.tipeAccount === 'Kewajiban') {
        groupedAccounts.Kewajiban.push(account);
      } else if (account.tipeAccount === 'Ekuitas') {
        groupedAccounts.Ekuitas.push(account);
      }
    });
    
    // Calculate total for each group
    const totals = {
      totalAset: groupedAccounts.Aset.reduce((total, account) => total + account.saldo, 0),
      totalKewajiban: groupedAccounts.Kewajiban.reduce((total, account) => total + account.saldo, 0),
      totalEkuitas: groupedAccounts.Ekuitas.reduce((total, account) => total + account.saldo, 0)
    };
    
    // Calculate profit/loss from Revenue and Expense accounts
    const pendapatanAccounts = accounts.filter(account => account.tipeAccount === 'Pendapatan');
    const biayaAccounts = accounts.filter(account => account.tipeAccount === 'Biaya');
    
    let totalPendapatan = 0;
    let totalBiaya = 0;
    
    pendapatanAccounts.forEach(account => {
      const accountId = account._id.toString();
      const pendapatan = accountBalances[accountId] ? accountBalances[accountId].saldo : 0;
      totalPendapatan += pendapatan;
    });
    
    biayaAccounts.forEach(account => {
      const accountId = account._id.toString();
      const biaya = accountBalances[accountId] ? accountBalances[accountId].saldo : 0;
      totalBiaya += biaya;
    });
    
    const labaRugi = totalPendapatan - totalBiaya;
    
    // Add profit/loss to equity
    totals.totalEkuitas += labaRugi;
    
    res.status(200).json({
      success: true,
      tanggal: moment(date).format('DD/MM/YYYY'),
      aset: groupedAccounts.Aset,
      kewajiban: groupedAccounts.Kewajiban,
      ekuitas: groupedAccounts.Ekuitas,
      totalAset: totals.totalAset,
      totalKewajiban: totals.totalKewajiban,
      totalEkuitas: totals.totalEkuitas,
      labaRugi
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan neraca',
      error: error.message
    });
  }
};

// @desc      Get profit/loss report
// @route     GET /api/reports/profit-loss
// @access    Private
exports.getProfitLossReport = async (req, res) => {
  try {
    // Hanya direktur dan manajer keuangan yang bisa akses laporan keuangan
    if (req.user.role !== 'direktur' && req.user.role !== 'manajer_keuangan') {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk melihat laporan laba rugi'
      });
    }
    
    // Tentukan periode laporan
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Get account data
    const accounts = await Account.find().sort('kodeAccount');
    
    // Get journal entries for the specified period
    const journals = await Journal.find({
      tanggal: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'FINAL'
    })
      .populate('accountId', 'kodeAccount namaAccount tipeAccount')
      .sort('tanggal');
    
    // Calculate account balances
    const accountBalances = {};
    
    // Initialize balances for accounts
    accounts.forEach(account => {
      accountBalances[account._id.toString()] = {
        kodeAccount: account.kodeAccount,
        namaAccount: account.namaAccount,
        tipeAccount: account.tipeAccount,
        debet: 0,
        kredit: 0,
        saldo: 0
      };
    });
    
    // Calculate balances from journal entries
    journals.forEach(journal => {
      const accountId = journal.accountId._id.toString();
      
      if (accountBalances[accountId]) {
        accountBalances[accountId].debet += journal.debet || 0;
        accountBalances[accountId].kredit += journal.kredit || 0;
      }
    });
    
    // Calculate saldo for each account based on account type
    Object.values(accountBalances).forEach(account => {
      if (account.tipeAccount === 'Biaya') {
        account.saldo = account.debet - account.kredit;
      } else if (account.tipeAccount === 'Pendapatan') {
        account.saldo = account.kredit - account.debet;
      }
    });
    
    // Group accounts by type
    const groupedAccounts = {
      Pendapatan: [],
      Biaya: []
    };
    
    Object.values(accountBalances).forEach(account => {
      if (account.tipeAccount === 'Pendapatan') {
        groupedAccounts.Pendapatan.push(account);
      } else if (account.tipeAccount === 'Biaya') {
        groupedAccounts.Biaya.push(account);
      }
    });
    
    // Calculate total for each group
    const totalPendapatan = groupedAccounts.Pendapatan.reduce((total, account) => total + account.saldo, 0);
    const totalBiaya = groupedAccounts.Biaya.reduce((total, account) => total + account.saldo, 0);
    const labaRugiBersih = totalPendapatan - totalBiaya;
    
    res.status(200).json({
      success: true,
      periode: {
        mulai: moment(startDate).format('DD/MM/YYYY'),
        sampai: moment(endDate).format('DD/MM/YYYY')
      },
      pendapatan: groupedAccounts.Pendapatan,
      biaya: groupedAccounts.Biaya,
      totalPendapatan,
      totalBiaya,
      labaRugiBersih
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan laporan laba rugi',
      error: error.message
    });
  }
};

// @desc      Get dashboard statistics
// @route     GET /api/reports/dashboard-stats
// @access    Private
exports.getDashboardStats = async (req, res) => {
  try {
    // Tentukan periode (default: 30 hari terakhir)
    const endDate = new Date();
    const startDate = req.query.startDate ? 
      new Date(req.query.startDate) : 
      new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Filter berdasarkan cabang jika bukan direktur atau manajer
    const filter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (req.user.role !== 'direktur' && !req.user.role.includes('manajer_')) {
      filter.cabangId = req.user.cabangId;
    }
    
    // Tambahkan filter cabang jika disediakan
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Get STT data
    const stts = await STT.find(filter)
      .populate('cabangAsalId', 'namaCabang')
      .populate('cabangTujuanId', 'namaCabang')
      .populate('cabangId', 'namaCabang');
    
    // Get total revenue
    const totalPendapatan = stts.reduce((total, stt) => total + stt.harga, 0);
    
    // Get count by status
    const sttByStatus = {
      PENDING: stts.filter(stt => stt.status === 'PENDING').length,
      MUAT: stts.filter(stt => stt.status === 'MUAT').length,
      TRANSIT: stts.filter(stt => stt.status === 'TRANSIT').length,
      LANSIR: stts.filter(stt => stt.status === 'LANSIR').length,
      TERKIRIM: stts.filter(stt => stt.status === 'TERKIRIM').length,
      RETURN: stts.filter(stt => stt.status === 'RETURN').length
    };
    
    // Get collections data
    const collections = await Collection.find(filter);
    
    // Calculate total receivables
    let totalPiutang = 0;
    let piutangTerbayar = 0;
    
    collections.forEach(collection => {
      totalPiutang += collection.totalTagihan;
      
      if (collection.jumlahBayarTermin && collection.jumlahBayarTermin.length > 0) {
        piutangTerbayar += collection.jumlahBayarTermin.reduce((total, termin) => total + termin, 0);
      }
    });
    
    const sisaPiutang = totalPiutang - piutangTerbayar;
    
    // Get vehicles data
    const vehicles = await Vehicle.find();
    const vehicleCount = {
      total: vehicles.length,
      lansir: vehicles.filter(vehicle => vehicle.tipe === 'lansir').length,
      antarCabang: vehicles.filter(vehicle => vehicle.tipe === 'antar_cabang').length
    };
    
    // Get branch data
    const branches = await Branch.find();
    
    // Get customer data
    const customers = await Customer.find();
    const customerCount = {
      total: customers.length,
      pengirim: customers.filter(customer => customer.tipe === 'pengirim').length,
      penerima: customers.filter(customer => customer.tipe === 'penerima').length,
      keduanya: customers.filter(customer => customer.tipe === 'keduanya').length
    };
    
    // Get employee data
    const employees = await User.find({ aktif: true });
    
    // Get daily revenue for chart
    const dailyRevenue = {};
    
    stts.forEach(stt => {
      const dateKey = moment(stt.createdAt).format('YYYY-MM-DD');
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + stt.harga;
    });
    
    // Generate array for chart
    const revenueChartData = Object.keys(dailyRevenue).map(date => ({
      tanggal: date,
      pendapatan: dailyRevenue[date]
    })).sort((a, b) => moment(a.tanggal).diff(moment(b.tanggal)));
    
    // Get revenue by branch for chart
    const branchRevenue = {};
    
    stts.forEach(stt => {
      const branch = stt.cabangId ? stt.cabangId.namaCabang : 'Unknown';
      branchRevenue[branch] = (branchRevenue[branch] || 0) + stt.harga;
    });
    
    const branchRevenueChartData = Object.keys(branchRevenue).map(branch => ({
      cabang: branch,
      pendapatan: branchRevenue[branch]
    })).sort((a, b) => b.pendapatan - a.pendapatan);
    
    res.status(200).json({
      success: true,
      periode: {
        mulai: moment(startDate).format('DD/MM/YYYY'),
        sampai: moment(endDate).format('DD/MM/YYYY')
      },
      totalSTT: stts.length,
      totalPendapatan,
      sttByStatus,
      totalPiutang,
      piutangTerbayar,
      sisaPiutang,
      persentasePiutang: totalPiutang > 0 ? (piutangTerbayar / totalPiutang) * 100 : 0,
      jumlahCabang: branches.length,
      jumlahKendaraan: vehicleCount,
      jumlahPelanggan: customerCount,
      jumlahPegawai: employees.length,
      grafikPendapatanHarian: revenueChartData,
      grafikPendapatanPerCabang: branchRevenueChartData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan statistik dashboard',
      error: error.message
    });
  }
};

// ================ EXPORT REPORTS ================

// @desc      Export report to Excel
// @route     GET /api/reports/export/:reportType
// @access    Private
exports.exportReport = async (req, res) => {
  try {
    const { reportType } = req.params;
    
    // Validate report type
    const validReportTypes = [
      'sales', 'revenue', 'returns', 'receivables', 
      'collections', 'cash-daily', 'loading-manifest'
    ];
    
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe laporan tidak valid'
      });
    }
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Samudra ERP';
    workbook.created = new Date();
    
    // Tanggal untuk nama file
    const dateStr = moment().format('YYYYMMDD');
    let filename;
    
    // Generate report based on type
    switch (reportType) {
      case 'sales':
        filename = `Laporan_Penjualan_${dateStr}.xlsx`;
        await generateSalesExcel(workbook, req);
        break;
      case 'revenue':
        filename = `Laporan_Pendapatan_${dateStr}.xlsx`;
        await generateRevenueExcel(workbook, req);
        break;
      case 'returns':
        filename = `Laporan_Retur_${dateStr}.xlsx`;
        await generateReturnsExcel(workbook, req);
        break;
      case 'receivables':
        filename = `Laporan_Piutang_${dateStr}.xlsx`;
        await generateReceivablesExcel(workbook, req);
        break;
      case 'collections':
        filename = `Laporan_Penagihan_${dateStr}.xlsx`;
        await generateCollectionsExcel(workbook, req);
        break;
      case 'cash-daily':
        filename = `Laporan_Kas_Harian_${dateStr}.xlsx`;
        await generateCashDailyExcel(workbook, req);
        break;
      case 'loading-manifest':
        filename = `Laporan_Manifest_Muat_${dateStr}.xlsx`;
        await generateLoadingManifestExcel(workbook, req);
        break;
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Write to response
    await workbook.xlsx.write(res);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal ekspor laporan',
      error: error.message
    });
  }
};

// Helper function to generate sales excel report
async function generateSalesExcel(workbook, req) {
  // Filter setup similar to getSalesReport
  const filter = {};
  
  if (req.user.role !== 'direktur' && req.user.role !== 'manajer_operasional' && req.user.role !== 'manajer_keuangan') {
    filter.cabangId = req.user.cabangId;
  }
  
  if (req.query.cabangId) {
    filter.cabangId = req.query.cabangId;
  }
  
  if (req.query.startDate && req.query.endDate) {
    filter.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }
  
  if (req.query.paymentType) {
    filter.paymentType = req.query.paymentType;
  }
  
  const stts = await STT.find(filter)
    .populate('cabangAsalId', 'namaCabang')
    .populate('cabangTujuanId', 'namaCabang')
    .populate('pengirimId', 'nama')
    .populate('penerimaId', 'nama')
    .populate('userId', 'nama')
    .populate('cabangId', 'namaCabang')
    .sort('-createdAt');
  
  // Create worksheet
  const sheet = workbook.addWorksheet('Laporan Penjualan');
  
  // Add headers
  sheet.addRow(['LAPORAN PENJUALAN']);
  sheet.addRow(['Samudra Ekspedisi']);
  
  if (req.query.startDate && req.query.endDate) {
    sheet.addRow([`Periode: ${moment(req.query.startDate).format('DD/MM/YYYY')} - ${moment(req.query.endDate).format('DD/MM/YYYY')}`]);
  }
  
  sheet.addRow(['']);
  
  // Add column headers
  sheet.addRow([
    'No. STT', 'Tanggal', 'Cabang Asal', 'Cabang Tujuan', 
    'Pengirim', 'Penerima', 'Nama Barang', 'Komoditi', 
    'Jumlah Colly', 'Berat (kg)', 'Harga/Kg', 'Total Harga', 
    'Jenis Pembayaran', 'Status', 'Dibuat Oleh'
  ]);
  
  // Add data rows
  stts.forEach(stt => {
    sheet.addRow([
      stt.noSTT,
      moment(stt.createdAt).format('DD/MM/YYYY'),
      stt.cabangAsalId ? stt.cabangAsalId.namaCabang : '',
      stt.cabangTujuanId ? stt.cabangTujuanId.namaCabang : '',
      stt.pengirimId ? stt.pengirimId.nama : '',
      stt.penerimaId ? stt.penerimaId.nama : '',
      stt.namaBarang,
      stt.komoditi,
      stt.jumlahColly,
      stt.berat,
      stt.hargaPerKilo,
      stt.harga,
      stt.paymentType,
      stt.status,
      stt.userId ? stt.userId.nama : ''
    ]);
  });
  
  // Add summary
  sheet.addRow(['']);
  sheet.addRow(['RINGKASAN']);
  sheet.addRow(['Total STT', stts.length]);
  sheet.addRow(['Total Pendapatan', stts.reduce((total, stt) => total + stt.harga, 0)]);
  
  // Format cells
  sheet.getColumn(9).numFmt = '#,##0';  // Jumlah Colly
  sheet.getColumn(10).numFmt = '#,##0.00';  // Berat
  sheet.getColumn(11).numFmt = '#,##0.00';  // Harga/Kg
  sheet.getColumn(12).numFmt = '#,##0.00';  // Total Harga
  
  // Style headers
  sheet.getRow(1).font = { bold: true, size: 16 };
  sheet.getRow(5).font = { bold: true };
  
  // Adjust column widths
  sheet.columns.forEach(column => {
    column.width = 15;
  });
}

// Helper function for other report types would be similar
// You would implement generateRevenueExcel, generateReturnsExcel, etc.
// based on the corresponding controller methods