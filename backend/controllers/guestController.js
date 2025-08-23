const Guest = require('../models/Guest');
const Room = require('../models/Room');
const Bill = require('../models/Bill');
const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all guests
// @route   GET /api/guests
// @access  Private/Manager
exports.getGuests = async (req, res, next) => {
  try {
    console.log(`Fetching all guests for manager: ${req.user?.email || 'unknown'}`);
    const { status, roomNumber, search } = req.query;
    
    // Build query - no filters by default to show all guests
    const query = {};
    
    if (status) query.status = status;
    if (roomNumber) query.roomNumber = roomNumber;
    
    console.log('Query parameters:', { query, status, roomNumber, search });
    
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'room.number': { $regex: search, $options: 'i' } }
      ];
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Increased limit to ensure we get all guests
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Guest.countDocuments(query);
    
    console.log(`Found ${total} guests matching query`);

    // Find all guests with room population
    const guests = await Guest.find(query)
      .populate({
        path: 'room',
        select: 'number type floor price',
        model: 'Room'
      })
      .sort({ checkInDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Convert to plain JavaScript objects

    // Calculate stay duration for each guest
    const guestsWithDuration = guests.map(guest => {
      const checkInDate = new Date(guest.checkInDate);
      const checkOutDate = new Date(guest.checkOutDate);
      const stayDuration = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...guest,
        stayDuration,
        // Ensure room data is properly formatted
        room: guest.room || {
          _id: guest.room, // In case population didn't work, keep the original ID
          number: guest.roomNumber || 'N/A',
          type: 'Unknown',
          floor: 'N/A',
          price: 0
        }
      };
    });

    console.log(`Returning ${guestsWithDuration.length} guests with room data`);
    
    res.status(200).json({
      success: true,
      data: guestsWithDuration,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        limit
      }
    });
  } catch (error) {
    console.error('Get guests error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get single guest
// @route   GET /api/guests/:id
// @access  Private/Manager
exports.getGuest = async (req, res, next) => {
  try {
    console.log(`Fetching guest ${req.params.id} for manager: ${req.user.email}`);
    const guest = await Guest.findOne({
      _id: req.params.id,
      isActive: true
    })
    .populate('room', 'number type floor price amenities')
    .populate('currentBill');

    if (!guest) {
      return next(new ErrorResponse('Guest not found', 404));
    }

    res.status(200).json({
      success: true,
      data: guest
    });
  } catch (error) {
    console.error('Get guest error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Check-in guest
// @route   POST /api/guests/checkin
// @access  Private/Manager
exports.checkInGuest = async (req, res, next) => {
  try {
    const { roomId, ...guestData } = req.body;
    
    // Verify room exists and is available
    const room = await Room.findOne({
      _id: roomId,
      status: 'available',
      isActive: true
    });
    
    if (!room) {
      console.log(`Room ${roomId} not found or not available`);
      return next(new ErrorResponse('Room not available or not found', 404));
    }

    // Add room details to guest data
    guestData.room = roomId;
    guestData.roomNumber = room.number;
    guestData.status = 'checked_in';
    
    console.log('Creating guest with data:', {
      ...guestData,
      room: roomId,
      roomNumber: room.number
    });

    // Create guest
    const guest = await Guest.create(guestData);

    // Update room status and assign guest
    room.status = 'occupied';
    room.currentGuest = guest._id;
    await room.save();

    // Generate a unique bill number
    const billNumber = `BIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Calculate room charges based on stay duration
    const checkInDate = new Date(guest.checkInDate);
    const checkOutDate = new Date(guest.checkOutDate);
    const numberOfNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const roomChargePerNight = room.price || 0;
    const totalRoomCharge = numberOfNights * roomChargePerNight;

    // Create initial bill for the guest with room charges
    const billData = {
      guest: guest._id,
      room: room._id,
      roomNumber: room.number,
      guestName: guest.name,
      checkInDate: guest.checkInDate,
      checkOutDate: guest.checkOutDate,
      status: 'active',
      items: [{
        type: 'room_charge',
        description: `Room ${room.number} - ${numberOfNights} night(s)`,
        amount: totalRoomCharge,
        quantity: numberOfNights,
        unitPrice: roomChargePerNight,
        addedBy: 'System',
        date: new Date()
      }],
      payments: [],
      totalAmount: totalRoomCharge,
      taxAmount: 0,
      discountAmount: 0,
      netAmount: totalRoomCharge,
      balance: totalRoomCharge,
      billNumber: billNumber,
      isActive: true
    };
    
    console.log('Creating bill with data:', billData);
    const bill = await Bill.create(billData);

    // Populate guest data for response
    await guest.populate('room', 'number type floor price amenities');

    res.status(201).json({
      success: true,
      data: {
        guest,
        bill
      }
    });
  } catch (error) {
    console.error('Check-in guest error:', error);
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

// @desc    Check-out guest
// @route   POST /api/guests/:id/checkout
// @access  Private/Manager
exports.checkOutGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findOne({
      _id: req.params.id,
      status: 'checked_in'
    }).populate('room');

    if (!guest) {
      return next(new ErrorResponse('Guest not found or already checked out', 404));
    }

    // Update guest status and checkout date
    guest.status = 'checked_out';
    guest.actualCheckOutDate = new Date();
    await guest.save();

    // Update room status
    const room = await Room.findById(guest.room._id);
    if (room) {
      room.status = 'cleaning'; // Set to cleaning first, manager can change to available later
      room.currentGuest = null;
      await room.save();
    }

    // Finalize the bill
    const bill = await Bill.findOne({ guest: guest._id, status: { $ne: 'cancelled' } });
    if (bill) {
      bill.checkOutDate = guest.actualCheckOutDate;
      bill.finalizedAt = new Date();
      bill.finalizedBy = req.user.name || 'Manager';
      await bill.save();
    }

    res.status(200).json({
      success: true,
      data: {
        guest,
        bill
      }
    });
  } catch (error) {
    console.error('Check-out guest error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Update guest information
// @route   PUT /api/guests/:id
// @access  Private/Manager
exports.updateGuest = async (req, res, next) => {
  try {
    let guest = await Guest.findOne({
      _id: req.params.id
    });

    if (!guest) {
      return next(new ErrorResponse('Guest not found', 404));
    }

    // Update guest fields
    const fieldsToUpdate = [
      'name', 'email', 'phone', 'emergencyContact', 
      'specialRequests', 'notes', 'numberOfGuests'
    ];
    
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        guest[field] = req.body[field];
      }
    });

    await guest.save();
    await guest.populate('room', 'number type floor price amenities');

    res.status(200).json({
      success: true,
      data: guest
    });
  } catch (error) {
    console.error('Update guest error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get guest by room number (for chat system - simplified)
// @route   GET /api/guests/room/:roomNumber
// @access  Public
exports.getGuestByRoom = async (req, res, next) => {
  try {
    const guest = await Guest.findOne({
      roomNumber: req.params.roomNumber,
      status: 'checked_in'
    }).populate('room', 'number type floor');

    if (!guest) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active guest found for this room'
      });
    }

    // Return simplified guest info for chat
    const guestInfo = {
      _id: guest._id,
      name: guest.name,
      roomNumber: guest.roomNumber,
      room: guest.room,
      checkInDate: guest.checkInDate,
      checkOutDate: guest.checkOutDate,
      status: guest.status
    };

    res.status(200).json({
      success: true,
      data: guestInfo
    });
  } catch (error) {
    console.error('Get guest by room error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get guest statistics
// @route   GET /api/guests/stats
// @access  Private/Manager
exports.getGuestStats = async (req, res, next) => {
  try {
    const stats = await Guest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = stats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, { checked_in: 0, checked_out: 0, cancelled: 0, no_show: 0 });

    // Get current occupancy
    const occupiedRooms = await Room.countDocuments({
      status: 'occupied'
    });

    const totalRooms = await Room.countDocuments({
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        ...formattedStats,
        occupiedRooms,
        totalRooms,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get guest stats error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// Validation middleware for guest check-in
exports.validateGuestCheckIn = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Guest name is required')
    .isLength({ max: 100 })
    .withMessage('Guest name must be less than 100 characters'),
    
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
    
  body('idType')
    .notEmpty()
    .withMessage('ID type is required')
    .isIn(['passport', 'driving_license', 'national_id', 'other'])
    .withMessage('Invalid ID type'),
    
  body('idNumber')
    .trim()
    .notEmpty()
    .withMessage('ID number is required'),
    
  body('checkInDate')
    .isISO8601()
    .withMessage('Valid check-in date is required'),
    
  body('checkOutDate')
    .isISO8601()
    .withMessage('Valid check-out date is required'),
    
  body('numberOfGuests')
    .isInt({ min: 1 })
    .withMessage('Number of guests must be at least 1'),
    
  body('roomId')
    .notEmpty()
    .withMessage('Room selection is required')
    .isMongoId()
    .withMessage('Invalid room ID'),
    
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
