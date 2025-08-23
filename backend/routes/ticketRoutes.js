const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const chatController = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (guest access via room-specific link)
router.post('/', ticketController.createTicket);
router.post('/guest', chatController.createGuestTicket);

// Protected routes (require authentication)
router.use(protect);

// Ticket management routes (staff and above)
router
  .route('/')
  .get(authorize('staff', 'manager', 'admin'), ticketController.getTickets);

router
  .route('/:id')
  .get(authorize('staff', 'manager', 'admin'), ticketController.getTicket);

// Update ticket status
router
  .route('/:id/status')
  .put(ticketController.updateTicketStatus);

// Add message to ticket
router
  .route('/:id/messages')
  .post(ticketController.addMessage);

module.exports = router;
