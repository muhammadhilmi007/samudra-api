// routes/pickupRoutes.js - Improved pickup routes
const express = require("express");
const {
  getPickups,
  getPickup,
  createPickup,
  updatePickup,
  deletePickup,
  updatePickupStatus,
  addSTTToPickup,
  removeSTTFromPickup,
  getPickupsBySender,
  getPickupsByDriver,
  getTodayPickups,
} = require("../controllers/pickupController");
const { protect, authorize, checkPermission } = require("../middlewares/auth");
const { validateBody, validateObjectId } = require("../middlewares/validator");
const pickupValidation = require("../validations/pickupValidation");
const asyncHandler = require("../middlewares/asyncHandler");

const router = express.Router();

// Protect all routes
router.use(protect);

// Special routes
router.get("/today", asyncHandler(getTodayPickups));
router.get(
  "/by-sender/:senderId",
  validateObjectId("senderId"),
  asyncHandler(getPickupsBySender)
);
router.get(
  "/by-driver/:driverId",
  validateObjectId("driverId"),
  asyncHandler(getPickupsByDriver)
);

router.put(
  "/:id/status",
  validateObjectId(),
  validateBody(pickupValidation.updateStatus),
  asyncHandler(updatePickupStatus)
);

router.put(
  "/:id/add-stt",
  validateObjectId(),
  validateBody(pickupValidation.addSTT),
  checkPermission("manage_pickups", "manage_stt"),
  asyncHandler(addSTTToPickup)
);

router.put(
  "/:id/remove-stt",
  validateObjectId(),
  validateBody(pickupValidation.removeSTT),
  checkPermission("manage_pickups", "manage_stt"),
  asyncHandler(removeSTTFromPickup)
);

// Main CRUD routes
router
  .route("/")
  .get(asyncHandler(getPickups))
  .post(
    validateBody(pickupValidation.create),
    checkPermission("create_pickups", "manage_pickups"),
    asyncHandler(createPickup)
  );

router
  .route("/:id")
  .get(validateObjectId(), asyncHandler(getPickup))
  .put(
    validateObjectId(),
    validateBody(pickupValidation.update),
    checkPermission("update_pickups", "manage_pickups"),
    asyncHandler(updatePickup)
  )
  .delete(
    validateObjectId(),
    checkPermission("delete_pickups", "manage_pickups"),
    asyncHandler(deletePickup)
  );

module.exports = router;
