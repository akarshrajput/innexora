const Room = require('../models/Room');
const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all rooms for the manager's hotel
// @route   GET /api/rooms
// @access  Private/Manager
exports.getRooms = async (req, res, next) => {
  try {
    console.log('Fetching rooms for user:', req.user);
    // Temporarily remove the manager filter to debug
    const rooms = await Room.find({ isActive: true })
      .select('-__v -createdAt -updatedAt')
      .lean();

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private/Manager
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      isActive: true
    }).select('-__v -createdAt -updatedAt').lean();

    if (!room) {
      return next(new ErrorResponse(`Room not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Create a room
// @route   POST /api/rooms
// @access  Private/Manager
exports.createRoom = async (req, res, next) => {
  try {
    // Check for duplicate room number
    const roomExists = await Room.findOne({
      number: req.body.number,
      isActive: true
    });

    if (roomExists) {
      return res.status(400).json({
        success: false,
        message: `Room with number ${req.body.number} already exists`
      });
    }

    // Prepare room data
    const roomData = {
      ...req.body,
      // Ensure price is a number
      price: Number(req.body.price) || 0,
    };

    const room = await Room.create(roomData);

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private/Manager
exports.updateRoom = async (req, res, next) => {
  try {
    console.log('Updating room:', req.params.id, 'for user:', req.user);
    // Temporarily remove manager filter for debugging
    let room = await Room.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!room) {
      return next(
        new ErrorResponse(`Room not found with id of ${req.params.id}`, 404)
      );
    }

    // Check for duplicate room number
    if (req.body.number && req.body.number !== room.number) {
      const roomExists = await Room.findOne({
        number: req.body.number,
        isActive: true,
        _id: { $ne: req.params.id }
      });
      console.log('Duplicate check - room exists:', roomExists);

      if (roomExists) {
        return next(
          new ErrorResponse(
            `Room with number ${req.body.number} already exists`,
            400
          )
        );
      }
    }

    // Update room fields
    const fieldsToUpdate = ['number', 'type', 'floor', 'status'];
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        room[field] = req.body[field];
      }
    });

    await room.save();

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Update room error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Delete room (soft delete)
// @route   DELETE /api/rooms/:id
// @access  Private/Manager
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!room) {
      return next(
        new ErrorResponse(`Room not found with id of ${req.params.id}`, 404)
      );
    }

    // Check for active tickets
    const activeTickets = await Ticket.countDocuments({
      room: room._id,
      status: { $in: ['raised', 'in_progress'] }
    });

    if (activeTickets > 0) {
      return next(
        new ErrorResponse(
          'Cannot delete room with active tickets. Please resolve all tickets first.',
          400
        )
      );
    }

    // Soft delete
    room.isActive = false;
    await room.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete room error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get room by number (public)
// @route   GET /api/rooms/number/:number
// @access  Public
exports.getRoomByNumber = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      number: req.params.number,
      isActive: true
    }).select('-__v -createdAt -updatedAt -isActive');

    if (!room) {
      return next(
        new ErrorResponse(
          `Room with number ${req.params.number} not found or inactive`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room by number error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Update room status safely
// @route   PUT /api/rooms/:id/status
// @access  Private/Manager
exports.updateRoomStatus = async (req, res, next) => {
  try {
    const { status, reason, updatedBy } = req.body;

    if (!status || !updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Status and updated by are required'
      });
    }

    // Use the safe method from the Room model
    const room = await Room.updateRoomStatus(req.params.id, status, reason);

    res.status(200).json({
      success: true,
      message: `Room ${room.number} status updated to ${status}`,
      data: room
    });
  } catch (error) {
    console.error('Update room status error:', error);
    
    if (error.message.includes('Cannot change status')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get rooms by status
// @route   GET /api/rooms/status/:status
// @access  Private/Manager
exports.getRoomsByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;
    const rooms = await Room.getRoomsByStatus(status);

    res.status(200).json({
      success: true,
      count: rooms.length,
      status,
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms by status error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get available rooms
// @route   GET /api/rooms/available
// @access  Private/Manager
exports.getAvailableRooms = async (req, res, next) => {
  try {
    const rooms = await Room.getAvailableRooms();

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get available rooms error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get occupied rooms
// @route   GET /api/rooms/occupied
// @access  Private/Manager
exports.getOccupiedRooms = async (req, res, next) => {
  try {
    const rooms = await Room.getOccupiedRooms();

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get occupied rooms error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get room summary for dashboard
// @route   GET /api/rooms/summary
// @access  Private/Manager
exports.getRoomSummary = async (req, res, next) => {
  try {
    const [availableRooms, occupiedRooms, cleaningRooms, maintenanceRooms] = await Promise.all([
      Room.getAvailableRooms(),
      Room.getOccupiedRooms(),
      Room.getRoomsByStatus('cleaning'),
      Room.getRoomsByStatus('maintenance')
    ]);

    const summary = {
      total: availableRooms.length + occupiedRooms.length + cleaningRooms.length + maintenanceRooms.length,
      available: availableRooms.length,
      occupied: occupiedRooms.length,
      cleaning: cleaningRooms.length,
      maintenance: maintenanceRooms.length,
      occupancyRate: Math.round(((occupiedRooms.length / (availableRooms.length + occupiedRooms.length)) * 100) || 0)
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get room summary error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// Validation middleware for room
exports.validateRoomData = [
  body('number')
    .trim()
    .notEmpty()
    .withMessage('Room number is required')
    .isNumeric()
    .withMessage('Room number must be numeric'),
  
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Room type is required')
    .isIn(['single', 'double', 'triple', 'suite', 'deluxe'])
    .withMessage('Invalid room type'),
  
  body('floor')
    .trim()
    .notEmpty()
    .withMessage('Floor is required')
    .isNumeric()
    .withMessage('Floor must be numeric'),
  
  body('capacity')
    .isNumeric()
    .withMessage('Capacity must be numeric')
    .custom(value => value >= 1)
    .withMessage('Capacity must be at least 1'),
  
  body('price')
    .isNumeric()
    .withMessage('Price must be numeric')
    .custom(value => value >= 0)
    .withMessage('Price cannot be negative'),
  
  body('status')
    .optional()
    .isIn(['available', 'occupied', 'cleaning', 'maintenance', 'reserved'])
    .withMessage('Invalid room status'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array().map(err => err.msg)
      });
    }
    next();
  }
];
