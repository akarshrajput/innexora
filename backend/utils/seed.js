const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const MainHotel = require("../models/MainHotel");

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  try {
    await MainHotel.deleteMany({});
    console.log("🗑️  Cleared all data");
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  }
};

// Create a test hotel manager
const createTestManager = async () => {
  try {
    const email = "manager@example.com";
    const managerId = new mongoose.Types.ObjectId();

    console.log(`👤 Using test manager: ${email}`);

    return { id: managerId, email };
  } catch (error) {
    console.error("Error creating test manager:", error);
    process.exit(1);
  }
};

// Create sample hotels
const createSampleHotels = async (managerId) => {
  const hotels = [
    {
      name: "Grand Paradise Hotel",
      subdomain: "grandparadise",
      description: "A luxurious 5-star hotel with stunning ocean views",
      website: "https://grandparadise.com",
      database_url:
        process.env.MONGODB_URI || "mongodb://localhost:27017/grandparadise",
      location: {
        address: "123 Ocean Drive",
        city: "Miami",
        state: "Florida",
        country: "USA",
        postalCode: "33139",
        coordinates: {
          type: "Point",
          coordinates: [-80.13, 25.7617],
        },
      },
      contact: {
        phone: "+1 (555) 123-4567",
        email: "info@grandparadise.com",
        website: "https://grandparadise.com",
      },
      manager: managerId,
      amenities: ["pool", "spa", "restaurant", "gym", "wifi"],
      checkInTime: "15:00",
      checkOutTime: "12:00",
      status: "Active",
    },
    {
      name: "Mountain View Lodge",
      subdomain: "mountainview",
      description: "A cozy lodge with breathtaking mountain views",
      website: "https://mountainviewlodge.com",
      database_url:
        process.env.MONGODB_URI || "mongodb://localhost:27017/mountainview",
      location: {
        address: "456 Alpine Road",
        city: "Aspen",
        state: "Colorado",
        country: "USA",
        postalCode: "81611",
        coordinates: {
          type: "Point",
          coordinates: [-106.8172, 39.1911],
        },
      },
      contact: {
        phone: "+1 (555) 987-6543",
        email: "info@mountainviewlodge.com",
        website: "https://mountainviewlodge.com",
      },
      manager: managerId,
      amenities: ["restaurant", "bar", "wifi", "parking", "hot_tub"],
      checkInTime: "16:00",
      checkOutTime: "11:00",
      status: "Active",
    },
    {
      name: "Marriott Hotel",
      subdomain: "marriott",
      description: "A premium business hotel with modern amenities",
      website: "https://marriott.com",
      database_url:
        process.env.MONGODB_URI || "mongodb://localhost:27017/marriott",
      location: {
        address: "789 Business District",
        city: "New York",
        state: "New York",
        country: "USA",
        postalCode: "10001",
        coordinates: {
          type: "Point",
          coordinates: [-74.006, 40.7128],
        },
      },
      contact: {
        phone: "+1 (555) 555-0123",
        email: "info@marriott.com",
        website: "https://marriott.com",
      },
      manager: managerId,
      amenities: ["pool", "restaurant", "gym", "wifi", "business_center"],
      checkInTime: "15:00",
      checkOutTime: "12:00",
      status: "Active",
    },
  ];

  try {
    const createdHotels = await MainHotel.insertMany(hotels);
    console.log(`🏨 Created ${createdHotels.length} hotels`);
    console.log("Sample subdomains: grandparadise, mountainview, marriott");
    return createdHotels;
  } catch (error) {
    console.error("Error creating sample hotels:", error);
    throw error;
  }
};

// Main function to run the seed script
const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    await connectDB();
    await clearDatabase();

    const manager = await createTestManager();
    const hotels = await createSampleHotels(manager.id);

    console.log("✅ Database seeded successfully!");
    console.log("\n🔑 Test Manager Credentials:");
    console.log(`   Email: ${manager.email}`);
    console.log("   Password: password123");
    console.log("\n🚀 Available subdomains for testing:");
    console.log("   - grandparadise.localhost:3000");
    console.log("   - mountainview.localhost:3000");
    console.log("   - marriott.localhost:3000");
    console.log("\n🚀 Start the server with: npm run dev");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seed script
seedDatabase();
