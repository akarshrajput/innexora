const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All bill routes require authentication
router.use(protect);

// Bill statistics (staff and above)
router.get('/stats', authorize('staff', 'manager', 'admin'), billController.getBillStats);

// Bill CRUD operations (staff and above)
router
  .route('/')
  .get(authorize('staff', 'manager', 'admin'), billController.getBills);

router
  .route('/:id')
  .get(authorize('staff', 'manager', 'admin'), billController.getBill);

// Get bill by guest
router.get('/guest/:guestId', billController.getBillByGuest);

// Bill item management
router.post('/:id/items', billController.validateBillItem, billController.addBillItem);
router.delete('/:id/items/:itemId', billController.removeBillItem);

// Payment management
router.post('/:id/payments', billController.validatePayment, billController.addPayment);

// Discount and tax management
router.post('/:id/discount', billController.applyDiscount);
router.post('/:id/tax', billController.addTax);

// Finalize bill
router.post('/:id/finalize', billController.finalizeBill);

module.exports = router;
