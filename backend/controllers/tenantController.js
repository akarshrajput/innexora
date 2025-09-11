const { clearHotelCache } = require("../middleware/tenantMiddleware");

// @desc    Get hotel information by subdomain
// @route   GET /api/hotel/info
// @access  Public (for tenant domains)
exports.getHotelInfo = async (req, res) => {
  try {
    if (!req.hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    // Return hotel information (excluding sensitive data)
    const hotelInfo = {
      id: req.hotel._id,
      name: req.hotel.name,
      subdomain: req.hotel.subdomain,
      website: req.hotel.website,
      description: req.hotel.description,
      logo_url: req.hotel.logo_url,
      cover_image_url: req.hotel.cover_image_url,
      phone: req.hotel.phone,
      email: req.hotel.email,
      address: {
        line1: req.hotel.address_line1,
        line2: req.hotel.address_line2,
        city: req.hotel.city,
        state: req.hotel.state,
        country: req.hotel.country,
        postal_code: req.hotel.postal_code,
      },
      coordinates: {
        latitude: req.hotel.latitude,
        longitude: req.hotel.longitude,
      },
      timezone: req.hotel.timezone,
      currency: req.hotel.currency,
      check_in_time: req.hotel.check_in_time,
      check_out_time: req.hotel.check_out_time,
      stars_rating: req.hotel.stars_rating,
      amenities: req.hotel.amenities,
      policy: req.hotel.policy,
      fullAddress: req.hotel.fullAddress,
      hotelUrl: req.hotel.hotelUrl,
    };

    res.status(200).json({
      success: true,
      data: hotelInfo,
    });
  } catch (error) {
    console.error("Get hotel info error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving hotel information",
    });
  }
};

// @desc    Check if subdomain exists and is active
// @route   GET /api/hotel/check-subdomain/:subdomain
// @access  Public
exports.checkSubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      return res.status(400).json({
        success: false,
        message: "Subdomain is required",
      });
    }

    const databaseManager = require("../utils/databaseManager");
    const mainConnection = databaseManager.getMainConnection();
    const MainHotelModel = mainConnection.model(
      "MainHotel",
      require("../models/MainHotel").schema
    );

    const hotel = await MainHotelModel.findOne({
      subdomain: subdomain.toLowerCase(),
      status: "Active",
    }).select("name subdomain status");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Subdomain not found or inactive",
        exists: false,
      });
    }

    res.status(200).json({
      success: true,
      exists: true,
      data: {
        name: hotel.name,
        subdomain: hotel.subdomain,
        status: hotel.status,
      },
    });
  } catch (error) {
    console.error("Check subdomain error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking subdomain",
    });
  }
};

// @desc    Get public hotel information (for main domain)
// @route   GET /api/hotels/public
// @access  Public
exports.getPublicHotels = async (req, res) => {
  try {
    const databaseManager = require("../utils/databaseManager");
    const mainConnection = databaseManager.getMainConnection();
    const MainHotelModel = mainConnection.model(
      "MainHotel",
      require("../models/MainHotel").schema
    );

    const hotels = await MainHotelModel.find({
      status: "Active",
    })
      .select("name subdomain description logo_url city country stars_rating")
      .limit(20)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    console.error("Get public hotels error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving hotels",
    });
  }
};

// @desc    Get hotel statistics (for main domain admin)
// @route   GET /api/hotels/stats
// @access  Private (Admin only on main domain)
exports.getHotelStats = async (req, res) => {
  try {
    const databaseManager = require("../utils/databaseManager");
    const mainConnection = databaseManager.getMainConnection();
    const MainHotelModel = mainConnection.model(
      "MainHotel",
      require("../models/MainHotel").schema
    );

    const stats = await MainHotelModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalHotels = await MainHotelModel.countDocuments();

    const formattedStats = {
      total: totalHotels,
      active: 0,
      inactive: 0,
      suspended: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id.toLowerCase()] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    console.error("Get hotel stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving hotel statistics",
    });
  }
};

// @desc    Refresh hotel cache
// @route   POST /api/hotel/refresh-cache
// @access  Private (Tenant domain)
exports.refreshHotelCache = async (req, res) => {
  try {
    if (!req.hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    // Clear cache for this hotel
    clearHotelCache(req.hotel.subdomain);

    res.status(200).json({
      success: true,
      message: "Hotel cache refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh hotel cache error:", error);
    res.status(500).json({
      success: false,
      message: "Error refreshing hotel cache",
    });
  }
};
