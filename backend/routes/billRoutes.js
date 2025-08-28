const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes (require authentication)
router.use(protect);

// Bill management routes
router
  .route('/')
  .get(authorize('staff', 'manager', 'admin'), billController.getBills);

router
  .route('/stats')
  .get(authorize('staff', 'manager', 'admin'), billController.getBillStats);

router
  .route('/summary')
  .get(authorize('staff', 'manager', 'admin'), billController.getBillSummary);

router
  .route('/guest/:guestId')
  .get(authorize('staff', 'manager', 'admin'), billController.getBillByGuest);

router
  .route('/checkout/:guestId')
  .get(authorize('manager', 'admin'), billController.checkGuestCheckout);

// Payment and charge management
router
  .route('/:id/payments')
  .post(authorize('manager', 'admin'), billController.validatePayment, billController.recordPayment);

router
  .route('/:id/charges')
  .post(authorize('manager', 'admin'), billController.validateCharge, billController.addCharge);

router
  .route('/:id/finalize')
  .put(authorize('manager', 'admin'), billController.finalizeBill);

module.exports = router;
