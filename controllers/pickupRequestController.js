// controllers/pickupRequestController.js - Improved pickup request controller
const PickupRequest = require('../models/PickupRequest');
const Customer = require('../models/Customer');
const Pickup = require('../models/Pickup');
const { paginationResult } = require('../utils/helpers');
const config = require('../config/config');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');

// Define standard population paths for code reuse
const populateFields = [
  { path: 'pengirimId', select: 'nama alamat telepon email kota provinsi kelurahan kecamatan' },
  { path: 'userId', select: 'nama' },
  { path: 'cabangId', select: 'namaCabang' },
  { path: 'pickupId', select: 'noPengambilan waktuBerangkat waktuPulang status' }
];

// @desc      Get all pickup requests
// @route     GET /api/pickup-requests
// @access    Private
exports.getPickupRequests = asyncHandler(async (req, res) => {
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
      { tujuan: { $regex: searchRegex } },
      { notes: { $regex: searchRegex } }
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
    .populate(populateFields)
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
});

// @desc      Get single pickup request
// @route     GET /api/pickup-requests/:id
// @access    Private
exports.getPickupRequest = asyncHandler(async (req, res) => {
  const pickupRequest = await PickupRequest.findById(req.params.id)
    .populate(populateFields);
  
  if (!pickupRequest) {
    return res.status(404).json({
      success: false,
      message: 'Request pengambilan tidak ditemukan'
    });
  }
  
  // Check if user has access to this pickup request
  if (
    req.user.role !== 'direktur' &&
    req.user.role !== 'manajerOperasional' &&
    req.user.cabangId.toString() !== pickupRequest.cabangId._id.toString() &&
    req.user._id.toString() !== pickupRequest.userId._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki akses ke request pengambilan ini'
    });
  }
  
  res.status(200).json({
    success: true,
    data: pickupRequest
  });
});

// @desc      Create new pickup request
// @route     POST /api/pickup-requests
// @access    Private
exports.createPickupRequest = asyncHandler(async (req, res) => {
  // Validate customer exists
  if (req.body.pengirimId) {
    const customer = await Customer.findById(req.body.pengirimId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pengirim tidak ditemukan'
      });
    }
    
    // Validate sender is of correct type
    if (customer.tipe !== 'pengirim' && customer.tipe !== 'keduanya') {
      return res.status(400).json({
        success: false,
        message: 'Customer bukan pengirim'
      });
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
    .populate(populateFields);
  
  res.status(201).json({
    success: true,
    data: populatedPickupRequest
  });
});

// @desc      Update pickup request
// @route     PUT /api/pickup-requests/:id
// @access    Private
exports.updatePickupRequest = asyncHandler(async (req, res) => {
  let pickupRequest = await PickupRequest.findById(req.params.id);
  
  if (!pickupRequest) {
    return res.status(404).json({
      success: false,
      message: 'Request pengambilan tidak ditemukan'
    });
  }
  
  // Check if user can update this pickup request
  if (
    req.user.role !== 'direktur' &&
    req.user.role !== 'manajerOperasional' &&
    req.user.role !== 'kepalaGudang' &&
    req.user.cabangId.toString() !== pickupRequest.cabangId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki akses untuk mengubah request pengambilan ini'
    });
  }
  
  // Check if request is already finished
  if (pickupRequest.status === 'FINISH') {
    return res.status(400).json({
      success: false,
      message: 'Request pengambilan yang sudah selesai tidak dapat diubah'
    });
  }
  
  // Validate customer if being updated
  if (req.body.pengirimId) {
    const customer = await Customer.findById(req.body.pengirimId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Pengirim tidak ditemukan'
      });
    }
    
    // Validate sender is of correct type
    if (customer.tipe !== 'pengirim' && customer.tipe !== 'keduanya') {
      return res.status(400).json({
        success: false,
        message: 'Customer bukan pengirim'
      });
    }
  }
  
  // Update pickup request
  pickupRequest = await PickupRequest.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate(populateFields);
  
  res.status(200).json({
    success: true,
    data: pickupRequest
  });
});

