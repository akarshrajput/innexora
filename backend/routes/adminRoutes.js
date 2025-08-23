const express = require('express');
const router = express.Router();
const ticketCleanupService = require('../services/ticketCleanupService');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication
router.use(protect);

// @desc    Get cleanup service status
// @route   GET /api/admin/cleanup/status
// @access  Private/Admin
router.get('/cleanup/status', authorize('admin', 'manager'), (req, res) => {
  const status = ticketCleanupService.getStatus();
  res.json({
    success: true,
    data: status
  });
});

// @desc    Trigger manual cleanup
// @route   POST /api/admin/cleanup/manual
// @access  Private/Manager
router.post('/cleanup/manual', async (req, res) => {
  try {
    await ticketCleanupService.manualCleanup();
    res.json({
      success: true,
      message: 'Manual cleanup completed successfully'
    });
  } catch (error) {
    console.error('Manual cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform manual cleanup'
    });
  }
});

module.exports = router;
