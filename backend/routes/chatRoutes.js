const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

// Public routes (guest access) - Only external API, no backend AI
router.post("/ai", chatController.chatWithAI);
router.post("/chat", chatController.chatWithAI); // Alternative endpoint for guest chat

// No AI functionality in backend - all removed

module.exports = router;
