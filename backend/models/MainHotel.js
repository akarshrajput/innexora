const mongoose = require("mongoose");

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
      maxlength: [100, "Hotel name cannot exceed 100 characters"],
    },
    subdomain: {
      type: String,
      required: [true, "Subdomain is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        "Subdomain can only contain lowercase letters, numbers, and hyphens",
      ],
      maxlength: [50, "Subdomain cannot exceed 50 characters"],
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, "Please enter a valid website URL"],
    },
    database_url: {
      type: String,
      trim: true,
      required: [true, "MongoDB Atlas database URL is required"],
      match: [
        /^mongodb(\+srv)?:\/\/.+/,
        "Please enter a valid MongoDB Atlas connection string",
      ],
      validate: {
        validator: function (url) {
          // Additional validation for MongoDB Atlas URLs
          return (
            url.includes("mongodb.net") ||
            url.includes("mongodb://") ||
            url.includes("mongodb+srv://")
          );
        },
        message: "Database URL must be a valid MongoDB Atlas connection string",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    logo_url: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, "Please enter a valid logo URL"],
    },
    cover_image_url: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, "Please enter a valid cover image URL"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    address_line1: {
      type: String,
      trim: true,
      maxlength: [200, "Address line 1 cannot exceed 200 characters"],
    },
    address_line2: {
      type: String,
      trim: true,
      maxlength: [200, "Address line 2 cannot exceed 200 characters"],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, "State cannot exceed 100 characters"],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, "Country cannot exceed 100 characters"],
    },
    postal_code: {
      type: String,
      trim: true,
      maxlength: [20, "Postal code cannot exceed 20 characters"],
    },
    latitude: {
      type: Number,
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
    },
    longitude: {
      type: Number,
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
    },
    timezone: {
      type: String,
      trim: true,
      default: "UTC",
      maxlength: [50, "Timezone cannot exceed 50 characters"],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      minlength: [3, "Currency code must be 3 characters"],
      maxlength: [3, "Currency code must be 3 characters"],
      match: [/^[A-Z]{3}$/, "Currency must be a valid 3-letter code"],
    },
    check_in_time: {
      type: String,
      trim: true,
      default: "14:00",
      match: [
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please enter time in HH:MM format",
      ],
    },
    check_out_time: {
      type: String,
      trim: true,
      default: "11:00",
      match: [
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please enter time in HH:MM format",
      ],
    },
    stars_rating: {
      type: Number,
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
      default: 3,
    },
    amenities: {
      type: [String],
      default: [],
      validate: {
        validator: function (amenities) {
          return amenities.length <= 50;
        },
        message: "Cannot have more than 50 amenities",
      },
    },
    policy: {
      type: Map,
      of: String,
      default: new Map(),
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive", "Suspended"],
        message: "Status must be either Active, Inactive, or Suspended",
      },
      default: "Active",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance (removed subdomain index as it's already unique)
hotelSchema.index({ status: 1 });
hotelSchema.index({ name: "text", description: "text" });
hotelSchema.index({ city: 1, country: 1 });

// Virtual for full address
hotelSchema.virtual("fullAddress").get(function () {
  const addressParts = [
    this.address_line1,
    this.address_line2,
    this.city,
    this.state,
    this.country,
    this.postal_code,
  ].filter((part) => part && part.trim() !== "");

  return addressParts.join(", ");
});

// Virtual for complete URL
hotelSchema.virtual("hotelUrl").get(function () {
  return `https://${this.subdomain}.innexora.app`;
});

// Pre-save middleware to ensure subdomain uniqueness and format
hotelSchema.pre("save", function (next) {
  if (this.isModified("subdomain")) {
    this.subdomain = this.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
  }
  next();
});

// Static method to find active hotels
hotelSchema.statics.findActive = function () {
  return this.find({ status: "Active" });
};

// Instance method to activate hotel
hotelSchema.methods.activate = function () {
  this.status = "Active";
  return this.save();
};

// Instance method to deactivate hotel
hotelSchema.methods.deactivate = function () {
  this.status = "Inactive";
  return this.save();
};

// Instance method to suspend hotel
hotelSchema.methods.suspend = function () {
  this.status = "Suspended";
  return this.save();
};

module.exports = mongoose.model("MainHotel", hotelSchema);