// @desc      Update pickup request status
// @route     PUT /api/pickup-requests/:id/status
// @access    Private
exports.updatePickupRequestStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status harus diisi'
    });
  }
  
  // Validate status
  if (!['PENDING', 'FINISH', 'CANCELLED'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status tidak valid'
    });
  }
  
  // Find pickup request
  const pickupRequest = await PickupRequest.findById(req.params.id);
  
  if (!pickupRequest) {
    return res.status(404).json({
      success: false,
      message: 'Request pengambilan tidak ditemukan'
    });
  }
  
  // Check if user can update this pickup request's status
  if (
    req.user.role !== 'direktur' &&
    req.user.role !== 'manajerOperasional' &&
    req.user.role !== 'kepalaGudang' &&
    req.user.cabangId.toString() !== pickupRequest.cabangId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki akses untuk mengubah status request pengambilan ini'
    });
  }
  
  // Optional notes for status change
  const updateData = {
    status,
    updatedAt: new Date()
  };
  
  if (notes) {
    updateData.notes = notes;
  }
  
  // If status is CANCELLED and request has a linked pickup, update the pickup status
  if (status === 'CANCELLED' && pickupRequest.pickupId) {
    await Pickup.findByIdAndUpdate(
      pickupRequest.pickupId,
      { status: 'CANCELLED', notes: notes || 'Request dibatalkan' }
    );
  }
  
  // Update pickup request
  const updatedPickupRequest = await PickupRequest.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate(populateFields);
  
  res.status(200).json({
    success: true,
    data: updatedPickupRequest
  });
});

// @desc      Get pending pickup requests
// @route     GET /api/pickup-requests/pending
// @access    Private
exports.getPendingPickupRequests = asyncHandler(async (req, res) => {
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
    .populate(populateFields)
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
});

// @desc      Delete pickup request
// @route     DELETE /api/pickup-requests/:id
// @access    Private
exports.deletePickupRequest = asyncHandler(async (req, res) => {
  const pickupRequest = await PickupRequest.findById(req.params.id);
  
  if (!pickupRequest) {
    return res.status(404).json({
      success: false,
      message: 'Request pengambilan tidak ditemukan'
    });
  }
  
  // Check if user can delete this pickup request
  if (
    req.user.role !== 'direktur' &&
    req.user.role !== 'manajerOperasional' &&
    req.user.role !== 'kepalaGudang' &&
    req.user.cabangId.toString() !== pickupRequest.cabangId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki akses untuk menghapus request pengambilan ini'
    });
  }
  
  // Check if request is already finished
  if (pickupRequest.status === 'FINISH') {
    return res.status(400).json({
      success: false,
      message: 'Request pengambilan yang sudah selesai tidak dapat dihapus'
    });
  }
  
  await pickupRequest.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Request pengambilan berhasil dihapus',
    data: {}
  });
});

// @desc      Link pickup request to pickup
// @route     PUT /api/pickup-requests/:id/link
// @access    Private
exports.linkToPickup = asyncHandler(async (req, res) => {
  const { pickupId } = req.body;
  
  if (!pickupId) {
    return res.status(400).json({
      success: false,
      message: 'ID Pengambilan harus diisi'
    });
  }
  
  // Validate pickup exists
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) {
    return res.status(404).json({
      success: false,
      message: 'Pengambilan tidak ditemukan'
    });
  }
  
  // Find pickup request
  const pickupRequest = await PickupRequest.findById(req.params.id);
  if (!pickupRequest) {
    return res.status(404).json({
      success: false,
      message: 'Request pengambilan tidak ditemukan'
    });
  }
  
  // Check if user can link this pickup request
  if (
    req.user.role !== 'direktur' &&
    req.user.role !== 'manajerOperasional' &&
    req.user.role !== 'kepalaGudang' &&
    req.user.cabangId.toString() !== pickupRequest.cabangId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki akses untuk mengaitkan request pengambilan ini'
    });
  }
  
  // Check if request is already linked to another pickup
  if (pickupRequest.pickupId && pickupRequest.pickupId.toString() !== pickupId) {
    return res.status(400).json({
      success: false,
      message: 'Request pengambilan sudah terkait dengan pengambilan lain'
    });
  }
  
  // Update pickup request
  const updatedPickupRequest = await PickupRequest.findByIdAndUpdate(
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
  ).populate(populateFields);
  
  res.status(200).json({
    success: true,
    data: updatedPickupRequest
  });
});

// @desc      Get pickup requests by customer
// @route     GET /api/pickup-requests/customer/:customerId
// @access    Private
exports.getPickupRequestsByCustomer = asyncHandler(async (req, res) => {
  const customerId = req.params.customerId;
  
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return res.status(400).json({
      success: false,
      message: 'ID Pelanggan tidak valid'
    });
  }
  
  // Validate customer exists
  const customer = await Customer.findById(customerId);
  if (!customer) {
    return res.status(404).json({
      success: false,
      message: 'Pelanggan tidak ditemukan'
    });
  }
  
  // Build filter
  const filter = {
    pengirimId: customerId
  };
  
  // Filter by branch if not director or operations manager
  if (req.user.role !== 'direktur' && req.user.role !== 'manajerOperasional') {
    filter.cabangId = req.user.cabangId;
  }
  
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
    .populate(populateFields)
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
});
