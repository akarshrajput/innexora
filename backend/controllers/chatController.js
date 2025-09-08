const axios = require("axios");
const Ticket = require("../models/Ticket");
const Room = require("../models/Room");

// @desc    Handle AI chat for guests using hotel classifier
// @route   POST /api/chat/ai
// @access  Public
exports.chatWithAI = async (req, res) => {
  try {
    const { message, guestInfo, conversationHistory = [] } = req.body;

    if (!message || !guestInfo) {
      return res.status(400).json({
        success: false,
        message: "Message and guest info are required",
      });
    }

    // Call the hotel classifier API
    try {
      const classifierResponse = await axios.post(
        "https://hotel-classifier-api.onrender.com/classify",
        {
          guest_message: message,
          room_number: guestInfo.roomNumber,
        }
      );

      const classifierData = classifierResponse.data;

      // Send the classifier's reply as the chat response
      res.json({
        success: true,
        message: classifierData.reply,
        shouldCreateTicket: classifierData.should_create_ticket,
        categories: classifierData.categories || [],
        confidence: classifierData.confidence,
        reasoning: classifierData.reasoning,
        suggestedPriority: classifierData.suggested_priority,
        estimatedCompletionTime: classifierData.estimated_completion_time,
        timestamp: new Date(),
        conversationId: `${guestInfo.roomNumber}-${Date.now()}`,
      });

      // If should create ticket, automatically create tickets for each category
      if (classifierData.should_create_ticket && classifierData.categories) {
        setTimeout(async () => {
          await createTicketsFromCategories(
            classifierData.categories,
            guestInfo,
            message,
            req
          );
        }, 100); // Small delay to ensure response is sent first
      }
    } catch (classifierError) {
      console.error("Hotel classifier API error:", classifierError);

      // Simple fallback response when API is unavailable
      res.json({
        success: true,
        message: `Thank you for reaching out, ${guestInfo.guestName}! I understand you need assistance. Let me connect you with our staff who can help you right away.`,
        shouldCreateTicket: true,
        categories: [
          {
            category: "general",
            message: message,
            urgency: "medium",
          },
        ],
        timestamp: new Date(),
        conversationId: `${guestInfo.roomNumber}-${Date.now()}`,
      });

      // Create a general ticket as fallback
      setTimeout(async () => {
        await createTicketsFromCategories(
          [
            {
              category: "general",
              message: message,
              urgency: "medium",
            },
          ],
          guestInfo,
          message,
          req
        );
      }, 100);
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

    // Format conversation history for professional display
    const formattedConversation = conversationHistory.map((msg) => ({
      content: msg.content,
      sender: msg.role === "user" ? "guest" : "ai_assistant",
      senderName: msg.role === "user" ? guestInfo.name : "AI Assistant",
      timestamp: msg.timestamp || new Date().toISOString(),
    }));

    // Create summary for the ticket
    const conversationSummary = `Guest Chat Summary:
${conversationHistory
  .map(
    (msg) =>
      `${msg.role === "user" ? guestInfo.name : "AI Assistant"}: ${msg.content}`
  )
  .join("\n")}

Current Request: ${initialMessage}`;

    // Create the ticket with conversation history
    const ticket = await Ticket.create({
      room: room._id,
      roomNumber: roomNumber,
      guestInfo: {
        name: guestInfo.name,
        email: guestInfo.email || "",
        phone: guestInfo.phone || "",
      },
      status: "raised",
      priority: priority,
      subject: `Service Request - Room ${roomNumber}`,
      messages: [
        ...formattedConversation,
        {
          content: `🎫 Service Request Created\n\n${initialMessage}`,
          sender: "system",
          senderName: "System",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    // Populate the ticket with room details
    await ticket.populate("room");

    // Emit real-time notification to managers
    if (req.app && req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("newTicket", {
        ticket,
        notification: {
          title: "New Service Request",
          message: `${guestInfo.name} from Room ${roomNumber} needs assistance`,
          priority: priority,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Service request created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Create guest ticket error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create service request",
    });
  }
};

// @desc    Get AI suggestions for manager responses
// @route   POST /api/chat/manager-assist
// @access  Private/Manager
exports.managerAIAssist = async (req, res) => {
  try {
    const { ticketId, conversationHistory, requestType } = req.body;

    if (!ticketId || !conversationHistory) {
      return res.status(400).json({
        success: false,
        message: "Ticket ID and conversation history are required",
      });
    }

    const ticket = await Ticket.findById(ticketId).populate("room");
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Simple fallback suggestion without external AI
    const fallbackSuggestion = `Thank you for bringing this to our attention, ${ticket.guestInfo.name}. I understand your concern and we'll address this promptly. Our team will take care of this for you within the next 30 minutes. Is there anything else I can help you with?`;

    res.json({
      success: true,
      suggestion: fallbackSuggestion,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Manager AI assist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get AI assistance",
    });
  }
};
