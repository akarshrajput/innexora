const mongoose = require("mongoose");
const crypto = require("crypto");

const roomSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: [true, "Room number is required"],
      trim: true,
    },
    roomAccessId: {
      type: String,
      unique: true,
      default: function () {
        return crypto.randomBytes(6).toString("hex"); // 12 character unique ID
      },
    },
    type: {
      type: String,
      required: [true, "Room type is required"],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, "Floor number is required"],
    },
    price: {
      type: Number,
      required: [true, "Room price is required"],
      min: [0, "Price cannot be negative"],
    },
    capacity: {
      type: Number,
      required: [true, "Room capacity is required"],
      min: [1, "Capacity must be at least 1"],
      default: 2,
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "cleaning"],
      default: "available",
    },
    currentGuest: {
      type: mongoose.Schema.ObjectId,
      ref: "Guest",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
roomSchema.index({ number: 1 }, { unique: true });
roomSchema.index({ status: 1 });

// Virtual for tickets in this room
roomSchema.virtual("tickets", {
  ref: "Ticket",
  localField: "_id",
  foreignField: "room",
});

// Cascade delete tickets when a room is deleted
roomSchema.pre("remove", async function (next) {
  await this.model("Ticket").deleteMany({ room: this._id });
  next();
});

// Pre-save hook to protect occupied rooms from status changes
roomSchema.pre("save", async function (next) {
  try {
    // If room status is being changed and room is occupied
    if (this.isModified("status") && this._original?.status === "occupied") {
      // Check if there's a current guest
      if (this.currentGuest) {
        return next(
          new Error(
            `Cannot change status of Room ${this.number} while guest is checked in. Please check out the guest first.`
          )
        );
      }
    }

    // If setting status to occupied, ensure no other guest is in this room
    if (this.isModified("status") && this.status === "occupied") {
      const Guest = mongoose.model("Guest");
      const existingGuest = await Guest.findOne({
        room: this._id,
        status: "checked_in",
      });

      if (
        existingGuest &&
        existingGuest._id.toString() !== this.currentGuest?.toString()
      ) {
        return next(
          new Error(`Room ${this.number} is already occupied by another guest.`)
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook to validate room capacity
roomSchema.pre("save", function (next) {
  if (this.isModified("capacity") && this.capacity < 1) {
    return next(new Error("Room capacity must be at least 1"));
  }

  if (this.isModified("price") && this.price < 0) {
    return next(new Error("Room price cannot be negative"));
  }

  next();
});

// Static method to get available rooms
roomSchema.statics.getAvailableRooms = async function () {
  try {
    return await this.find({
      status: "available",
      isActive: true,
    })
      .select("number type floor price capacity amenities")
      .sort({ floor: 1, number: 1 });
  } catch (error) {
    console.error("Error getting available rooms:", error);
    throw error;
  }
};

// Static method to get occupied rooms
roomSchema.statics.getOccupiedRooms = async function () {
  try {
    return await this.find({
      status: "occupied",
      isActive: true,
    })
      .populate("currentGuest", "name checkInDate checkOutDate")
      .sort({ floor: 1, number: 1 });
  } catch (error) {
    console.error("Error getting occupied rooms:", error);
    throw error;
  }
};

// Static method to get rooms by status
roomSchema.statics.getRoomsByStatus = async function (status) {
  try {
    return await this.find({
      status: status,
      isActive: true,
    })
      .populate("currentGuest", "name checkInDate checkOutDate")
      .sort({ floor: 1, number: 1 });
  } catch (error) {
    console.error(`Error getting rooms with status ${status}:`, error);
    throw error;
  }
};

// Static method to update room status safely
roomSchema.statics.updateRoomStatus = async function (
  roomId,
  newStatus,
  reason = ""
) {
  try {
    const room = await this.findById(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if room can be updated to new status
    if (room.status === "occupied" && newStatus !== "cleaning") {
      throw new Error(
        `Cannot change status of occupied room ${room.number} to ${newStatus}`
      );
    }

    room.status = newStatus;
    if (reason) {
      room.notes = reason;
    }

    await room.save();
    console.log(`✅ Room ${room.number} status updated to ${newStatus}`);
    return room;
  } catch (error) {
    console.error("Error updating room status:", error);
    throw error;
  }
};

// Static method to clean up rooms that have been in cleaning status for too long
roomSchema.statics.cleanupCleaningRooms = async function () {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const roomsToClean = await this.find({
      status: "cleaning",
      lastCleanedAt: { $lt: twoHoursAgo },
    });

    if (roomsToClean.length > 0) {
      await this.updateMany(
        {
          status: "cleaning",
          lastCleanedAt: { $lt: twoHoursAgo },
        },
        {
          status: "available",
          currentGuest: null,
        }
      );

      console.log(
        `✅ Cleaned up ${roomsToClean.length} rooms from cleaning status`
      );
    }

    return roomsToClean.length;
  } catch (error) {
    console.error("Error cleaning up cleaning rooms:", error);
    throw error;
  }
};

module.exports = mongoose.model("Room", roomSchema);
