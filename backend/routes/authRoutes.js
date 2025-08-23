const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { 
  validateRegistration: validateManagerSignup, 
  validateLogin: validateManagerLogin, 
  authenticate: authenticateManager,
  authorizeManager 
} = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Register a hotel manager
// @access  Public
router.post('/register', validateManagerSignup, authController.register);

// @route   POST /api/auth/login
// @desc    Authenticate manager & get token
// @access  Public
router.post('/login', validateManagerLogin, authController.login);

// @route   POST /api/auth/logout
// @desc    Logout manager / clear cookie
// @access  Private
router.post('/logout', authenticateManager, authController.logout);

// @route   GET /api/auth/me
// @desc    Get current logged in manager
// @access  Private
router.get('/me', authenticateManager, authController.getMe);

// @route   POST /api/auth/forgot-password
// @desc    Forgot password - Send reset password email
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', authController.resetPassword);

module.exports = router;
