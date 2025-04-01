// controllers/pickupRequestController.js
const PickupRequest = require('../models/PickupRequest');
const Customer = require('../models/Customer');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

// @desc      Get all pickup requests
// @route     GET /api/pickup-requests
// @access    Private
exports.getPickupRequests = async (req, res, next) => {
  try {
    // Build filter based on query
    const filter = {};
    
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    } else if (req.user.role !== 'direktur' && req.user.role !== 'manajerOperasional') {
      // If not director or operations manager, only show pickup requests in your own branch
      filter.cabangId = req.user.cabangId;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.pengirimId) {
      filter.pengirimId = req.query.pengirimId;
    }
    
    // Search by text
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      // Get customer IDs that match the search
      const customers = await Customer.find({
        nama: { $regex: searchRegex }
      }).select('_id');
      
      const customerIds = customers.map(customer => customer._id);
      
      // Search in multiple fields
      filter.$or = [
        { noRequest: { $regex: searchRegex } },
        { alamatPengambilan: { $regex: searchRegex } },
        { tujuan: { $regex: searchRegex } }
      ];
      
      // Add customer IDs to the search
      if (customerIds.length > 0) {
        filter.$or.push({ pengirimId: { $in: customerIds } });
      }
    }
    
    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filter.tanggal = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate + 'T23:59:59.999Z')
      };
    } else if (req.query.startDate) {
      filter.tanggal = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.tanggal = { $lte: new Date(req.query.endDate + 'T23:59:59.999Z') };
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get total count
    const total = await PickupRequest.countDocuments(filter);
    
    // Calculate pagination
    const pagination = paginationResult(page, limit, total);
    
    // Sorting
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };
    
    // Execute query
    const pickupRequests = await PickupRequest.find(filter)
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('pickupId', 'noPengambilan')
      .skip(startIndex)
      .limit(limit)
      .sort(sort);
    
    res.status(200).json({
      success: true,
      count: pickupRequests.length,
      pagination: pagination.pagination,
      total,
      data: pickupRequests
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal mendapatkan data request pengambilan: ${error.message}`, 500));
  }
};

// @desc      Get single pickup request
// @route     GET /api/pickup-requests/:id
// @access    Private
exports.getPickupRequest = async (req, res, next) => {
  try {
    const pickupRequest = await PickupRequest.findById(req.params.id)
      .populate('pengirimId', 'nama alamat telepon email kota provinsi kelurahan kecamatan')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('pickupId', 'noPengambilan waktuBerangkat waktuPulang');
    
    if (!pickupRequest) {
      return next(new ErrorResponse('Request pengambilan tidak ditemukan', 404));
    }
    
    res.status(200).json({
      success: true,
      data: pickupRequest
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal mendapatkan data request pengambilan: ${error.message}`, 500));
  }
};

// @desc      Create new pickup request
// @route     POST /api/pickup-requests
// @access    Private
exports.createPickupRequest = async (req, res, next) => {
  try {
    // Validate customer exists
    if (req.body.pengirimId) {
      const customer = await Customer.findById(req.body.pengirimId);
      if (!customer) {
        return next(new ErrorResponse('Pengirim tidak ditemukan', 404));
      }
    }
    
    // Set userId and cabangId from logged in user
    req.body.userId = req.user.id;
    
    // Use branch from body if provided, otherwise use user's branch
    if (!req.body.cabangId) {
      req.body.cabangId = req.user.cabangId;
    }
    
    // Set date if not provided
    if (!req.body.tanggal) {
      req.body.tanggal = new Date();
    }
    
    // Create new pickup request
    const pickupRequest = await PickupRequest.create(req.body);
    
    // Populate data for response
    const populatedPickupRequest = await PickupRequest.findById(pickupRequest._id)
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang');
    
    res.status(201).json({
      success: true,
      data: populatedPickupRequest
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal membuat request pengambilan baru: ${error.message}`, 500));
  }
};

// @desc      Update pickup request
// @route     PUT /api/pickup-requests/:id
// @access    Private
exports.updatePickupRequest = async (req, res, next) => {
  try {
    const pickupRequest = await PickupRequest.findById(req.params.id);
    
    if (!pickupRequest) {
      return next(new ErrorResponse('Request pengambilan tidak ditemukan', 404));
    }
    
    // Check if request is already finished
    if (pickupRequest.status === 'FINISH') {
      return next(new ErrorResponse('Request pengambilan yang sudah selesai tidak dapat diubah', 400));
    }
    
    // Update pickup request
    const updatedPickupRequest = await PickupRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang');
    
    res.status(200).json({
      success: true,
      data: updatedPickupRequest
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal mengupdate request pengambilan: ${error.message}`, 500));
  }
};

