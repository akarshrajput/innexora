const Food = require("../models/Food");
const { body, validationResult } = require("express-validator");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all food items for the manager
// @route   GET /api/food
// @access  Private/Manager
exports.getFoodItems = async (req, res, next) => {
  try {
    const Food = req.tenantModels
      ? req.tenantModels.Food
      : require("../models/Food");
    const { category, isAvailable, search } = req.query;

    // Build query - remove manager filter for hotel-centric approach
    const query = {};

    if (category) query.category = category;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const foodItems = await Food.find(query).sort({ category: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: foodItems.length,
      data: foodItems,
    });
  } catch (error) {
    console.error("Get food items error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Get single food item
// @route   GET /api/food/:id
// @access  Private/Manager
exports.getFoodItem = async (req, res, next) => {
  try {
    const Food = req.tenantModels
      ? req.tenantModels.Food
      : require("../models/Food");
    const foodItem = await Food.findOne({
      _id: req.params.id,
    });

    if (!foodItem) {
      return next(new ErrorResponse("Food item not found", 404));
    }

    res.status(200).json({
      success: true,
      data: foodItem,
    });
  } catch (error) {
    console.error("Get food item error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Create food item
// @route   POST /api/food
// @access  Private/Manager
exports.createFoodItem = async (req, res, next) => {
  try {
    const Food = req.tenantModels
      ? req.tenantModels.Food
      : require("../models/Food");
    console.log("Creating food item with data:", req.body);

    const foodItem = await Food.create(req.body);

    res.status(201).json({
      success: true,
      data: foodItem,
    });
  } catch (error) {
    console.error("Create food item error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages,
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Update food item
// @route   PUT /api/food/:id
// @access  Private/Manager
exports.updateFoodItem = async (req, res, next) => {
  try {
    const Food = req.tenantModels
      ? req.tenantModels.Food
      : require("../models/Food");
    let foodItem = await Food.findOne({
      _id: req.params.id,
    });

    if (!foodItem) {
      return next(new ErrorResponse("Food item not found", 404));
    }

    // Update food item fields
    const fieldsToUpdate = [
      "name",
      "description",
      "category",
      "price",
      "isAvailable",
      "preparationTime",
      "ingredients",
      "allergens",
      "isVegetarian",
      "isVegan",
      "spiceLevel",
      "imageUrl",
    ];

    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        foodItem[field] = req.body[field];
      }
    });

    await foodItem.save();

    res.status(200).json({
      success: true,
      data: foodItem,
    });
  } catch (error) {
    console.error("Update food item error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Delete food item
// @route   DELETE /api/food/:id
// @access  Private/Manager
exports.deleteFoodItem = async (req, res, next) => {
  try {
    const Food = req.tenantModels
      ? req.tenantModels.Food
      : require("../models/Food");
    const foodItem = await Food.findOne({
      _id: req.params.id,
    });

    if (!foodItem) {
      return next(new ErrorResponse("Food item not found", 404));
    }

    await foodItem.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error("Delete food item error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Get food categories
// @route   GET /api/food/categories
// @access  Private/Manager
exports.getFoodCategories = async (req, res, next) => {
  try {
    const Food = req.tenantModels
      ? req.tenantModels.Food
      : require("../models/Food");
    const categories = await Food.distinct("category");

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get food categories error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// @desc    Toggle food availability
// @route   PATCH /api/food/:id/availability
// @access  Private/Manager
exports.toggleFoodAvailability = async (req, res, next) => {
  try {
    const Food = req.tenantModels
      ? req.tenantModels.Food
      : require("../models/Food");
    console.log("Toggling availability for food ID:", req.params.id);
    console.log("User role:", req.user?.role);

    const foodItem = await Food.findOne({
      _id: req.params.id,
    });

    if (!foodItem) {
      return next(new ErrorResponse("Food item not found", 404));
    }

    console.log("Current availability:", foodItem.isAvailable);
    foodItem.isAvailable = !foodItem.isAvailable;
    await foodItem.save();
    console.log("New availability:", foodItem.isAvailable);

    res.status(200).json({
      success: true,
      data: foodItem,
    });
  } catch (error) {
    console.error("Toggle food availability error:", error);
    next(new ErrorResponse("Server error", 500));
  }
};

// Validation middleware for food items
exports.validateFoodItem = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Food name is required")
    .isLength({ max: 100 })
    .withMessage("Food name must be less than 100 characters"),

  body("category").notEmpty().withMessage("Category is required"),

  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("preparationTime")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Preparation time must be at least 1 minute"),

  body("dietaryInfo")
    .optional()
    .isArray()
    .withMessage("dietaryInfo must be an array"),

  body("spiceLevel")
    .optional()
    .isIn(["mild", "medium", "hot", "very_hot"])
    .withMessage("Invalid spice level"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];
