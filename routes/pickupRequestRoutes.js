// routes/pickupRequestRoutes.js - Improved pickup request routes
const express = require('express');
const {
  getPickupRequests,
  getPickupRequest,
  createPickupRequest,
  updatePickupRequest,
  updatePickupRequestStatus,
  getPendingPickupRequests,
  deletePickupRequest,
  linkToPickup,
  getPickupRequestsByCustomer
} = require('../controllers/pickupRequestController');
const { protect, authorize, checkPermission } = require('../middlewares/auth');
const { validateBody, validateObjectId } = require('../middlewares/validator');
const asyncHandler = require('../middlewares/asyncHandler');

// Create validation schema for pickup request
// Note: This would ideally be in a separate validation file
const { z } = require('zod');
const mongoose = require('mongoose');

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return id === null || id === undefined || mongoose.Types.ObjectId.isValid(id);
};

// Schema for creating a pickup request
const createSchema = z.object({
  pengirimId: z.string().refine(isValidObjectId, {
    message: "ID pengirim tidak valid",
  }),
  alamatPengambilan: z.string().min(3, "Alamat pengambilan minimal 3 karakter"),
  tujuan: z.string().min(2, "Tujuan minimal 2 karakter"),
  jumlahColly: z.number().positive("Jumlah colly harus lebih dari 0").or(
    z.string().refine((val) => !isNaN(val) && parseInt(val) > 0, {
      message: "Jumlah colly harus lebih dari 0",
    })
  ),
  estimasiPengambilan: z.string().optional(),
  notes: z.string().optional(),
  cabangId: z.string().refine(isValidObjectId, {
    message: "ID cabang tidak valid",
  }).optional(),
});

// Schema for updating a pickup request
const updateSchema = z.object({
  pengirimId: z.string().refine(isValidObjectId, {
    message: "ID pengirim tidak valid",
  }).optional(),
  alamatPengambilan: z.string().min(3, "Alamat pengambilan minimal 3 karakter").optional(),
  tujuan: z.string().min(2, "Tujuan minimal 2 karakter").optional(),
  jumlahColly: z.number().positive("Jumlah colly harus lebih dari 0").or(
    z.string().refine((val) => !isNaN(val) && parseInt(val) > 0, {
      message: "Jumlah colly harus lebih dari 0",
    })
  ).optional(),
  estimasiPengambilan: z.string().optional(),
  notes: z.string().optional(),
  cabangId: z.string().refine(isValidObjectId, {
    message: "ID cabang tidak valid",
  }).optional(),
});

// Schema for updating pickup request status
const statusSchema = z.object({
  status: z.enum(['PENDING', 'FINISH', 'CANCELLED'], {
    errorMap: () => ({ message: "Status tidak valid" }),
  }),
  notes: z.string().optional(),
});

// Schema for linking pickup request to pickup
const linkSchema = z.object({
  pickupId: z.string().refine(isValidObjectId, {
    message: "ID pengambilan tidak valid",
  }),
});

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get('/pending', asyncHandler(getPendingPickupRequests));
router.get(
  '/customer/:customerId',
  validateObjectId('customerId'),
  asyncHandler(getPickupRequestsByCustomer)
);

// Status update and link routes
router
  .route('/:id/status')
  .put(
    validateObjectId(),
    validateBody(statusSchema),
    checkPermission('manage_pickups', 'update_pickups'),
    asyncHandler(updatePickupRequestStatus)
  );

router
  .route('/:id/link')
  .put(
    validateObjectId(),
    validateBody(linkSchema),
    checkPermission('manage_pickups', 'update_pickups'),
    asyncHandler(linkToPickup)
  );

// CRUD routes
router
  .route('/')
  .get(asyncHandler(getPickupRequests))
  .post(
    validateBody(createSchema),
    checkPermission('create_pickups', 'manage_pickups'),
    asyncHandler(createPickupRequest)
  );

router
  .route('/:id')
  .get(
    validateObjectId(),
    asyncHandler(getPickupRequest)
  )
  .put(
    validateObjectId(),
    validateBody(updateSchema),
    checkPermission('update_pickups', 'manage_pickups'),
    asyncHandler(updatePickupRequest)
  )
  .delete(
    validateObjectId(),
    checkPermission('delete_pickups', 'manage_pickups'),
    asyncHandler(deletePickupRequest)
  );

module.exports = router;