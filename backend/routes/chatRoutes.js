const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes (guest access)
router.post('/ai', chatController.chatWithAI);

// Protected routes (staff and above)
router.use(protect);
router.post('/manager-assist', authorize('staff', 'manager', 'admin'), chatController.managerAIAssist);

module.exports = router;
