const mongoose = require('mongoose');
const dotenv = require('dotenv');
const databaseManager = require('./databaseManager');

// Load environment variables
dotenv.config();

const seedTenantData = async () => {
  try {
    console.log('🌱 Starting tenant database seeding...');
    
    // Initialize main database connection
    await databaseManager.initMainConnection();
    console.log('✅ Database manager initialized');
    
    // Get tenant connection for marriott
    const tenantConnection = await databaseManager.getTenantConnection('marriott', process.env.MONGODB_URI);
    const tenantModels = databaseManager.getTenantModels(tenantConnection);
    
    console.log('✅ Connected to marriott tenant database');
    
    // Clear existing data
    await tenantModels.Room.deleteMany({});
    await tenantModels.Guest.deleteMany({});
    await tenantModels.Booking.deleteMany({});
    await tenantModels.Ticket.deleteMany({});
    console.log('🗑️  Cleared existing tenant data');
    
    // Create sample rooms
    const rooms = [
      {
        number: '101',
        type: 'single',
        floor: 1,
        capacity: 1,
        price: 150,
        status: 'available',
        amenities: ['wifi', 'tv', 'ac', 'minibar'],
        isActive: true
      },
      {
        number: '102',
        type: 'double',
        floor: 1,
        capacity: 2,
        price: 200,
        status: 'available',
        amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony'],
        isActive: true
      },
      {
        number: '201',
        type: 'suite',
        floor: 2,
        capacity: 4,
        price: 350,
        status: 'occupied',
        amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony', 'kitchenette'],
        isActive: true
      },
      {
        number: '202',
        type: 'deluxe',
        floor: 2,
        capacity: 3,
        price: 280,
        status: 'cleaning',
        amenities: ['wifi', 'tv', 'ac', 'minibar', 'ocean_view'],
        isActive: true
      }
    ];
    
    const createdRooms = await tenantModels.Room.insertMany(rooms);
    console.log(`🏨 Created ${createdRooms.length} rooms`);
    
    // Create sample guests with proper room references
    const room201 = createdRooms.find(r => r.number === '201');
    const room102 = createdRooms.find(r => r.number === '102');
    
    const guests = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        idType: 'passport',
        idNumber: 'P123456789',
        room: room201._id,
        roomNumber: '201',
        checkInDate: new Date('2025-09-08'),
        checkOutDate: new Date('2025-09-12'),
        status: 'checked_in',
        numberOfGuests: 2,
        specialRequests: 'Late checkout requested',
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+1-555-0124',
          relationship: 'spouse'
        }
      },
      {
        name: 'Alice Smith',
        email: 'alice.smith@example.com',
        phone: '+1-555-0125',
        idType: 'driving_license',
        idNumber: 'DL987654321',
        room: room102._id,
        roomNumber: '102',
        checkInDate: new Date('2025-09-09'),
        checkOutDate: new Date('2025-09-11'),
        status: 'checked_out',
        numberOfGuests: 1,
        specialRequests: 'Ground floor room preferred',
        emergencyContact: {
          name: 'Bob Smith',
          phone: '+1-555-0126',
          relationship: 'brother'
        }
      }
    ];
    
    const createdGuests = await tenantModels.Guest.insertMany(guests);
    console.log(`👥 Created ${createdGuests.length} guests`);
    
    // Create sample tickets with proper structure
    const tickets = [
      {
        room: room201._id,
        roomNumber: '201',
        guestInfo: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0123'
        },
        subject: 'Air conditioning not working',
        messages: [{
          content: 'The AC unit in room 201 is not cooling properly. Please send maintenance.',
          sender: 'guest',
          senderName: 'John Doe'
        }],
        priority: 'high',
        status: 'raised',
        category: 'maintenance'
      },
      {
        room: room102._id,
        roomNumber: '102',
        guestInfo: {
          name: 'Alice Smith',
          email: 'alice.smith@example.com',
          phone: '+1-555-0125'
        },
        subject: 'Extra towels needed',
        messages: [{
          content: 'Could we get some extra towels delivered to the room?',
          sender: 'guest',
          senderName: 'Alice Smith'
        }],
        priority: 'low',
        status: 'completed',
        category: 'housekeeping'
      }
    ];
    
    const createdTickets = await tenantModels.Ticket.insertMany(tickets);
    console.log(`🎫 Created ${createdTickets.length} tickets`);
    
    console.log('✅ Tenant database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Rooms: ${createdRooms.length}`);
    console.log(`   Guests: ${createdGuests.length}`);
    console.log(`   Tickets: ${createdTickets.length}`);
    console.log('\n🚀 The marriott tenant database is now ready!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding tenant database:', error);
    process.exit(1);
  }
};

// Run the seed script
seedTenantData();
