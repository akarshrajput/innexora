const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
      maxlength: [100, 'Guest name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    idType: {
      type: String,
      enum: ['passport', 'driving_license', 'national_id', 'other'],
      required: [true, 'ID type is required'],
    },
    idNumber: {
      type: String,
      required: [true, 'ID number is required'],
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required'],
      validate: {
        validator: function (value) {
          return value > this.checkInDate;
        },
        message: 'Check-out date must be after check-in date',
      },
    },
    actualCheckOutDate: {
      type: Date,
      default: null,
    },
    room: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room',
      required: [true, 'Room assignment is required'],
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    numberOfGuests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Number of guests must be at least 1'],
    },
    status: {
      type: String,
      enum: ['checked_in', 'checked_out', 'cancelled', 'no_show', 'archived'],
      default: 'checked_in',
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [1000, 'Special requests cannot exceed 1000 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
guestSchema.index({ status: 1 });
guestSchema.index({ room: 1 });
guestSchema.index({ roomNumber: 1 });
guestSchema.index({ checkInDate: 1, checkOutDate: 1 });
guestSchema.index({ email: 1 });
guestSchema.index({ phone: 1 });

// Virtual for stay duration
guestSchema.virtual('stayDuration').get(function () {
  const endDate = this.actualCheckOutDate || this.checkOutDate;
  return Math.ceil((endDate - this.checkInDate) / (1000 * 60 * 60 * 24));
});

// Virtual for current bill
guestSchema.virtual('currentBill', {
  ref: 'Bill',
  localField: '_id',
  foreignField: 'guest',
  justOne: true,
});

// Post-save hook to handle check-in/check-out logic
guestSchema.post('save', async function(doc) {
  try {
    const Bill = mongoose.model('Bill');
    const Room = mongoose.model('Room');
    
    // If this is a new guest or status changed to checked_in
    if (this.isNew || this.isModified('status')) {
      if (this.status === 'checked_in') {
        // Update room status to occupied
        await Room.findByIdAndUpdate(this.room, { 
          status: 'occupied',
          currentGuest: this._id 
        });
        
        // Create bill for the guest
        const room = await Room.findById(this.room);
        if (room) {
          const roomPrice = room.price || 0;
          await Bill.createBillForGuest(
            this._id,
            this.name,
            this.room,
            this.roomNumber,
            this.checkInDate,
            this.checkOutDate,
            roomPrice
          );
          console.log(`✅ Guest ${this.name} checked in - Room ${this.roomNumber} marked occupied`);
        }
      } else if (this.status === 'checked_out') {
        // Mark bill as guest checked out
        await Bill.markGuestCheckedOut(this._id);
        
        // Update room status to cleaning first, then schedule it to become available
        await Room.findByIdAndUpdate(this.room, { 
          status: 'cleaning',
          currentGuest: null,
          lastCleanedAt: new Date()
        });
        
        // Schedule room to become available after 2 hours (cleaning time)
        setTimeout(async () => {
          try {
            await Room.findByIdAndUpdate(this.room, { 
              status: 'available',
              currentGuest: null
            });
            console.log(`✅ Room ${this.roomNumber} is now available after cleaning`);
          } catch (error) {
            console.error(`❌ Error updating room ${this.roomNumber} to available:`, error);
          }
        }, 2 * 60 * 60 * 1000); // 2 hours
        
        console.log(`✅ Guest ${this.name} checked out - Room ${this.roomNumber} marked for cleaning`);
      }
    }
  } catch (error) {
    console.error('Error in guest post-save hook:', error);
  }
});

// Pre-save hook to validate check-out date and protect room status
guestSchema.pre('save', function(next) {
  if (this.isModified('checkOutDate') && this.checkOutDate <= this.checkInDate) {
    return next(new Error('Check-out date must be after check-in date'));
  }
  next();
});

// Pre-save hook to protect room status when guest is checked in
guestSchema.pre('save', async function(next) {
  try {
    // If guest status is being changed from checked_in to something else
    if (this.isModified('status') && this.status !== 'checked_in' && this._original?.status === 'checked_in') {
      // Check if there are any unpaid bills
      const Bill = mongoose.model('Bill');
      const bill = await Bill.findOne({
        guest: this._id,
        status: { $in: ['active', 'partially_paid'] },
        isGuestCheckedOut: false
      });
      
      if (bill && bill.balanceAmount > 0) {
        return next(new Error(`Cannot check out guest with unpaid balance of ₹${bill.balanceAmount}. Please collect payment first.`));
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get active guests
guestSchema.statics.getActiveGuests = async function() {
  try {
    // Only get guests who are currently checked in
    const activeGuests = await this.find({
      status: 'checked_in'
    }).populate('room', 'number type floor status price')
      .sort({ checkInDate: -1 });
    
    console.log(`✅ Found ${activeGuests.length} active guests`);
    return activeGuests;
  } catch (error) {
    console.error('Error getting active guests:', error);
    throw error;
  }
};

// Static method to get guest history
guestSchema.statics.getGuestHistory = async function() {
  try {
    // Get all guests who have checked out, been cancelled, or are no-shows
    const guestHistory = await this.find({
      status: { $in: ['checked_out', 'cancelled', 'no_show'] }
    }).populate('room', 'number type floor')
      .sort({ actualCheckOutDate: -1, checkOutDate: -1 });
    
    console.log(`✅ Found ${guestHistory.length} guests in history`);
    return guestHistory;
  } catch (error) {
    console.error('Error getting guest history:', error);
    throw error;
  }
};

// Static method to check if guest can check out
guestSchema.statics.canCheckOut = async function(guestId) {
  try {
    const Bill = mongoose.model('Bill');
    const bill = await Bill.findOne({
      guest: guestId,
      status: { $in: ['active', 'partially_paid'] },
      isGuestCheckedOut: false
    });
    
    return {
      canCheckOut: !bill || bill.balanceAmount <= 0,
      balanceAmount: bill ? bill.balanceAmount : 0,
      billNumber: bill ? bill.billNumber : null
    };
  } catch (error) {
    console.error('Error checking if guest can check out:', error);
    throw error;
  }
};

module.exports = mongoose.model('Guest', guestSchema);
