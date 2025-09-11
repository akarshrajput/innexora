const databaseManager = require("../utils/databaseManager");
const MainHotel = require("../models/MainHotel");

// Cache for hotel data to avoid repeated database calls
const hotelCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Tenant middleware to detect subdomain and set up tenant database
exports.tenantMiddleware = async (req, res, next) => {
  try {
    const host = req.get("host") || req.headers.host;
    const tenantHeader =
      req.get("X-Tenant-Subdomain") || req.headers["x-tenant-subdomain"];

    console.log(
      `🏨 Tenant middleware: ${req.method} ${req.path} - Host: ${host}, Header: ${tenantHeader}`
    );

    if (!host) {
      return res.status(400).json({
        success: false,
        message: "Host header is required",
      });
    }

    // Extract subdomain from host or header
    const hostParts = host.split(".");
    let subdomain = null;

    // First check if subdomain is provided in header (for cross-origin requests)
    if (tenantHeader) {
      subdomain = tenantHeader.toLowerCase();
    } else {
      // Handle different host patterns
      if (hostParts.length >= 3) {
        // For subdomain.domain.com or subdomain.localhost:3000
        subdomain = hostParts[0];
      } else if (hostParts.length === 2 && hostParts[1].includes(":")) {
        // For subdomain.localhost:3000
        subdomain = hostParts[0];
      } else if (hostParts.length === 1 && host.includes(":")) {
        // For localhost:3000 format with subdomain prefix
        const fullHost = hostParts[0].split(":")[0];
        if (fullHost !== "localhost" && fullHost !== "127.0.0.1") {
          subdomain = fullHost;
        }
      }
    }

    req.subdomain = subdomain;
    req.isMainDomain = !subdomain || subdomain === "www" || subdomain === "app";

    // If it's the main domain, continue without tenant setup
    if (req.isMainDomain) {
      req.isPublicRoute = true;
      console.log(
        `🏨 Tenant middleware: Main domain detected, continuing without tenant setup`
      );
      return next();
    }

    // Check cache first
    const cacheKey = `hotel_${subdomain}`;
    const cachedData = hotelCache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      req.hotel = cachedData.hotel;
      req.tenantDb = cachedData.tenantDb;
      req.tenantModels = cachedData.tenantModels;
      return next();
    }

    // Get hotel data from main database
    const mainConnection = databaseManager.getMainConnection();
    const MainHotelModel = mainConnection.model(
      "MainHotel",
      require("../models/MainHotel").schema
    );

    const hotel = await MainHotelModel.findOne({
      subdomain: subdomain.toLowerCase(),
      status: "Active",
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found or inactive",
        code: "HOTEL_NOT_FOUND",
      });
    }

    // Get tenant database connection
    try {
      const tenantConnection = await databaseManager.getTenantConnection(
        hotel.subdomain,
        hotel.database_url
      );

      const tenantModels = databaseManager.getTenantModels(tenantConnection);

      // Cache the data
      hotelCache.set(cacheKey, {
        hotel: hotel.toObject(),
        tenantDb: tenantConnection,
        tenantModels,
        timestamp: Date.now(),
      });

      // Set request properties
      req.hotel = hotel;
      req.tenantDb = tenantConnection;
      req.tenantModels = tenantModels;
      req.isPublicRoute = false;

      console.log(
        `🏨 Tenant middleware: Setup complete for ${subdomain} - Hotel: ${hotel.name}, Models: ${Object.keys(tenantModels).length}`
      );
    } catch (dbError) {
      console.error(
        `Database connection error for ${hotel.subdomain}:`,
        dbError
      );
      return res.status(503).json({
        success: false,
        error: "Hotel database temporarily unavailable",
      });
    }

    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);

    // If it's a database connection error, return a specific error
    if (error.message.includes("Failed to connect to tenant database")) {
      return res.status(503).json({
        success: false,
        message: "Hotel database temporarily unavailable",
        code: "DATABASE_UNAVAILABLE",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error in tenant setup",
    });
  }
};

// Middleware to protect tenant routes (requires valid hotel)
exports.requireTenant = (req, res, next) => {
  if (req.isMainDomain || req.isPublicRoute) {
    return res.status(403).json({
      success: false,
      message: "This route requires a valid hotel subdomain",
    });
  }

  if (!req.hotel || !req.tenantModels) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  next();
};

// Middleware to protect main domain routes
exports.requireMainDomain = (req, res, next) => {
  if (!req.isMainDomain) {
    return res.status(403).json({
      success: false,
      message: "This route is only available on the main domain",
    });
  }

  next();
};

// Clear hotel cache for specific subdomain
exports.clearHotelCache = (subdomain) => {
  const cacheKey = `hotel_${subdomain}`;
  hotelCache.delete(cacheKey);
};

// Clear all hotel cache
exports.clearAllHotelCache = () => {
  hotelCache.clear();
};

// Get cache stats
exports.getCacheStats = () => {
  return {
    cacheSize: hotelCache.size,
    cacheKeys: Array.from(hotelCache.keys()),
  };
};
