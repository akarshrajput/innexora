const mongoose = require("mongoose");
const crypto = require("crypto");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Room schema (simplified)
const roomSchema = new mongoose.Schema(
  {
    number: String,
    roomAccessId: String,
    type: String,
    floor: Number,
    price: Number,
    capacity: Number,
    status: String,
    description: String,
    currentGuest: mongoose.Schema.ObjectId,
    isActive: Boolean,
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

// Migration function to add roomAccessId to existing rooms
const addRoomAccessIds = async () => {
  try {
    console.log(
      "🔄 Starting migration to add roomAccessId to existing rooms..."
    );

    // Find rooms without roomAccessId
    const roomsWithoutAccessId = await Room.find({
      $or: [
        { roomAccessId: { $exists: false } },
        { roomAccessId: null },
        { roomAccessId: "" },
      ],
    });

    console.log(
      `📊 Found ${roomsWithoutAccessId.length} rooms without roomAccessId`
    );

    if (roomsWithoutAccessId.length === 0) {
      console.log("✅ All rooms already have roomAccessId");
      return;
    }

    // Update each room with a unique roomAccessId
    for (const room of roomsWithoutAccessId) {
      const roomAccessId = crypto.randomBytes(6).toString("hex");
      await Room.updateOne(
        { _id: room._id },
        { $set: { roomAccessId: roomAccessId } }
      );
      console.log(
        `✅ Updated Room ${room.number} with roomAccessId: ${roomAccessId}`
      );
    }

    console.log(
      `🎉 Migration completed! Updated ${roomsWithoutAccessId.length} rooms`
    );
  } catch (error) {
    console.error("❌ Migration error:", error);
  }
};

// Run the migration
const runMigration = async () => {
  await connectDB();
  await addRoomAccessIds();

  // Close the connection
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
  process.exit(0);
};

// Execute if this file is run directly
if (require.main === module) {
  runMigration();
}

module.exports = { addRoomAccessIds };
