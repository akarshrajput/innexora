const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel-management', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ Connected to MongoDB');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections in the database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Count documents in guests collection
    const guestCount = await mongoose.connection.db.collection('guests').countDocuments();
    console.log(`\nTotal guests in database: ${guestCount}`);
    
    // Show sample guest documents
    if (guestCount > 0) {
      console.log('\nSample guest documents:');
      const sampleGuests = await mongoose.connection.db.collection('guests').find().limit(3).toArray();
      console.log(JSON.stringify(sampleGuests, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

checkDatabase();
