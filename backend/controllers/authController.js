const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelName: user.hotelName,
      },
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Tenant domain only)
exports.register = async (req, res) => {
  try {
    // Check if this is a tenant domain
    if (!req.tenantModels || !req.hotel) {
      return res.status(403).json({
        success: false,
        message: "Registration is only available for hotel domains",
      });
    }

    const { name, email, password, role = "manager" } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Use tenant User model
    const User = req.tenantModels.User;

    // Check if user already exists in tenant database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user with hotel name from tenant context
    const user = await User.create({
      name,
      email,
      password,
      role,
      hotelName: req.hotel.name,
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: err.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public (Tenant domain only)
exports.login = async (req, res) => {
  try {
    // Check if this is a tenant domain
    if (!req.tenantModels || !req.hotel) {
      return res.status(403).json({
        success: false,
        message: "Login is only available for hotel domains",
      });
    }

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Use tenant User model and include password for comparison
    const User = req.tenantModels.User;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: err.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // User is already attached to req by protect middleware
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public (Tenant domain only)
exports.forgotPassword = async (req, res) => {
  try {
    // Check if this is a tenant domain
    if (!req.tenantModels || !req.hotel) {
      return res.status(403).json({
        success: false,
        message: "Password reset is only available for hotel domains",
      });
    }

    const User = req.tenantModels.User;
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a reset email has been sent",
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // TODO: Send email with reset token
    const resetUrl = `${req.protocol}://${req.get("host")}/resetpassword/${resetToken}`;

    // For now, we'll just log the reset URL
    console.log("Reset URL:", resetUrl);

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a reset email has been sent",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public (Tenant domain only)
exports.resetPassword = async (req, res) => {
  try {
    // Check if this is a tenant domain
    if (!req.tenantModels || !req.hotel) {
      return res.status(403).json({
        success: false,
        message: "Password reset is only available for hotel domains",
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    const User = req.tenantModels.User;
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};
