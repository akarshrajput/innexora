const axios = require('axios');
const Ticket = require('../models/Ticket');
const Room = require('../models/Room');

// Mistral AI configuration
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'your-mistral-api-key-here';

// Function to call Mistral AI
const callMistralAI = async (messages, maxTokens = 300) => {
  try {
    const response = await axios.post(MISTRAL_API_URL, {
      model: 'mistral-tiny', // Free tier model
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Mistral AI API error:', error.response?.data || error.message);
    throw error;
  }
};

// @desc    Handle AI chat for guests
// @route   POST /api/chat/ai
// @access  Public
exports.chatWithAI = async (req, res) => {
  try {
    const { message, guestInfo, conversationHistory = [] } = req.body;

    if (!message || !guestInfo) {
      return res.status(400).json({
        success: false,
        message: 'Message and guest info are required'
      });
    }

    // Enhanced system prompt for hotel AI assistant
    const systemPrompt = `You are an intelligent AI concierge for a luxury hotel. You're assisting ${guestInfo.guestName} who is staying in room ${guestInfo.roomNumber}. 

Your personality: Friendly, professional, helpful, and proactive. Always maintain a warm, welcoming tone.

Your capabilities:
1. IMMEDIATE HELP: Answer questions about hotel services, amenities, and policies
2. ROOM ASSISTANCE: Help with room-related issues and comfort requests  
3. CONCIERGE SERVICES: Provide local recommendations, directions, and travel assistance
4. SERVICE COORDINATION: Identify when human staff intervention is needed

Hotel Services Available:
• Room Service: 24/7 dining, special dietary requests
• Housekeeping: Extra amenities, cleaning schedules, maintenance
• Concierge: Restaurant reservations, transportation, local attractions
• Facilities: Pool (6 AM - 10 PM), Gym (24/7), Spa (9 AM - 9 PM)
• Business Center: Printing, meeting rooms, WiFi support

When to suggest creating a service request:
- Physical issues (broken items, temperature, plumbing, electrical)
- Service requests (room service, housekeeping, maintenance)
- Special accommodations or urgent needs
- Complaints or concerns requiring staff attention

Always be specific in your responses and offer to create a service request when appropriate. Keep responses conversational but informative.`;

    // Prepare conversation for Mistral AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call Mistral AI API with enhanced logic
    let aiResponse;
    let shouldCreateTicket = false;
    let urgencyLevel = 'medium';

    try {
      aiResponse = await callMistralAI(messages, 400);

      // Enhanced logic to determine if ticket should be created
      const urgentKeywords = ['emergency', 'urgent', 'broken', 'not working', 'leak', 'flooding', 'no power', 'locked out'];
      const serviceKeywords = [
        'room service', 'housekeeping', 'maintenance', 'clean', 'towels', 'pillows', 
        'temperature', 'hot water', 'cold', 'repair', 'fix', 'help', 'staff', 
        'manager', 'complaint', 'problem', 'issue', 'request'
      ];

      const isUrgent = urgentKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      const needsService = serviceKeywords.some(keyword => 
        message.toLowerCase().includes(keyword) || 
        aiResponse.toLowerCase().includes('service request')
      );

      if (isUrgent) {
        urgencyLevel = 'high';
        shouldCreateTicket = true;
      } else if (needsService) {
        shouldCreateTicket = true;
      }

      // If AI response suggests creating a ticket, set the flag
      if (aiResponse.toLowerCase().includes('service request') || 
          aiResponse.toLowerCase().includes('staff') ||
          aiResponse.toLowerCase().includes('help you with that')) {
        shouldCreateTicket = true;
      }

    } catch (mistralError) {
      console.error('Mistral AI API error:', mistralError);
      
      // Enhanced fallback response
      const fallbackResponses = [
        `Thank you for reaching out, ${guestInfo.guestName}! I understand you need assistance with "${message}". I'd be happy to help you with that right away.`,
        `Hello ${guestInfo.guestName}! I see you're looking for help with "${message}". Let me connect you with our staff who can assist you immediately.`,
        `Hi ${guestInfo.guestName}! I'm here to help with your request about "${message}". Our team is ready to provide excellent service for you.`
      ];
      
      aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)] + 
                  " Would you like me to create a service request so our hotel staff can assist you personally?";
      shouldCreateTicket = true;
    }

    res.json({
      success: true,
      message: aiResponse,
      shouldCreateTicket,
      urgencyLevel,
      timestamp: new Date(),
      conversationId: `${guestInfo.roomNumber}-${Date.now()}`
    });

  } catch (error) {
    console.error('Chat AI error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message'
    });
  }
};

