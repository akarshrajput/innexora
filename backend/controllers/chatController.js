const axios = require("axios");
const Ticket = require("../models/Ticket");
const Room = require("../models/Room");
const Guest = require("../models/Guest");

// @desc    Handle AI chat for guests using hotel classifier
// @route   POST /api/chat/ai
// @access  Public
exports.chatWithAI = async (req, res) => {
  try {
    console.log("🔍 Received request body:", JSON.stringify(req.body, null, 2));
    const {
      message,
      guestInfo,
      guestId,
      roomNumber,
      conversationHistory = [],
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    console.log("📝 Extracted values:", {
      message,
      guestInfo,
      guestId,
      roomNumber,
    });

    // Handle both old format (guestInfo object) and new format (separate fields)
    let guestData;
    if (guestInfo) {
      guestData = guestInfo;
    } else if (guestId && roomNumber) {
      // Fetch guest details from database
      const guest = await Guest.findById(guestId);
      if (!guest) {
        return res.status(404).json({
          success: false,
          message: "Guest not found",
        });
      }

      guestData = {
        _id: guestId,
        guestName: guest.name,
        roomNumber: roomNumber,
        email: guest.email,
        phone: guest.phone,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Message and guest info are required",
      });
    }

    console.log(
      `💬 Chat request from ${guestData.guestName} in room ${guestData.roomNumber}`
    );
    console.log(`Message: "${message}"`);

    try {
      // Prepare the correct payload for the hotel classifier API
      const classifierPayload = {
        guest_message: message,
        room_number: guestData.roomNumber,
      };

      console.log(
        "🚀 Sending to classifier API:",
        JSON.stringify(classifierPayload, null, 2)
      );

      // Call the hotel classifier API - NO FALLBACK, only use external API
      const classifierResponse = await axios.post(
        "https://hotel-classifier-api.onrender.com/classify",
        classifierPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000, // 15 second timeout
        }
      );

      console.log(
        "✅ Classifier API response:",
        JSON.stringify(classifierResponse.data, null, 2)
      );

      const {
        should_create_ticket,
        categories,
        reply,
        confidence,
        reasoning,
        suggested_priority,
        estimated_completion_time,
      } = classifierResponse.data;

      // Send response to guest with the AI reply
      res.json({
        success: true,
        response: reply,
        shouldCreateTicket: should_create_ticket,
        categories,
        confidence,
        reasoning,
        estimatedCompletionTime: estimated_completion_time,
        timestamp: new Date(),
        conversationId: `${guestData.roomNumber}-${Date.now()}`,
      });

      // Create tickets ONLY if the external API determined they should be created
      if (should_create_ticket && categories && categories.length > 0) {
        console.log(
          `🎫 Creating ${categories.length} tickets for room ${guestData.roomNumber}`
        );

        setTimeout(async () => {
          await createTicketsFromCategories(
            categories,
            guestData,
            message,
            req
          );
        }, 100);
      }
    } catch (apiError) {
      console.error("❌ Hotel classifier API error:", apiError.message);

      // NO FALLBACK - Return error if external API fails
      res.status(503).json({
        success: false,
        message:
          "Chat service is temporarily unavailable. Please try again later or contact the front desk directly.",
        error: "External AI service unavailable",
      });
    }
  } catch (error) {
    console.error("Chat AI error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process chat message",
    });
  }
};

// Helper function to create tickets from categories
const createTicketsFromCategories = async (
  categories,
  guestInfo,
  originalMessage,
  req
) => {
  try {
    const room = await Room.findOne({ number: guestInfo.roomNumber });

    if (!room) {
      console.error("Room not found for ticket creation");
      return;
    }

    for (const category of categories) {
      const ticket = await Ticket.create({
        room: room._id,
        roomNumber: guestInfo.roomNumber,
        guestInfo: {
          name: guestInfo.guestName,
          email: guestInfo.email || "",
          phone: guestInfo.phone || "",
        },
        status: "raised",
        priority: category.urgency || "medium",
        category: category.category,
        subject: category.message,
        messages: [
          {
            content: `🏨 Original Guest Message: "${originalMessage}"\n\n📋 Categorized Request: ${category.message}`,
            sender: "system",
            senderName: "Auto-Generated",
            timestamp: new Date().toISOString(),
          },
        ],
      });

      // Emit real-time notification to managers
      if (req && req.app && req.app.get("io")) {
        const io = req.app.get("io");
        io.emit("newTicket", {
          ticket,
          notification: {
            title: "New Service Request",
            message: `${guestInfo.guestName} from Room ${guestInfo.roomNumber} - ${category.category}`,
            priority: category.urgency || "medium",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    console.log(
      `Created ${categories.length} tickets for room ${guestInfo.roomNumber}`
    );
  } catch (error) {
    console.error("Error creating tickets from categories:", error);
  }
};

// @desc    Create ticket from guest chat
// @route   POST /api/tickets/guest
// @access  Public
exports.createGuestTicket = async (req, res) => {
  try {
    const {
      roomNumber,
      guestInfo,
      initialMessage,
      priority = "medium",
      conversationHistory = [],
    } = req.body;

    if (!roomNumber || !guestInfo || !initialMessage) {
      return res.status(400).json({
        success: false,
        message: "Room number, guest info, and initial message are required",
      });
    }

    // Find the room to get the manager
    const room = await Room.findOne({ number: roomNumber });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Create the ticket
    const ticket = await Ticket.create({
      room: room._id,
      roomNumber,
      guestInfo,
      status: "raised",
      priority,
      category: "general",
      subject: `Guest inquiry - ${guestInfo.name}`,
      messages: [
        {
          content: initialMessage,
          sender: "guest",
          senderName: guestInfo.name,
          timestamp: new Date().toISOString(),
        },
        ...conversationHistory.map((msg, index) => ({
          content: msg.content,
          sender: msg.role === "user" ? "guest" : "staff",
          senderName: msg.role === "user" ? guestInfo.name : "AI Assistant",
          timestamp: new Date(
            Date.now() - (conversationHistory.length - index) * 1000
          ).toISOString(),
        })),
      ],
    });

    // Emit real-time notification to managers
    if (req.app && req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("newTicket", {
        ticket,
        notification: {
          title: "New Guest Ticket",
          message: `${guestInfo.name} from Room ${roomNumber}`,
          priority: priority,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(201).json({
      success: true,
      data: ticket,
      message: "Ticket created successfully",
    });
  } catch (error) {
    console.error("Create guest ticket error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create ticket",
    });
  }
};

// @desc    Manager AI Assistant - REMOVED
// No AI functionality in backend - only external API
