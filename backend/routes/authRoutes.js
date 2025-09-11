const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { requireTenant } = require("../middleware/tenantMiddleware");

// @route   POST /api/auth/register
// @desc    Register a new user (manager/staff)
// @access  Public (Tenant domain only)
router.post("/register", requireTenant, authController.register);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public (Tenant domain only)
router.post("/login", requireTenant, authController.login);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get("/me", protect, authController.getMe);

// @route   POST /api/auth/forgotpassword
// @desc    Forgot password - Send reset password email
// @access  Public
router.post("/forgotpassword", authController.forgotPassword);

// @route   PUT /api/auth/resetpassword/:resettoken
// @desc    Reset password
// @access  Public
router.put("/resetpassword/:resettoken", authController.resetPassword);

// @route   GET /api/auth/logout
// @desc    Logout user / clear cookie
// @access  Private
router.get("/logout", protect, authController.logout);

module.exports = router;
