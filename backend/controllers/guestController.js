const Guest = require("../models/Guest");
const Room = require("../models/Room");
const Bill = require("../models/Bill");
const { body, validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get guest by room access ID (Public route for guest chat)
// @route   GET /api/guests/room-access/:roomAccessId
// @access  Public
exports.getGuestByRoomAccessId = async (req, res, next) => {
  try {
    const { roomAccessId } = req.params;

    console.log(`Fetching guest info for room access ID: ${roomAccessId}`);

    // Find the room by access ID
    const room = await Room.findOne({ roomAccessId: roomAccessId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Invalid room access code",
      });
    }

    // Find active guest in this room
    const guest = await Guest.findOne({
      roomNumber: room.number,
      status: "checked_in",
    }).populate({
      path: "room",
      select: "number type floor price",
      model: "Room",
    });

    if (!guest) {
      return res.status(200).json({
        success: true,
        message: "This room currently has no guest checked in",
        data: null,
        roomInfo: {
          type: room.type,
          floor: room.floor,
        },
      });
    }

    console.log(`Found guest: ${guest.name} in room ${room.number}`);

    res.status(200).json({
      success: true,
      data: guest,
    });
  } catch (error) {
    console.error("Error fetching guest by room access ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get guest by room number (Public route for guest chat)
// @route   GET /api/guests/room/:roomNumber
// @access  Public
exports.getGuestByRoom = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;

    console.log(`Fetching guest info for room: ${roomNumber}`);

    // Find the room first
    const room = await Room.findOne({ number: roomNumber });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Find active guest in this room
    const guest = await Guest.findOne({
      roomNumber: roomNumber,
      status: "checked_in",
    }).populate({
      path: "room",
      select: "number type floor price",
      model: "Room",
    });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "No active guest found in this room",
      });
    }

    console.log(`Found guest: ${guest.name} in room ${roomNumber}`);

    res.status(200).json({
      success: true,
      data: guest,
    });
  } catch (error) {
    console.error("Error fetching guest by room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch guest information",
    });
  }
};

