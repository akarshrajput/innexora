const Order = require('../models/Order');
const Food = require('../models/Food');
const Guest = require('../models/Guest');
const Room = require('../models/Room');
const Bill = require('../models/Bill');
const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all orders for the manager
// @route   GET /api/orders
// @access  Private/Manager
exports.getOrders = async (req, res, next) => {
  try {
    const { status, roomNumber, orderType, date } = req.query;
    
    // Build query - remove manager filter for hotel-centric approach
    const query = {};
    
    if (status) query.status = status;
    if (roomNumber) query.roomNumber = roomNumber;
    if (orderType) query.orderType = orderType;
    
    // Date filter
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    const orders = await Order.find(query)
      .populate('guest', 'name phone')
      .populate('room', 'number type floor')
      .populate('items.food', 'name category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private/Manager
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id
    })
    .populate('guest', 'name phone email')
    .populate('room', 'number type floor')
    .populate('items.food', 'name category preparationTime');

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Create order (from guest chat or manager)
// @route   POST /api/orders
// @access  Public/Private
exports.createOrder = async (req, res, next) => {
  try {
    console.log('Creating order with data:', req.body);
    console.log('User role:', req.user?.role);
    const { guestId, items, specialInstructions, type = 'room_service' } = req.body;

    // Find guest by ID
    const guest = await Guest.findOne({
      _id: guestId,
      status: 'checked_in'
    }).populate('room');

    if (!guest) {
      return next(new ErrorResponse('No active guest found', 404));
    }

    // Validate and process order items
    const processedItems = [];
    let totalAmount = 0;
    let maxPreparationTime = 0;

    for (const item of items) {
      const food = await Food.findOne({
        _id: item.foodId,
        isAvailable: true
      });

      if (!food) {
        return next(new ErrorResponse(`Food item ${item.foodId} not available`, 400));
      }

      const itemTotal = food.price * item.quantity;
      totalAmount += itemTotal;
      maxPreparationTime = Math.max(maxPreparationTime, food.preparationTime);

      processedItems.push({
        food: food._id,
        foodName: food.name,
        quantity: item.quantity,
        unitPrice: food.price,
        totalPrice: itemTotal,
        specialInstructions: item.specialInstructions || ''
      });
    }

    // Create order
    const order = await Order.create({
      guest: guest._id,
      guestName: guest.name,
      room: guest.room._id,
      roomNumber: guest.roomNumber,
      items: processedItems,
      totalAmount,
      type,
      specialInstructions,
      estimatedPreparationTime: maxPreparationTime,
    });

    // Add order to guest's bill
    await Bill.addOrderToBill(guest._id, order);

    // Populate order for response
    await order.populate([
      { path: 'guest', select: 'name phone' },
      { path: 'room', select: 'number type floor' },
      { path: 'items.food', select: 'name category' }
    ]);

    // Emit real-time notification to managers
    if (req.app && req.app.get('io')) {
      const io = req.app.get('io');
      io.to('managers').emit('newOrder', {
        order,
        notification: {
          title: 'New Food Order',
          message: `${guest.name} from Room ${guest.roomNumber} placed an order`,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Manager
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, preparedBy, deliveredBy } = req.body;
    
    if (!['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].includes(status)) {
      return next(new ErrorResponse('Invalid status', 400));
    }

    let order = await Order.findOne({
      _id: req.params.id
    });

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Update status and related fields
    order.status = status;
    
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      if (deliveredBy) order.deliveredBy = deliveredBy;
    }
    
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      if (req.body.cancellationReason) {
        order.cancellationReason = req.body.cancellationReason;
      }
    }
    
    if (preparedBy) order.preparedBy = preparedBy;

    await order.save();
    
    // Populate for response
    await order.populate([
      { path: 'guest', select: 'name phone' },
      { path: 'room', select: 'number type floor' }
    ]);

    // Emit real-time update
    if (req.app && req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`order_${order._id}`).emit('orderStatusUpdate', order);
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Manager
exports.getOrderStats = async (req, res, next) => {
  try {
    const { period = 'today' } = req.query;
    
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

    const stats = await Order.aggregate([
      { $match: { ...dateFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const formattedStats = stats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        totalAmount: curr.totalAmount
      };
      return acc;
    }, {});

    // Get total revenue
    const totalRevenue = stats.reduce((sum, stat) => sum + stat.totalAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        ...formattedStats,
        totalRevenue,
        period
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get available food items for ordering (public for guest chat)
// @route   GET /api/orders/menu
// @access  Public
exports.getMenuItems = async (req, res, next) => {
  try {
    const { category } = req.query;
    
    const query = { isAvailable: true };
    if (category) query.category = category;

    const menuItems = await Food.find(query)
      .select('name description category price preparationTime isVegetarian isVegan spiceLevel allergens imageUrl')
      .sort({ category: 1, name: 1 });

    // Group by category
    const groupedMenu = menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: groupedMenu
    });
  } catch (error) {
    console.error('Get menu items error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// Validation middleware for creating orders
exports.validateCreateOrder = [
  body('guestId')
    .notEmpty()
    .withMessage('Guest ID is required'),
    
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
    
  body('items.*.foodId')
    .notEmpty()
    .withMessage('Food ID is required')
    .isMongoId()
    .withMessage('Invalid food ID'),
    
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
    
  body('orderType')
    .optional()
    .isIn(['room_service', 'restaurant', 'takeaway'])
    .withMessage('Invalid order type'),
    
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
