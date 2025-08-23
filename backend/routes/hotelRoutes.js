const express = require('express');
const router = express.Router();
const {
  getHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelsByManager,
  validateHotel,
} = require('../controllers/hotelController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.route('/').get(getHotels);
router.route('/:id').get(getHotel);

// Protected routes (require authentication)
router.use(protect);

// Manager and admin routes
router.get('/manager/me', authorize('manager', 'admin'), getHotelsByManager);
router.post('/', authorize('manager', 'admin'), validateHotel, createHotel);
router.put('/:id', authorize('manager', 'admin'), validateHotel, updateHotel);
router.delete('/:id', authorize('admin'), deleteHotel);

module.exports = router;