// @desc    Get all guests
// @route   GET /api/guests
// @access  Private/Manager
exports.getGuests = async (req, res, next) => {
  try {
    console.log(
      `Fetching all guests for manager: ${req.user?.email || "unknown"}`
    );
    const { status, roomNumber, search } = req.query;

    // Build query - no filters by default to show all guests
    const query = {};

    if (status) query.status = status;
    if (roomNumber) query.roomNumber = roomNumber;

    console.log("Query parameters:", { query, status, roomNumber, search });

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { "room.number": { $regex: search, $options: "i" } },
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
        path: "room",
        select: "number type floor price",
        model: "Room",
      })
      .sort({ checkInDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Convert to plain JavaScript objects

    // Calculate stay duration for each guest
    const guestsWithDuration = guests.map((guest) => {
      const checkInDate = new Date(guest.checkInDate);
      const checkOutDate = new Date(guest.checkOutDate);
      const stayDuration = Math.ceil(
        (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
      );

      return {
        ...guest,
        stayDuration,
        // Ensure room data is properly formatted
        room: guest.room || {
          _id: guest.room, // In case population didn't work, keep the original ID
          number: guest.roomNumber || "N/A",
          type: "Unknown",
          floor: "N/A",
          price: 0,
        },
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
        limit,
      },
    });
  } catch (error) {
    console.error("Get guests error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Get single guest
// @route   GET /api/guests/:id
// @access  Private/Manager
exports.getGuest = async (req, res, next) => {
  try {
    console.log(
      `Fetching guest ${req.params.id} for manager: ${req.user.email}`
    );
    const guest = await Guest.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .populate("room", "number type floor price amenities")
      .populate("currentBill");

    if (!guest) {
      return next(new ErrorResponse("Guest not found", 404));
    }

    res.status(200).json({
      success: true,
      data: guest,
    });
  } catch (error) {
    console.error("Get guest error:", error);
    next(new ErrorResponse("Server error", 500));
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
      status: "available",
      isActive: true,
    });

    if (!room) {
      console.log(`Room ${roomId} not found or not available`);
      return next(new ErrorResponse("Room not available or not found", 404));
    }

    // Add room details to guest data
    guestData.room = roomId;
    guestData.roomNumber = room.number;
    guestData.status = "checked_in";

    console.log("Creating guest with data:", {
      ...guestData,
      room: roomId,
      roomNumber: room.number,
    });

    // Create guest
    const guest = await Guest.create(guestData);

    // Update room status and assign guest
    room.status = "occupied";
    room.currentGuest = guest._id;
    await room.save();

    // Generate a unique bill number
    const billNumber = `BIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate room charges based on stay duration
    const checkInDate = new Date(guest.checkInDate);
    const checkOutDate = new Date(guest.checkOutDate);
    const numberOfNights = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    );
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
      status: "active",
      items: [
        {
          type: "room_charge",
          description: `Room ${room.number} - ${numberOfNights} night(s)`,
          amount: totalRoomCharge,
          quantity: numberOfNights,
          unitPrice: roomChargePerNight,
          addedBy: "System",
          date: new Date(),
        },
      ],
      payments: [],
      totalAmount: totalRoomCharge,
      taxAmount: 0,
      discountAmount: 0,
      netAmount: totalRoomCharge,
      balance: totalRoomCharge,
      billNumber: billNumber,
      isActive: true,
    };

    console.log("Creating bill with data:", billData);
    const bill = await Bill.create(billData);

    // Populate guest data for response
    await guest.populate("room", "number type floor price amenities");

    res.status(201).json({
      success: true,
      data: {
        guest,
        bill,
      },
    });
  } catch (error) {
    console.error("Check-in guest error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages,
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Check out guest
// @route   PUT /api/guests/:id/checkout
// @access  Private/Manager
exports.checkoutGuest = async (req, res, next) => {
  try {
    const { checkoutNotes, checkedOutBy } = req.body;

    if (!checkedOutBy) {
      return res.status(400).json({
        success: false,
        message: "Checked out by is required",
      });
    }

    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return next(new ErrorResponse("Guest not found", 404));
    }

    if (guest.status !== "checked_in") {
      return res.status(400).json({
        success: false,
        message: "Guest is not currently checked in",
      });
    }

    // Check if guest can check out (no unpaid bills)
    const checkoutInfo = await Guest.canCheckOut(guest._id);
    if (!checkoutInfo.canCheckOut) {
      return res.status(400).json({
        success: false,
        message: `Cannot check out guest with outstanding balance of ₹${checkoutInfo.balanceAmount}. Please collect payment first.`,
      });
    }

    // Update guest status to checked_out
    guest.status = "checked_out";
    guest.actualCheckOutDate = new Date();
    guest.checkedOutBy = checkedOutBy;
    if (checkoutNotes) guest.notes = checkoutNotes;

    // Save guest changes (this will trigger the post-save hook)
    await guest.save();

    // Mark bill as guest checked out (this will move it to guest history)
    const Bill = require("../models/Bill");
    await Bill.markGuestCheckedOut(guest._id);

    // Update room status to cleaning immediately
    const Room = require("../models/Room");
    await Room.findByIdAndUpdate(guest.room, {
      status: "cleaning",
      currentGuest: null,
      lastCleanedAt: new Date(),
    });

    // Schedule room to become available after 2 hours
    setTimeout(
      async () => {
        try {
          await Room.findByIdAndUpdate(guest.room, {
            status: "available",
            currentGuest: null,
          });
          console.log(
            `✅ Room ${guest.roomNumber} is now available after cleaning`
          );
        } catch (error) {
          console.error(
            `❌ Error updating room ${guest.roomNumber} to available:`,
            error
          );
        }
      },
      2 * 60 * 60 * 1000
    ); // 2 hours

    // Populate for response
    await guest.populate([
      { path: "room", select: "number type floor" },
      { path: "hotel", select: "name" },
    ]);

    res.status(200).json({
      success: true,
      message: "Guest checked out successfully",
      data: guest,
    });
  } catch (error) {
    console.error("Checkout guest error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Update guest
// @route   PUT /api/guests/:id
// @access  Private/Manager
exports.updateGuest = async (req, res, next) => {
  try {
    console.log(`Updating guest ${req.params.id}:`, req.body);

    let guest = await Guest.findById(req.params.id);
    if (!guest) {
      return next(
        new ErrorResponse(`Guest not found with id of ${req.params.id}`, 404)
      );
    }

    // If updating room, check availability
    if (req.body.room && req.body.room !== guest.room.toString()) {
      const newRoom = await Room.findById(req.body.room);
      if (!newRoom) {
        return next(new ErrorResponse("New room not found", 404));
      }

      if (newRoom.status !== "available") {
        return next(new ErrorResponse("New room is not available", 400));
      }

      // Check if new room is occupied by another guest
      const existingGuest = await Guest.findOne({
        room: req.body.room,
        status: "checked_in",
        _id: { $ne: req.params.id },
      });

      if (existingGuest) {
        return next(
          new ErrorResponse(
            "New room is already occupied by another guest",
            400
          )
        );
      }
    }

    // Update guest
    guest = await Guest.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate({
      path: "room",
      select: "number type floor price",
      model: "Room",
    });

    res.status(200).json({
      success: true,
      data: guest,
    });
  } catch (error) {
    console.error("Update guest error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Delete guest
// @route   DELETE /api/guests/:id
// @access  Private/Admin
exports.deleteGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return next(
        new ErrorResponse(`Guest not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if guest is currently checked in
    if (guest.status === "checked_in") {
      return next(
        new ErrorResponse(
          "Cannot delete a guest who is currently checked in",
          400
        )
      );
    }

    await Guest.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Delete guest error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Get guest by room number (for chat system - simplified)
// @route   GET /api/guests/room/:roomNumber
// @access  Public
exports.getGuestByRoom = async (req, res, next) => {
  try {
    const guest = await Guest.findOne({
      roomNumber: req.params.roomNumber,
      status: "checked_in",
    }).populate("room", "number type floor");

    if (!guest) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No active guest found for this room",
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
      status: guest.status,
    };

    res.status(200).json({
      success: true,
      data: guestInfo,
    });
  } catch (error) {
    console.error("Get guest by room error:", error);
    next(new ErrorResponse("Server error", 500));
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
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = stats.reduce(
      (acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      },
      { checked_in: 0, checked_out: 0, cancelled: 0, no_show: 0 }
    );

    // Get current occupancy
    const occupiedRooms = await Room.countDocuments({
      status: "occupied",
    });

    const totalRooms = await Room.countDocuments({
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        ...formattedStats,
        occupiedRooms,
        totalRooms,
        occupancyRate:
          totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Get guest stats error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Get active guests
// @route   GET /api/guests/active
// @access  Private/Manager
exports.getActiveGuests = async (req, res, next) => {
  try {
    const guests = await Guest.getActiveGuests();

    res.status(200).json({
      success: true,
      count: guests.length,
      data: guests,
    });
  } catch (error) {
    console.error("Get active guests error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Get guest history
// @route   GET /api/guests/history
// @access  Private/Manager
exports.getGuestHistory = async (req, res, next) => {
  try {
    const { status, roomNumber, guestName, startDate, endDate } = req.query;

    let query = { status: { $in: ["checked_out", "cancelled", "no_show"] } };

    if (roomNumber) query.roomNumber = roomNumber;
    if (guestName) query.name = { $regex: guestName, $options: "i" };
    if (startDate || endDate) {
      query.checkOutDate = {};
      if (startDate) query.checkOutDate.$gte = new Date(startDate);
      if (endDate) query.checkOutDate.$lte = new Date(endDate);
    }

    const guests = await Guest.find(query)
      .populate("room", "number type floor")
      .populate("hotel", "name")
      .sort({ checkOutDate: -1 });

    res.status(200).json({
      success: true,
      count: guests.length,
      data: guests,
    });
  } catch (error) {
    console.error("Get guest history error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Get guest checkout status
// @route   GET /api/guests/:id/checkout-status
// @access  Private/Manager
exports.getGuestCheckoutStatus = async (req, res, next) => {
  try {
    const checkoutInfo = await Guest.canCheckOut(req.params.id);

    res.status(200).json({
      success: true,
      data: checkoutInfo,
    });
  } catch (error) {
    console.error("Get guest checkout status error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Create a new guest
// @route   POST /api/guests
// @access  Private/Manager
exports.createGuest = async (req, res, next) => {
  try {
    console.log("Creating new guest:", req.body);

    // Check if room is available
    const room = await Room.findById(req.body.room);
    if (!room) {
      return next(new ErrorResponse("Room not found", 404));
    }

    if (room.status !== "available") {
      return next(new ErrorResponse("Room is not available for check-in", 400));
    }

    // Check if room is already assigned to another guest
    const existingGuest = await Guest.findOne({
      room: req.body.room,
      status: "checked_in",
    });

    if (existingGuest) {
      return next(
        new ErrorResponse("Room is already occupied by another guest", 400)
      );
    }

    // Create guest data
    const guestData = {
      ...req.body,
      status: "checked_in",
      checkInDate: new Date(req.body.checkInDate),
      checkOutDate: new Date(req.body.checkOutDate),
    };

    const guest = await Guest.create(guestData);

    // Populate room information
    await guest.populate({
      path: "room",
      select: "number type floor price",
      model: "Room",
    });

    console.log("Guest created successfully:", guest._id);

    res.status(201).json({
      success: true,
      data: guest,
    });
  } catch (error) {
    console.error("Create guest error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// Validation middleware for guest
exports.validateGuestData = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Guest name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Invalid phone number format"),

  body("room")
    .notEmpty()
    .withMessage("Room assignment is required")
    .isMongoId()
    .withMessage("Invalid room ID"),

  body("checkInDate")
    .notEmpty()
    .withMessage("Check-in date is required")
    .isISO8601()
    .withMessage("Invalid check-in date format"),

  body("checkOutDate")
    .notEmpty()
    .withMessage("Check-out date is required")
    .isISO8601()
    .withMessage("Invalid check-out date format")
    .custom((value, { req }) => {
      const checkIn = new Date(req.body.checkInDate);
      const checkOut = new Date(value);
      if (checkOut <= checkIn) {
        throw new Error("Check-out date must be after check-in date");
      }
      return true;
    }),

  body("adults")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Number of adults must be between 1 and 10"),

  body("children")
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage("Number of children must be between 0 and 10"),

  body("specialRequests")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Special requests must be less than 500 characters"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array().map((err) => err.msg),
      });
    }
    next();
  },
];

// Validation middleware for guest check-in
exports.validateGuestCheckIn = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Guest name is required")
    .isLength({ max: 100 })
    .withMessage("Guest name must be less than 100 characters"),

  body("phone").trim().notEmpty().withMessage("Phone number is required"),

  body("idType")
    .notEmpty()
    .withMessage("ID type is required")
    .isIn(["passport", "driving_license", "national_id", "other"])
    .withMessage("Invalid ID type"),

  body("idNumber").trim().notEmpty().withMessage("ID number is required"),

  body("checkInDate")
    .isISO8601()
    .withMessage("Valid check-in date is required"),

  body("checkOutDate")
    .isISO8601()
    .withMessage("Valid check-out date is required"),

  body("numberOfGuests")
    .isInt({ min: 1 })
    .withMessage("Number of guests must be at least 1"),

  body("roomId")
    .notEmpty()
    .withMessage("Room selection is required")
    .isMongoId()
    .withMessage("Invalid room ID"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];
