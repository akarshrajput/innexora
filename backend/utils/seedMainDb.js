const mongoose = require("mongoose");
const MainHotel = require("../models/MainHotel");
require("dotenv").config();

// Sample hotel data
const sampleHotels = [
  {
    name: "Marriott Downtown",
    subdomain: "marriott",
    website: "https://www.marriott.com",
    database_url:
      process.env.SAMPLE_HOTEL_DB_URL ||
      "mongodb+srv://sample:password@cluster.mongodb.net/marriott_hotel",
    description: "Luxury hotel in the heart of downtown",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Marriott_Logo.svg/800px-Marriott_Logo.svg.png",
    cover_image_url:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    phone: "+1234567890",
    email: "info@marriottdowntown.com",
    address_line1: "123 Downtown Street",
    city: "New York",
    state: "NY",
    country: "USA",
    postal_code: "10001",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    currency: "USD",
    check_in_time: "15:00",
    check_out_time: "11:00",
    stars_rating: 5,
    amenities: ["WiFi", "Pool", "Gym", "Restaurant", "Spa", "Room Service"],
    policy: new Map([
      ["cancellation", "Free cancellation up to 24 hours before check-in"],
      ["pets", "Pets allowed with additional fee"],
      ["smoking", "Non-smoking hotel"],
    ]),
    status: "Active",
  },
  {
    name: "Budget Inn Express",
    subdomain: "budgetinn",
    website: "https://www.budgetinn.com",
    database_url:
      process.env.SAMPLE_HOTEL_DB_URL_2 ||
      "mongodb+srv://sample:password@cluster.mongodb.net/budget_inn",
    description: "Affordable accommodation for business travelers",
    logo_url: "https://via.placeholder.com/200x200?text=Budget+Inn",
    cover_image_url:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
    phone: "+1987654321",
    email: "reservations@budgetinn.com",
    address_line1: "456 Business District",
    city: "Chicago",
    state: "IL",
    country: "USA",
    postal_code: "60601",
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: "America/Chicago",
    currency: "USD",
    check_in_time: "14:00",
    check_out_time: "12:00",
    stars_rating: 3,
    amenities: ["WiFi", "Parking", "Business Center"],
    policy: new Map([
      ["cancellation", "Cancellation allowed up to 48 hours"],
      ["pets", "No pets allowed"],
      ["smoking", "Designated smoking areas available"],
    ]),
    status: "Active",
  },
];

async function seedMainDatabase() {
  try {
    console.log("🌱 Starting main database seeding...");

    // Connect to main database
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ Connected to main database");

    // Clear existing hotels
    await MainHotel.deleteMany({});
    console.log("🗑️  Cleared existing hotels");

    // Insert sample hotels
    for (const hotelData of sampleHotels) {
      const hotel = new MainHotel(hotelData);
      await hotel.save();
      console.log(`✅ Created hotel: ${hotel.name} (${hotel.subdomain})`);
    }

    console.log("🎉 Main database seeding completed successfully!");
    console.log("\nYou can now access:");

    sampleHotels.forEach((hotel) => {
      console.log(`- ${hotel.name}: https://${hotel.subdomain}.innexora.app`);
      console.log(`  Local: http://${hotel.subdomain}.localhost:3000`);
    });
  } catch (error) {
    console.error("❌ Error seeding main database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from database");
    process.exit(0);
  }
}

// Check if script is run directly
if (require.main === module) {
  seedMainDatabase();
}

module.exports = { seedMainDatabase, sampleHotels };
