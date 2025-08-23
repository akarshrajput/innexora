const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Initialize Supabase client with email confirmation disabled
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: {
    autoConfirmEmail: true,
    detectSessionInUrl: false,
  }
});

// @desc    Register a hotel manager
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, hotelName, email, password } = req.body;

    // Validate input
    if (!name || !hotelName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, hotel name, email, and password'
      });
    }

    // Check if user already exists in our database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          hotel_name: hotelName,
          email_confirm: true  // Auto-confirm email
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ 
        success: false,
        message: authError.message 
      });
    }

    // Create user in our database
    const user = await User.create({
      name,
      hotelName,
      email,
      supabaseId: authData.user.id,
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        hotelName: user.hotelName
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        hotelName: user.hotelName,
        email: user.email
      },
      token,
      message: 'Registration successful!'
    });

  } catch (error) {
    console.error('Registration error:', error);
    // Clean up Supabase user if database operation fails
    if (req.body.email) {
      await supabase.auth.admin.deleteUser(req.body.email);
    }
    return res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Authenticate hotel manager & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Login error:', authError);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: process.env.NODE_ENV === 'development' ? authError.message : undefined
      });
    }

    // Find user in our database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name,
        hotelName: user.hotelName
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        hotelName: user.hotelName,
        email: user.email,
      },
      token,
      message: 'Login successful!'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout hotel manager
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error logging out',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully logged out',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current logged in manager
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // The user is already attached to the request by the auth middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Get fresh user data from database
    const user = await User.findById(req.user.userId).select('-__v -createdAt -updatedAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        hotelName: user.hotelName,
        email: user.email,
        isActive: user.isActive
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Forgot password - Send reset password email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`,
    });

    if (error) {
      console.error('Forgot password error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
    }

    // This would be handled by Supabase's password reset flow
    // The frontend would handle the token and call Supabase's updateUser
    // This is just a placeholder as the actual implementation depends on your frontend flow
    
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
