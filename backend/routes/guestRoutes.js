const express = require("express");
const router = express.Router();
const guestController = require("../controllers/guestController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public routes (for guest access)
router
  .route("/room-access/:roomAccessId")
  .get(guestController.getGuestByRoomAccessId);

// Protected routes (require authentication)
router.use(protect);

// Guest management routes
router
  .route("/")
  .get(authorize("staff", "manager", "admin"), guestController.getGuests)
  .post(
    authorize("manager", "admin"),
    guestController.validateGuestData,
    guestController.createGuest
  );

router
  .route("/active")
  .get(authorize("staff", "manager", "admin"), guestController.getActiveGuests);

router
  .route("/history")
  .get(authorize("staff", "manager", "admin"), guestController.getGuestHistory);

router
  .route("/stats")
  .get(authorize("staff", "manager", "admin"), guestController.getGuestStats);

router
  .route("/:id")
  .get(authorize("staff", "manager", "admin"), guestController.getGuest)
  .put(
    authorize("manager", "admin"),
    guestController.validateGuestData,
    guestController.updateGuest
  )
  .delete(authorize("admin"), guestController.deleteGuest);

// Check-in and check-out routes
router
  .route("/checkin")
  .post(authorize("manager", "admin"), guestController.checkInGuest);

router
  .route("/:id/checkin")
  .put(authorize("manager", "admin"), guestController.checkInGuest);

router
  .route("/:id/checkout")
  .put(authorize("manager", "admin"), guestController.checkoutGuest);

router
  .route("/:id/checkout-status")
  .get(
    authorize("staff", "manager", "admin"),
    guestController.getGuestCheckoutStatus
  );

module.exports = router;
