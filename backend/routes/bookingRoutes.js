const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  cancelBooking,
  generateGuestLink,
  validateBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.post('/', validateBooking, createBooking);
router.get('/:id', getBooking);
router.delete('/:id/cancel', cancelBooking);

// Guest access link generation (public but could be rate-limited in production)
router.get('/guest-link', generateGuestLink);

// Protected routes (require authentication)
router.use(protect);

// Admin/Manager routes
router.get('/', authorize('staff', 'manager', 'admin'), getBookings);
router.put('/:id', authorize('staff', 'manager', 'admin'), updateBooking);
router.delete('/:id', authorize('staff', 'manager', 'admin'), cancelBooking);

module.exports = router;
