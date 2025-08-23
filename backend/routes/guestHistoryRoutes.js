const express = require('express');
const {
  getGuestHistory,
  getGuestProfile,
  getGuestHistoryStats,
  searchGuestHistory
} = require('../controllers/guestHistoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Guest history routes (staff and above)
router.get('/', authorize('staff', 'manager', 'admin'), getGuestHistory);
router.get('/stats', authorize('staff', 'manager', 'admin'), getGuestHistoryStats);
router.get('/search', authorize('staff', 'manager', 'admin'), searchGuestHistory);
router.get('/:id', authorize('staff', 'manager', 'admin'), getGuestProfile);

module.exports = router;
