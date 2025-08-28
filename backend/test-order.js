const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

// Test order creation
async function testOrderCreation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test data
    const testOrderData = {
      guest: '507f1f77bcf86cd799439011', // Replace with actual guest ID
      guestName: 'Test Guest',
      room: '507f1f77bcf86cd799439012', // Replace with actual room ID
      roomNumber: '101',
      items: [{
        food: '507f1f77bcf86cd799439013', // Replace with actual food ID
        foodName: 'Test Food',
        quantity: 2,
        unitPrice: 25.00,
        totalPrice: 50.00,
        specialInstructions: 'Test instructions'
      }],
      totalAmount: 50.00,
      type: 'room_service',
      specialInstructions: 'Test order'
    };

    console.log('Creating test order...');
    const order = await Order.create(testOrderData);
    
    console.log('✅ Order created successfully!');
    console.log('Order Number:', order.orderNumber);
    console.log('Order ID:', order._id);
    console.log('Total Amount:', order.totalAmount);
    
    // Clean up - delete test order
    await Order.findByIdAndDelete(order._id);
    console.log('✅ Test order cleaned up');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run test
testOrderCreation();
