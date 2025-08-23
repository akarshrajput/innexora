const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes (require authentication)
router.use(protect);

// Public routes (for guest ordering)
router.get('/menu', orderController.getMenuItems);

// Order statistics (staff and above)
router.get('/stats', authorize('staff', 'manager', 'admin'), orderController.getOrderStats);

// Order CRUD operations (staff and above)
router
  .route('/')
  .get(authorize('staff', 'manager', 'admin'), orderController.getOrders)
  .post(authorize('staff', 'manager', 'admin'), orderController.validateCreateOrder, orderController.createOrder);

router
  .route('/:id')
  .get(authorize('staff', 'manager', 'admin'), orderController.getOrder);

// Update order status
router.patch('/:id/status', authorize('staff', 'manager', 'admin'), orderController.updateOrderStatus);

module.exports = router;
