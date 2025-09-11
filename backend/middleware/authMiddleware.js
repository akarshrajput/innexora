const jwt = require("jsonwebtoken");

exports.protect = async (req, res, next) => {
  let token;

  console.log(" Auth middleware - Headers:", {
    authorization: req.headers.authorization,
    cookies: req.cookies,
    subdomain: req.subdomain,
    isMainDomain: req.isMainDomain
  });

  // Get token from header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    console.log(" Token from header:", token ? "Present" : "Missing");
  }
  // Get token from cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
    console.log(" Token from cookies:", token ? "Present" : "Missing");
  }

  // Make sure token exists
  if (!token) {
    console.log(" No token found in request");
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    
    console.log("🔐 JWT decoded:", { id: decoded.id, isMainDomain: req.isMainDomain });
    
    // For tenant domains (hotel subdomains)
    if (!req.isMainDomain && req.tenantModels && req.tenantModels.User) {
      console.log("🔐 Looking up user in tenant database");
      try {
        // Add timeout and retry logic for tenant database queries
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database query timeout')), 15000);
        });
        
        const userPromise = req.tenantModels.User.findById(decoded.id).select("-password");
        
        user = await Promise.race([userPromise, timeoutPromise]);
        console.log("🔐 Tenant user found:", user ? `${user.name} (${user.email})` : "None");
        
        if (!user) {
          console.log("❌ User not found in tenant database");
          return res.status(401).json({
            success: false,
            error: "User not found in hotel database",
          });
        }
      } catch (error) {
        console.error("❌ Tenant user lookup error:", error.message);
        
        // For timeout or connection errors, return 503 instead of 500
        if (error.message.includes('timeout') || error.message.includes('connection')) {
          return res.status(503).json({
            success: false,
            error: "Hotel database temporarily unavailable",
          });
        }
        
        return res.status(500).json({
          success: false,
          error: "Database error during authentication",
        });
      }
    }
    // For main domain
    else if (req.isMainDomain) {
      console.log("🔐 Looking up user in main database");
      const User = require("../models/User");
      try {
        // Timeout wrapper for main database query
        const mainUserPromise = Promise.race([
          User.findById(decoded.id).select('-password'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Main database query timeout')), 15000)
          )
        ]);
        
        user = await mainUserPromise;
        console.log("🔐 Main user found:", user ? `${user.name} (${user.email})` : "None");
        
        if (!user) {
          console.log("❌ User not found in main database");
          return res.status(401).json({
            success: false,
            error: "User not found in main database",
          });
        }
      } catch (error) {
        console.error("❌ Main user lookup error:", error.message);
        
        // For timeout or connection errors, return 503
        if (error.message.includes('timeout') || error.message.includes('connection')) {
          return res.status(503).json({
            success: false,
            error: "Main database temporarily unavailable",
          });
        }
        
        return res.status(500).json({
          success: false,
          error: "Database error during authentication",
        });
      }
    }
    // Invalid domain configuration
    else {
      console.error("❌ Invalid domain configuration:", {
        isMainDomain: req.isMainDomain,
        hasTenantModels: !!req.tenantModels,
        subdomain: req.subdomain,
      });
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Error in protect middleware:", err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: "Token expired",
      });
    }
    
    return res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