// @desc      Update pickup request status
// @route     PUT /api/pickup-requests/:id/status
// @access    Private
exports.updatePickupRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return next(new ErrorResponse('Status harus diisi', 400));
    }
    
    // Validate status
    if (!['PENDING', 'FINISH', 'CANCELLED'].includes(status)) {
      return next(new ErrorResponse('Status tidak valid', 400));
    }
    
    // Optional notes for status change
    const updateData = { 
      status,
      updatedAt: new Date()
    };
    
    if (req.body.notes) {
      updateData.notes = req.body.notes;
    }
    
    const pickupRequest = await PickupRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang');
    
    if (!pickupRequest) {
      return next(new ErrorResponse('Request pengambilan tidak ditemukan', 404));
    }
    
    res.status(200).json({
      success: true,
      data: pickupRequest
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal mengupdate status request pengambilan: ${error.message}`, 500));
  }
};

// @desc      Get pending pickup requests
// @route     GET /api/pickup-requests/pending
// @access    Private
exports.getPendingPickupRequests = async (req, res, next) => {
  try {
    // Filter for pickup requests with status PENDING
    const filter = {
      status: 'PENDING'
    };
    
    // Filter by user's branch if not director or operations manager
    if (req.user.role !== 'direktur' && req.user.role !== 'manajerOperasional') {
      filter.cabangId = req.user.cabangId;
    }
    
    // Add branch filter if provided
    if (req.query.cabangId) {
      filter.cabangId = req.query.cabangId;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get total count
    const total = await PickupRequest.countDocuments(filter);
    
    // Calculate pagination
    const pagination = paginationResult(page, limit, total);
    
    const pendingRequests = await PickupRequest.find(filter)
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: pendingRequests.length,
      pagination: pagination.pagination,
      total,
      data: pendingRequests
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal mendapatkan data request pengambilan pending: ${error.message}`, 500));
  }
};

// @desc      Delete pickup request
// @route     DELETE /api/pickup-requests/:id
// @access    Private
exports.deletePickupRequest = async (req, res, next) => {
  try {
    const pickupRequest = await PickupRequest.findById(req.params.id);
    
    if (!pickupRequest) {
      return next(new ErrorResponse('Request pengambilan tidak ditemukan', 404));
    }
    
    // Check if request is already finished
    if (pickupRequest.status === 'FINISH') {
      return next(new ErrorResponse('Request pengambilan yang sudah selesai tidak dapat dihapus', 400));
    }
    
    await pickupRequest.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Request pengambilan berhasil dihapus',
      data: {}
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal menghapus request pengambilan: ${error.message}`, 500));
  }
};

// @desc      Link pickup request to pickup
// @route     PUT /api/pickup-requests/:id/link
// @access    Private
exports.linkToPickup = async (req, res, next) => {
  try {
    const { pickupId } = req.body;
    
    if (!pickupId) {
      return next(new ErrorResponse('ID Pengambilan harus diisi', 400));
    }
    
    // Update pickup request
    const pickupRequest = await PickupRequest.findByIdAndUpdate(
      req.params.id,
      { 
        pickupId,
        status: 'FINISH',
        updatedAt: new Date()
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('pickupId', 'noPengambilan');
    
    if (!pickupRequest) {
      return next(new ErrorResponse('Request pengambilan tidak ditemukan', 404));
    }
    
    res.status(200).json({
      success: true,
      data: pickupRequest
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal mengaitkan request pengambilan dengan pengambilan: ${error.message}`, 500));
  }
};

// @desc      Get pickup requests by customer
// @route     GET /api/pickup-requests/customer/:customerId
// @access    Private
exports.getPickupRequestsByCustomer = async (req, res, next) => {
  try {
    const customerId = req.params.customerId;
    
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return next(new ErrorResponse('ID Pelanggan tidak valid', 400));
    }
    
    // Build filter
    const filter = {
      pengirimId: customerId
    };
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get total count
    const total = await PickupRequest.countDocuments(filter);
    
    // Calculate pagination
    const pagination = paginationResult(page, limit, total);
    
    // Execute query
    const pickupRequests = await PickupRequest.find(filter)
      .populate('pengirimId', 'nama alamat telepon')
      .populate('userId', 'nama')
      .populate('cabangId', 'namaCabang')
      .populate('pickupId', 'noPengambilan')
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: pickupRequests.length,
      pagination: pagination.pagination,
      total,
      data: pickupRequests
    });
  } catch (error) {
    next(new ErrorResponse(`Gagal mendapatkan data request pengambilan pelanggan: ${error.message}`, 500));
  }
};