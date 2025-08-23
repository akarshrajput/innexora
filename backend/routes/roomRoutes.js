const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/number/:number', roomController.getRoomByNumber);

// Protected routes (require authentication)
router.use(protect);

// Room CRUD operations
router
  .route('/')
  .get(roomController.getRooms)
  .post(authorize('admin', 'manager'), roomController.validateRoom, roomController.createRoom);

router
  .route('/:id')
  .get(roomController.getRoom)
  .put(authorize('manager', 'admin'), roomController.validateRoom, roomController.updateRoom)
  .delete(authorize('admin'), roomController.deleteRoom);

module.exports = router;
