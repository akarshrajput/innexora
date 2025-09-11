const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
require("dotenv").config();

// Import database manager
const databaseManager = require("./utils/databaseManager");

// Import routes
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const foodRoutes = require("./routes/foodRoutes");
const guestRoutes = require("./routes/guestRoutes");
const guestHistoryRoutes = require("./routes/guestHistoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const billRoutes = require("./routes/billRoutes");
const tenantRoutes = require("./routes/tenantRoutes");

// Import middleware
const { errorHandler } = require("./middleware/errorMiddleware");
const { tenantMiddleware } = require("./middleware/tenantMiddleware");

// Initialize Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Define allowed origins
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://hotelflow-frontend-three.vercel.app",
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      // Check for exact matches
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check for subdomain patterns (*.localhost:3000)
      const subdomainPatterns = [
        /^http:\/\/[\w-]+\.localhost:3000$/,
        /^http:\/\/[\w-]+\.localhost:3001$/,
        /^https:\/\/[\w-]+\.innexora\.app$/,
      ];

      const isSubdomainMatch = subdomainPatterns.some((pattern) =>
        pattern.test(origin)
      );

      if (isSubdomainMatch) {
        return callback(null, true);
      }

      // Reject the request
      const msg =
        "The CORS policy for this site does not allow access from the specified origin.";
      return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-HTTP-Method-Override",
      "X-Tenant-Subdomain",
    ],
    optionsSuccessStatus: 200,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Apply tenant middleware to all routes (with error handling)
app.use((req, res, next) => {
  tenantMiddleware(req, res, (err) => {
    if (err) {
      console.error('Tenant middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
    next();
  });
});

// JWT secret check
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined");
  process.exit(1);
}

// Initialize main database connection
const initializeDatabase = async () => {
  try {
    await databaseManager.initMainConnection();
    console.log("✅ Database manager initialized");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
};

// Initialize database
initializeDatabase();

// API Routes
app.use("/api/hotel", tenantRoutes); // Hotel/tenant specific routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/guests/history", guestHistoryRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bills", billRoutes);

// Backend only serves API routes - frontend is deployed separately

// Health check endpoint
app.get("/health", (req, res) => {
  const dbStats = databaseManager.getConnectionStats();
  res.status(200).json({
    status: "ok",
    message: "Innexora API is running",
    timestamp: new Date().toISOString(),
    database: dbStats,
    domain: {
      isMainDomain: req.isMainDomain,
      subdomain: req.subdomain,
      hotel: req.hotel ? req.hotel.name : null,
    },
  });
});

// Root endpoint - different behavior for main vs tenant domains
app.get("/", (req, res) => {
  if (req.isMainDomain) {
    res.json({
      message: "Welcome to Innexora SaaS Platform",
      version: "2.0.0",
      type: "main_domain",
      documentation: "/api-docs",
    });
  } else if (req.hotel) {
    res.json({
      message: `Welcome to ${req.hotel.name} - Powered by Innexora`,
      version: "2.0.0",
      type: "tenant_domain",
      hotel: {
        name: req.hotel.name,
        subdomain: req.hotel.subdomain,
      },
    });
  } else {
    res.status(404).json({
      success: false,
      message: "Hotel not found",
      type: "invalid_domain",
    });
  }
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await databaseManager.closeAllConnections();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  await databaseManager.closeAllConnections();
  process.exit(0);
});

module.exports = app;
