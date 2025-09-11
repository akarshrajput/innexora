const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");
// Remove automatic startup of cleanup services - they need tenant context
// const ticketCleanupService = require('./services/ticketCleanupService');
// const roomCleanupService = require('./services/roomCleanupService');

// Get port from environment and store in Express.
const port = process.env.PORT || 5050;
app.set("port", port);

// Create HTTP server.
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
});

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log("New WebSocket connection");

  // Join managers room for real-time ticket notifications
  socket.on("joinManagersRoom", (managerId) => {
    socket.join("managers");
    console.log(
      `Manager ${managerId} joined managers room for real-time notifications`
    );
  });

  // Join room for ticket updates
  socket.on("joinTicketRoom", (ticketId) => {
    socket.join(`ticket_${ticketId}`);
    console.log(`User joined ticket room: ticket_${ticketId}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Make io accessible in app
app.set("io", io);

// Listen on provided port, on all network interfaces.
server.listen(port, () => {
  console.log(`Server running on port ${port}`);

  // Cleanup services are disabled in multi-tenant mode
  // They need tenant context to work properly
  // ticketCleanupService.start();
  // roomCleanupService.start();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  // Cleanup services are disabled in multi-tenant mode
  // ticketCleanupService.stop();
  // roomCleanupService.stop();
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
