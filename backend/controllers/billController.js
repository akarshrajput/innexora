const Bill = require('../models/Bill');
const Guest = require('../models/Guest');
const Room = require('../models/Room');
const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private/Manager
exports.getBills = async (req, res, next) => {
  try {
    console.log(`Fetching all bills for manager: ${req.user.email}`);
    const { status, roomNumber, guestName, period } = req.query;
    
    // Build query
    const query = {};
    
    if (status) query.status = status;
    if (roomNumber) query.roomNumber = roomNumber;
    if (guestName) query.guestName = { $regex: guestName, $options: 'i' };
    
    // Period filter
    if (period) {
      const now = new Date();
      let dateFilter = {};
      
      switch (period) {
        case 'today':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          };
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          dateFilter = { createdAt: { $gte: weekStart } };
          break;
        case 'month':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1)
            }
          };
          break;
      }
      
      if (Object.keys(dateFilter).length > 0) {
        query = { ...query, ...dateFilter };
      }
    }

    const bills = await Bill.find(query)
      .populate('guest', 'name phone email')
      .populate('room', 'number type floor')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    console.error('Get bills error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get single bill
// @route   GET /api/bills/:id
// @access  Private/Manager
exports.getBill = async (req, res, next) => {
  try {
    console.log(`Fetching bill ${req.params.id} for manager: ${req.user.email}`);
    const bill = await Bill.findById(req.params.id)
    .populate('guest', 'name phone email idType idNumber address')
    .populate('room', 'number type floor amenities')
    .populate('items.orderId', 'orderNumber items');

    if (!bill) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Get bill error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get bill by guest ID
// @route   GET /api/bills/guest/:guestId
// @access  Private/Manager
exports.getBillByGuest = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      guest: req.params.guestId,
      status: { $ne: 'cancelled' }
    })
    .populate('guest', 'name phone email')
    .populate('room', 'number type floor')
    .populate('items.orderId', 'orderNumber');

    if (!bill) {
      return next(new ErrorResponse('Bill not found for this guest', 404));
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

// @desc    Add item to bill
// @route   POST /api/bills/:id/items
// @access  Private/Manager
exports.addBillItem = async (req, res, next) => {
  try {
    const { type, description, amount, quantity = 1, notes } = req.body;
    
    const bill = await Bill.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!bill) {
      return next(new ErrorResponse('Active bill not found', 404));
    }

    const newItem = {
      type,
      description,
      amount: parseFloat(amount),
      quantity: parseInt(quantity),
      unitPrice: parseFloat(amount),
      addedBy: req.user.name || 'Manager',
      notes,
      date: new Date()
    };

    bill.items.push(newItem);
    await bill.save();

    res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Add bill item error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Remove item from bill
// @route   DELETE /api/bills/:id/items/:itemId
// @access  Private/Manager
exports.removeBillItem = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!bill) {
      return next(new ErrorResponse('Active bill not found', 404));
    }

    bill.items = bill.items.filter(item => item._id.toString() !== req.params.itemId);
    await bill.save();

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Remove bill item error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Add payment to bill
// @route   POST /api/bills/:id/payments
// @access  Private/Manager
exports.addPayment = async (req, res, next) => {
  try {
    const { amount, method, reference, notes } = req.body;
    
    const bill = await Bill.findOne({
      _id: req.params.id
    });

    if (!bill) {
      return next(new ErrorResponse('Bill not found', 404));
    }

    const payment = {
      amount: parseFloat(amount),
      method,
      reference,
      notes,
      receivedBy: req.user.name || 'Manager',
      date: new Date()
    };

    bill.payments.push(payment);
    await bill.save();

    res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Add payment error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Apply discount to bill
// @route   POST /api/bills/:id/discount
// @access  Private/Manager
exports.applyDiscount = async (req, res, next) => {
  try {
    const { amount, description, notes } = req.body;
    
    const bill = await Bill.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!bill) {
      return next(new ErrorResponse('Active bill not found', 404));
    }

    const discountItem = {
      type: 'discount',
      description: description || 'Discount Applied',
      amount: -Math.abs(parseFloat(amount)), // Ensure negative for discount
      quantity: 1,
      unitPrice: -Math.abs(parseFloat(amount)),
      addedBy: req.user.name || 'Manager',
      notes,
      date: new Date()
    };

    bill.items.push(discountItem);
    await bill.save();

    res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Apply discount error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Add tax to bill
// @route   POST /api/bills/:id/tax
// @access  Private/Manager
exports.addTax = async (req, res, next) => {
  try {
    const { percentage, description } = req.body;
    
    const bill = await Bill.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!bill) {
      return next(new ErrorResponse('Active bill not found', 404));
    }

    // Calculate tax on current subtotal
    const taxAmount = (bill.subtotal * parseFloat(percentage)) / 100;

    const taxItem = {
      type: 'tax',
      description: description || `Tax (${percentage}%)`,
      amount: taxAmount,
      quantity: 1,
      unitPrice: taxAmount,
      addedBy: req.user.name || 'Manager',
      date: new Date()
    };

    bill.items.push(taxItem);
    await bill.save();

    res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Add tax error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Finalize bill
// @route   POST /api/bills/:id/finalize
// @access  Private/Manager
exports.finalizeBill = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      status: 'active'
    });

    if (!bill) {
      return next(new ErrorResponse('Active bill not found', 404));
    }

    bill.finalizedAt = new Date();
    bill.finalizedBy = req.user.name || 'Manager';
    
    // Update status based on payment
    if (bill.balanceAmount <= 0) {
      bill.status = 'paid';
    } else if (bill.paidAmount > 0) {
      bill.status = 'partially_paid';
    }

    await bill.save();

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Finalize bill error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get billing statistics
// @route   GET /api/bills/stats
// @access  Private/Manager
exports.getBillStats = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
        };
        break;
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        dateFilter = { createdAt: { $gte: weekStart } };
        break;
      case 'month':
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        };
        break;
    }

    const stats = await Bill.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          balanceAmount: { $sum: '$balanceAmount' }
        }
      }
    ]);

    const formattedStats = stats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        totalAmount: curr.totalAmount,
        paidAmount: curr.paidAmount,
        balanceAmount: curr.balanceAmount
      };
      return acc;
    }, {});

    // Calculate totals
    const totalRevenue = stats.reduce((sum, stat) => sum + stat.totalAmount, 0);
    const totalPaid = stats.reduce((sum, stat) => sum + stat.paidAmount, 0);
    const totalPending = stats.reduce((sum, stat) => sum + stat.balanceAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        ...formattedStats,
        totalRevenue,
        totalPaid,
        totalPending,
        period
      }
    });
  } catch (error) {
    console.error('Get bill stats error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// Validation middleware for adding bill items
exports.validateBillItem = [
  body('type')
    .notEmpty()
    .withMessage('Item type is required')
    .isIn(['room_charge', 'food_order', 'service_charge', 'tax', 'discount', 'advance_payment', 'other'])
    .withMessage('Invalid item type'),
    
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
    
  body('amount')
    .isFloat()
    .withMessage('Amount must be a valid number'),
    
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
    
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

// Validation middleware for payments
exports.validatePayment = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),
    
  body('method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
    
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
