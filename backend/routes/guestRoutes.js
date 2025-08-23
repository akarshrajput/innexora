const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (for chat system)
router.get('/room/:roomNumber', guestController.getGuestByRoom);

// Protected routes (require authentication)
router.use(protect);

// Guest statistics (staff and above)
router.get('/stats', authorize('staff', 'manager', 'admin'), guestController.getGuestStats);

// Guest CRUD operations (staff and above)
router
  .route('/')
  .get(authorize('staff', 'manager', 'admin'), guestController.getGuests);

router
  .route('/:id')
  .get(guestController.getGuest)
  .put(authorize('manager', 'admin'), guestController.updateGuest);

// Check-in and check-out operations (manager and admin only)
router.post('/checkin', authorize('manager', 'admin'), guestController.validateGuestCheckIn, guestController.checkInGuest);
router.post('/:id/checkout', authorize('manager', 'admin'), guestController.checkOutGuest);

module.exports = router;
