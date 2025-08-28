const Bill = require('../models/Bill');
const Guest = require('../models/Guest');
const Room = require('../models/Room');
const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all bills with enhanced filtering
// @route   GET /api/bills
// @access  Private/Manager
exports.getBills = async (req, res, next) => {
  try {
    const { status, roomNumber, guestName, type = 'active' } = req.query;
    
    let bills;
    
    if (type === 'active') {
      // Get only active bills (current guests)
      bills = await Bill.getActiveBills();
    } else if (type === 'finalized') {
      // Get finalized bills (guest history)
      bills = await Bill.getFinalizedBills();
    } else if (type === 'all') {
      // Get all bills with filters
      const query = {};
      if (status) query.status = status;
      if (roomNumber) query.roomNumber = roomNumber;
      if (guestName) query.guestName = { $regex: guestName, $options: 'i' };

      bills = await Bill.find(query)
        .populate('guest', 'name phone email status')
        .populate('room', 'number type floor status')
        .sort({ createdAt: -1 });
    } else {
      // Default to active bills
      bills = await Bill.getActiveBills();
    }

    res.status(200).json({
      success: true,
      count: bills.length,
      type,
      data: bills
    });
  } catch (error) {
    console.error('Get bills error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get billing statistics
// @route   GET /api/bills/stats
// @access  Private/Manager
exports.getBillStats = async (req, res, next) => {
  try {
    const stats = await Bill.getBillingStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get bill stats error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get bill by guest ID
// @route   GET /api/bills/guest/:guestId
// @access  Private/Manager
exports.getBillByGuest = async (req, res, next) => {
  try {
    const bill = await Bill.getBillSummary(req.params.guestId);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'No bill found for this guest'
      });
    }

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Get bill by guest error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Record payment for a bill
// @route   POST /api/bills/:id/payments
// @access  Private/Manager
exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, method, reference, notes, receivedBy } = req.body;

    if (!amount || !method || !receivedBy) {
      return res.status(400).json({
        success: false,
        message: 'Amount, payment method, and received by are required'
      });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    // Check if bill is still active
    if (!['active', 'partially_paid'].includes(bill.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add payment to finalized or cancelled bill'
      });
    }

    // Add payment record
    bill.payments.push({
      amount: Number(amount),
      method,
      reference: reference || '',
      receivedBy,
      notes: notes || '',
      date: new Date()
    });

    await bill.save();

    // Populate for response
    await bill.populate([
      { path: 'guest', select: 'name phone email' },
      { path: 'room', select: 'number type floor' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: bill
    });
  } catch (error) {
    console.error('Record payment error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Add manual charge to bill
// @route   POST /api/bills/:id/charges
// @access  Private/Manager
exports.addCharge = async (req, res, next) => {
  try {
    const { type, description, amount, quantity = 1, notes, addedBy } = req.body;

    if (!type || !description || !amount || !addedBy) {
      return res.status(400).json({
        success: false,
        message: 'Type, description, amount, and added by are required'
      });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    // Check if bill is still active
    if (!['active', 'partially_paid'].includes(bill.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add charges to finalized or cancelled bill'
      });
    }

    // Add charge item
    bill.items.push({
      type,
      description,
      amount: Number(amount),
      quantity: Number(quantity),
      unitPrice: Number(amount),
      addedBy,
      date: new Date(),
      notes: notes || ''
    });

    await bill.save();

    // Populate for response
    await bill.populate([
      { path: 'guest', select: 'name phone email' },
      { path: 'room', select: 'number type floor' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Charge added successfully',
      data: bill
    });
  } catch (error) {
    console.error('Add charge error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Finalize bill
// @route   PUT /api/bills/:id/finalize
// @access  Private/Manager
exports.finalizeBill = async (req, res, next) => {
  try {
    const { finalizedBy, notes } = req.body;

    if (!finalizedBy) {
      return res.status(400).json({
        success: false,
        message: 'Finalized by is required'
      });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    if (bill.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot finalize a cancelled bill'
      });
    }

    if (bill.balanceAmount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot finalize bill with outstanding balance of ₹${bill.balanceAmount}`
      });
    }

    // Update bill status
    bill.status = 'finalized';
    bill.finalizedAt = new Date();
    bill.finalizedBy = finalizedBy;
    if (notes) bill.notes = notes;

    await bill.save();

    // Populate for response
    await bill.populate([
      { path: 'guest', select: 'name phone email' },
      { path: 'room', select: 'number type floor' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Bill finalized successfully',
      data: bill
    });
  } catch (error) {
    console.error('Finalize bill error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get bill summary for dashboard
// @route   GET /api/bills/summary
// @access  Private/Manager
exports.getBillSummary = async (req, res, next) => {
  try {
    const [activeBills, finalizedBills, stats] = await Promise.all([
      Bill.getActiveBills(),
      Bill.getFinalizedBills(),
      Bill.getBillingStats()
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeBills: activeBills.length,
        finalizedBills: finalizedBills.length,
        stats
      }
    });
  } catch (error) {
    console.error('Get bill summary error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Check if guest can check out
// @route   GET /api/bills/checkout/:guestId
// @access  Private/Manager
exports.checkGuestCheckout = async (req, res, next) => {
  try {
    const checkoutInfo = await Guest.canCheckOut(req.params.guestId);
    
    res.status(200).json({
      success: true,
      data: checkoutInfo
    });
  } catch (error) {
    console.error('Check guest checkout error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// Validation middleware
exports.validatePayment = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
    
  body('method')
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
    
  body('receivedBy')
    .trim()
    .notEmpty()
    .withMessage('Received by is required'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

exports.validateCharge = [
  body('type')
    .isIn(['room_charge', 'food_order', 'service_charge', 'tax', 'discount', 'other'])
    .withMessage('Invalid charge type'),
    
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
    
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number'),
    
  body('addedBy')
    .trim()
    .notEmpty()
    .withMessage('Added by is required'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];
