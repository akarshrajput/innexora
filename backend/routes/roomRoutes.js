const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes (require authentication)
router.use(protect);

// Room management routes
router
  .route('/')
  .get(authorize('staff', 'manager', 'admin'), roomController.getRooms)
  .post(authorize('manager', 'admin'), roomController.validateRoomData, roomController.createRoom);

router
  .route('/summary')
  .get(authorize('staff', 'manager', 'admin'), roomController.getRoomSummary);

router
  .route('/available')
  .get(authorize('staff', 'manager', 'admin'), roomController.getAvailableRooms);

router
  .route('/occupied')
  .get(authorize('staff', 'manager', 'admin'), roomController.getOccupiedRooms);

router
  .route('/status/:status')
  .get(authorize('staff', 'manager', 'admin'), roomController.getRoomsByStatus);

router
  .route('/:id')
  .get(authorize('staff', 'manager', 'admin'), roomController.getRoom)
  .put(authorize('manager', 'admin'), roomController.validateRoomData, roomController.updateRoom)
  .delete(authorize('admin'), roomController.deleteRoom);

router
  .route('/:id/status')
  .put(authorize('manager', 'admin'), roomController.updateRoomStatus);

module.exports = router;
