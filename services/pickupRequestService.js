// services/pickupRequestService.js
const PickupRequest = require('../models/PickupRequest');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Pickup = require('../models/Pickup');
const ErrorResponse = require('../utils/errorResponse');
const { paginationResult } = require('../utils/helpers');

/**
 * Get filtered pickup requests with pagination
 */
exports.getFilteredPickupRequests = async (filter = {}, options = {}) => {
  const { page = 1, limit = 10, sortField = 'createdAt', sortOrder = 'desc' } = options;
  
  const startIndex = (page - 1) * limit;
  const total = await PickupRequest.countDocuments(filter);
  const pagination = paginationResult(page, limit, total);
  
  const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
  
  const pickupRequests = await PickupRequest.find(filter)
    .populate('pengirimId', 'nama alamat telepon')
    .populate('userId', 'nama')
    .populate('cabangId', 'namaCabang')
    .populate('pickupId', 'noPengambilan')
    .skip(startIndex)
    .limit(limit)
    .sort(sort);
  
  return {
    data: pickupRequests,
    count: pickupRequests.length,
    pagination: pagination.pagination,
    total
  };
};

/**
 * Get pickup request by ID
 */
exports.getPickupRequestById = async (id) => {
  const pickupRequest = await PickupRequest.findById(id)
    .populate('pengirimId', 'nama alamat telepon email kota provinsi kelurahan kecamatan')
    .populate('userId', 'nama')
    .populate('cabangId', 'namaCabang')
    .populate('pickupId', 'noPengambilan waktuBerangkat waktuPulang');
  
  if (!pickupRequest) {
    throw new ErrorResponse('Request pengambilan tidak ditemukan', 404);
  }
  
  return pickupRequest;
};

/**
 * Create a new pickup request
 */
exports.createPickupRequest = async (requestData, currentUser) => {
  // Validate customer exists
  if (requestData.pengirimId) {
    const customer = await Customer.findById(requestData.pengirimId);
    if (!customer) {
      throw new ErrorResponse('Pengirim tidak ditemukan', 404);
    }
  }
  
  // Set user ID
  requestData.userId = currentUser.id;
  
  // Use branch from data if provided, otherwise use user's branch
  if (!requestData.cabangId) {
    requestData.cabangId = currentUser.cabangId;
  }
  
  // Set date if not provided
  if (!requestData.tanggal) {
    requestData.tanggal = new Date();
  }
  
  // Create new pickup request
  const pickupRequest = await PickupRequest.create(requestData);
  
  // Populate data for response
  return PickupRequest.findById(pickupRequest._id)
    .populate('pengirimId', 'nama alamat telepon')
    .populate('userId', 'nama')
    .populate('cabangId', 'namaCabang');
};

/**
 * Update pickup request
 */
exports.updatePickupRequest = async (id, updateData) => {
  const pickupRequest = await PickupRequest.findById(id);
  
  if (!pickupRequest) {
    throw new ErrorResponse('Request pengambilan tidak ditemukan', 404);
  }
  
  // Check if request is already finished
  if (pickupRequest.status === 'FINISH') {
    throw new ErrorResponse('Request pengambilan yang sudah selesai tidak dapat diubah', 400);
  }
  
  // Update pickup request
  return PickupRequest.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('pengirimId', 'nama alamat telepon')
    .populate('userId', 'nama')
    .populate('cabangId', 'namaCabang');
};

/**
 * Update pickup request status
 */
exports.updatePickupRequestStatus = async (id, statusData) => {
  const { status, notes } = statusData;
  
  // Validate status
  if (!['PENDING', 'FINISH', 'CANCELLED'].includes(status)) {
    throw new ErrorResponse('Status tidak valid', 400);
  }
  
  // Create update data
  const updateData = { 
    status,
    updatedAt: new Date()
  };
  
  if (notes) {
    updateData.notes = notes;
  }
  
  const pickupRequest = await PickupRequest.findByIdAndUpdate(
    id,
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
    throw new ErrorResponse('Request pengambilan tidak ditemukan', 404);
  }
  
  return pickupRequest;
};

/**
 * Delete pickup request
 */
exports.deletePickupRequest = async (id) => {
  const pickupRequest = await PickupRequest.findById(id);
  
  if (!pickupRequest) {
    throw new ErrorResponse('Request pengambilan tidak ditemukan', 404);
  }
  
  // Check if request is already finished
  if (pickupRequest.status === 'FINISH') {
    throw new ErrorResponse('Request pengambilan yang sudah selesai tidak dapat dihapus', 400);
  }
  
  await pickupRequest.deleteOne();
  
  return { message: 'Request pengambilan berhasil dihapus' };
};

/**
 * Link pickup request to pickup
 */
exports.linkToPickup = async (id, pickupId) => {
  // Validate pickup exists
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) {
    throw new ErrorResponse('Pengambilan tidak ditemukan', 404);
  }
  
  // Update pickup request
  const pickupRequest = await PickupRequest.findByIdAndUpdate(
    id,
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
    throw new ErrorResponse('Request pengambilan tidak ditemukan', 404);
  }
  
  return pickupRequest;
};