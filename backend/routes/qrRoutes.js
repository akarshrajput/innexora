const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route for QR code validation
router.post('/validate', qrController.validateQRCode);

// Protected routes (require authentication)
router.use(protect);

// QR code management (staff and above)
router.post('/generate', authorize('staff', 'manager', 'admin'), qrController.generateQRCode);
router.get('/', authorize('staff', 'manager', 'admin'), qrController.getQRCodes);
router.delete('/:id', authorize('staff', 'manager', 'admin'), qrController.revokeQRCode);

module.exports = router;
