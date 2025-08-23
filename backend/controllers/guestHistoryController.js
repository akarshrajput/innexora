const Guest = require('../models/Guest');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Ticket = require('../models/Ticket');
const Room = require('../models/Room');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get comprehensive guest history with all related data
// @route   GET /api/guests/history
// @access  Private/Manager
exports.getGuestHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const {
      search,
      status,
      dateFrom,
      dateTo,
      sortBy = 'checkInDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { manager: req.user.userId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { roomNumber: { $regex: search, $options: 'i' } },
        { idNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.checkInDate = {};
      if (dateFrom) query.checkInDate.$gte = new Date(dateFrom);
      if (dateTo) query.checkInDate.$lte = new Date(dateTo);
    }

    // Get total count for pagination
    const total = await Guest.countDocuments(query);

    // Get guests with pagination
    const guests = await Guest.find(query)
      .populate('room', 'number type floor price')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit);

    // Get related data for each guest
    const guestsWithHistory = await Promise.all(
      guests.map(async (guest) => {
        const [orders, bills, tickets] = await Promise.all([
          Order.find({ guest: guest._id })
            .populate('items.food', 'name price category')
            .sort({ orderDate: -1 }),
          Bill.find({ guest: guest._id })
            .sort({ createdAt: -1 }),
          Ticket.find({ 
            $or: [
              { guestName: guest.name },
              { roomNumber: guest.roomNumber }
            ]
          }).sort({ createdAt: -1 })
        ]);

        return {
          ...guest.toObject(),
          orders,
          bills,
          tickets,
          totalSpent: bills.reduce((sum, bill) => sum + bill.total, 0),
          totalOrders: orders.length,
          totalTickets: tickets.length
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        guests: guestsWithHistory,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get guest history error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get detailed guest profile with complete history
// @route   GET /api/guests/history/:id
// @access  Private/Manager
exports.getGuestProfile = async (req, res, next) => {
  try {
    const guest = await Guest.findOne({
      _id: req.params.id,
      manager: req.user.userId
    }).populate('room', 'number type floor price amenities');

    if (!guest) {
      return next(new ErrorResponse('Guest not found', 404));
    }

    // Get all related data
    const [orders, bills, tickets, allStays] = await Promise.all([
      Order.find({ guest: guest._id })
        .populate('items.food', 'name price category preparationTime')
        .sort({ orderDate: -1 }),
      Bill.find({ guest: guest._id })
        .sort({ createdAt: -1 }),
      Ticket.find({ 
        $or: [
          { guestName: guest.name },
          { roomNumber: guest.roomNumber }
        ]
      }).sort({ createdAt: -1 }),
      Guest.find({ 
        $or: [
          { phone: guest.phone },
          { email: guest.email },
          { idNumber: guest.idNumber }
        ],
        manager: req.user.userId
      }).populate('room', 'number type').sort({ checkInDate: -1 })
    ]);

    // Calculate statistics
    const stats = {
      totalStays: allStays.length,
      totalSpent: bills.reduce((sum, bill) => sum + bill.total, 0),
      totalOrders: orders.length,
      totalTickets: tickets.length,
      averageStayDuration: allStays.reduce((sum, stay) => sum + (stay.stayDuration || 0), 0) / allStays.length || 0,
      favoriteRoomType: getMostFrequent(allStays.map(stay => stay.room?.type).filter(Boolean)),
      totalItemsOrdered: orders.reduce((sum, order) => sum + order.items.length, 0),
      lastVisit: allStays[0]?.checkInDate,
      firstVisit: allStays[allStays.length - 1]?.checkInDate
    };

    res.status(200).json({
      success: true,
      data: {
        guest,
        orders,
        bills,
        tickets,
        allStays,
        stats
      }
    });
  } catch (error) {
    console.error('Get guest profile error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Get guest history statistics
// @route   GET /api/guests/history/stats
// @access  Private/Manager
exports.getGuestHistoryStats = async (req, res, next) => {
  try {
    const [
      totalGuests,
      activeGuests,
      checkedOutGuests,
      totalRevenue,
      totalOrders,
      totalTickets,
      repeatGuests
    ] = await Promise.all([
      Guest.countDocuments({ manager: req.user.userId }),
      Guest.countDocuments({ manager: req.user.userId, status: 'checked_in' }),
      Guest.countDocuments({ manager: req.user.userId, status: 'checked_out' }),
      Bill.aggregate([
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.countDocuments({}),
      Ticket.countDocuments({}),
      Guest.aggregate([
        { $match: { manager: req.user.userId } },
        { $group: { _id: { phone: '$phone', email: '$email' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'repeatGuests' }
      ])
    ]);

    // Recent activity
    const recentActivity = await Guest.find({ manager: req.user.userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('room', 'number type');

    res.status(200).json({
      success: true,
      data: {
        totalGuests,
        activeGuests,
        checkedOutGuests,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders,
        totalTickets,
        repeatGuests: repeatGuests[0]?.repeatGuests || 0,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get guest history stats error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// @desc    Search guests across all data
// @route   GET /api/guests/history/search
// @access  Private/Manager
exports.searchGuestHistory = async (req, res, next) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchRegex = { $regex: q, $options: 'i' };
    let results = {};

    if (type === 'all' || type === 'guests') {
      results.guests = await Guest.find({
        manager: req.user.userId,
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { roomNumber: searchRegex },
          { idNumber: searchRegex }
        ]
      }).populate('room', 'number type').limit(10);
    }

    if (type === 'all' || type === 'orders') {
      results.orders = await Order.find({
        manager: req.user.userId,
        $or: [
          { orderNumber: searchRegex },
          { 'guest.name': searchRegex }
        ]
      }).populate('guest', 'name roomNumber').limit(10);
    }

    if (type === 'all' || type === 'bills') {
      results.bills = await Bill.find({
        manager: req.user.userId,
        billNumber: searchRegex
      }).populate('guest', 'name roomNumber').limit(10);
    }

    if (type === 'all' || type === 'tickets') {
      results.tickets = await Ticket.find({
        manager: req.user.userId,
        $or: [
          { guestName: searchRegex },
          { roomNumber: searchRegex },
          { subject: searchRegex }
        ]
      }).limit(10);
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Search guest history error:', error);
    next(new ErrorResponse('Server error', 500));
  }
};

// Helper function to get most frequent item
function getMostFrequent(arr) {
  if (!arr.length) return null;
  const frequency = {};
  arr.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
  return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
}

module.exports = exports;