// @desc    Create ticket from guest chat
// @route   POST /api/tickets/guest
// @access  Public
exports.createGuestTicket = async (req, res) => {
  try {
    const { roomNumber, guestInfo, initialMessage, priority = 'medium', conversationHistory = [] } = req.body;

    if (!roomNumber || !guestInfo || !initialMessage) {
      return res.status(400).json({
        success: false,
        message: 'Room number, guest info, and initial message are required'
      });
    }

    // Find the room to get the manager
    const room = await Room.findOne({ number: roomNumber });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Format conversation history for professional display
    const formattedConversation = conversationHistory.map(msg => ({
      content: msg.content,
      sender: msg.role === 'user' ? 'guest' : 'ai_assistant',
      senderName: msg.role === 'user' ? guestInfo.name : 'AI Assistant',
      timestamp: msg.timestamp || new Date().toISOString()
    }));

    // Create summary for the ticket
    const conversationSummary = `Guest Chat Summary:
${conversationHistory.map(msg => 
  `${msg.role === 'user' ? guestInfo.name : 'AI Assistant'}: ${msg.content}`
).join('\n')}

Current Request: ${initialMessage}`;

    // Create the ticket with conversation history
    const ticket = await Ticket.create({
      room: room._id,
      roomNumber: roomNumber,
      guestInfo: {
        name: guestInfo.name,
        email: guestInfo.email || '',
        phone: guestInfo.phone || ''
      },
      status: 'raised',
      priority: priority,
      manager: room.manager,
      subject: `Service Request - Room ${roomNumber}`,
      messages: [
        ...formattedConversation,
        {
          content: `🎫 Service Request Created\n\n${initialMessage}`,
          sender: 'system',
          senderName: 'System',
          timestamp: new Date().toISOString()
        }
      ]
    });

    // Populate the ticket with room details
    await ticket.populate('room');

    // Emit real-time notification to managers
    if (req.app && req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('newTicket', {
        ticket,
        notification: {
          title: 'New Service Request',
          message: `${guestInfo.name} from Room ${roomNumber} needs assistance`,
          priority: priority,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: ticket
    });

  } catch (error) {
    console.error('Create guest ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service request'
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
        message: 'Ticket ID and conversation history are required'
      });
    }

    const ticket = await Ticket.findById(ticketId).populate('room');
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Create system prompt for manager assistance
    const systemPrompt = `You are an AI assistant helping a hotel manager respond to guest requests. 

Guest: ${ticket.guestInfo.name}
Room: ${ticket.roomNumber}
Request Type: ${requestType || 'General'}
Priority: ${ticket.priority}

Based on the conversation history, suggest a professional and helpful response that:
1. Acknowledges the guest's request
2. Provides a solution or next steps
3. Sets appropriate expectations for timing
4. Maintains a friendly, professional tone

Keep the response concise and actionable. Focus on customer service excellence.`;

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.sender === 'guest' ? 'user' : 'assistant',
          content: msg.content
        }))
      ];

      const suggestion = await callMistralAI(messages, 200);

      res.json({
        success: true,
        suggestion,
        timestamp: new Date()
      });

    } catch (mistralError) {
      console.error('Mistral AI API error:', mistralError);
      
      // Fallback suggestion
      const fallbackSuggestion = `Thank you for bringing this to our attention, ${ticket.guestInfo.name}. I understand your concern and we'll address this promptly. Our team will take care of this for you within the next 30 minutes. Is there anything else I can help you with?`;
      
      res.json({
        success: true,
        suggestion: fallbackSuggestion,
        timestamp: new Date()
      });
    }

  } catch (error) {
    console.error('Manager AI assist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI assistance'
    });
  }
};
