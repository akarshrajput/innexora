const Room = require('../models/Room');
const Guest = require('../models/Guest');
const Bill = require('../models/Bill');

class RoomCleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  start() {
    if (this.isRunning) {
      console.log('🧹 Room cleanup service is already running');
      return;
    }

    console.log('🧹 Starting room cleanup service...');
    this.isRunning = true;

    // Run cleanup every 30 minutes
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 30 * 60 * 1000); // 30 minutes

    // Run initial cleanup
    this.performCleanup();
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('🧹 Room cleanup service stopped');
  }

  async performCleanup() {
    try {
      console.log('🧹 Starting room cleanup process...');
      
      // Clean up rooms that have been in cleaning status for too long
      const cleanedRooms = await Room.cleanupCleaningRooms();
      
      // Verify guest-bill synchronization
      await this.verifyGuestBillSync();
      
      // Verify room-guest synchronization
      await this.verifyRoomGuestSync();
      
      console.log(`✅ Room cleanup completed - ${cleanedRooms} rooms cleaned up`);
    } catch (error) {
      console.error('❌ Error during room cleanup:', error);
    }
  }

  async verifyGuestBillSync() {
    try {
      // Check if all checked-in guests have bills
      const activeGuests = await Guest.find({ status: 'checked_in' });
      let billsCreated = 0;

      for (const guest of activeGuests) {
        const existingBill = await Bill.findOne({ guest: guest._id });
        if (!existingBill) {
          // Create bill for guest who doesn't have one
          const room = await Room.findById(guest.room);
          if (room) {
            const stayDuration = Math.ceil((new Date(guest.checkOutDate) - new Date(guest.checkInDate)) / (1000 * 60 * 60 * 24));
            const roomCharges = room.price * stayDuration;
            
            await Bill.create({
              billNumber: `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              guest: guest._id,
              room: guest.room,
              checkInDate: guest.checkInDate,
              checkOutDate: guest.checkOutDate,
              items: [{
                type: 'room_charge',
                description: `Room ${guest.roomNumber} - ${stayDuration} night(s)`,
                amount: roomCharges,
                quantity: stayDuration,
                unitPrice: room.price,
                date: new Date(),
                addedBy: 'System'
              }],
              subtotal: roomCharges,
              totalAmount: roomCharges,
              balanceAmount: roomCharges,
              status: 'active',
              isGuestCheckedOut: false
            });
            
            billsCreated++;
            console.log(`✅ Created missing bill for guest ${guest.name}`);
          }
        }
      }

      if (billsCreated > 0) {
        console.log(`✅ Created ${billsCreated} missing bills during cleanup`);
      }
    } catch (error) {
      console.error('❌ Error verifying guest-bill sync:', error);
    }
  }

  async verifyRoomGuestSync() {
    try {
      // Check if rooms marked as occupied actually have checked-in guests
      const occupiedRooms = await Room.find({ status: 'occupied' });
      let roomsFixed = 0;

      for (const room of occupiedRooms) {
        const activeGuest = await Guest.findOne({
          room: room._id,
          status: 'checked_in'
        });

        if (!activeGuest) {
          // Room is marked occupied but has no active guest
          await Room.findByIdAndUpdate(room._id, {
            status: 'available',
            currentGuest: null
          });
          roomsFixed++;
          console.log(`✅ Fixed room ${room.number} - marked as available (no active guest)`);
        }
      }

      if (roomsFixed > 0) {
        console.log(`✅ Fixed ${roomsFixed} room statuses during cleanup`);
      }
    } catch (error) {
      console.error('❌ Error verifying room-guest sync:', error);
    }
  }
}

module.exports = new RoomCleanupService();
