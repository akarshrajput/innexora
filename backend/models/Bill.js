const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['room_charge', 'food_order', 'service_charge', 'tax', 'discount', 'advance_payment', 'other'],
    required: [true, 'Bill item type is required'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
  },
  quantity: {
    type: Number,
    default: 1,
    min: [0, 'Quantity cannot be negative'],
  },
  unitPrice: {
    type: Number,
    min: [0, 'Unit price cannot be negative'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  orderId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Order',
  },
  addedBy: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [200, 'Notes cannot exceed 200 characters'],
  },
});

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative'],
  },
  method: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'],
    required: [true, 'Payment method is required'],
  },
  reference: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  receivedBy: {
    type: String,
    required: [true, 'Received by is required'],
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [200, 'Notes cannot exceed 200 characters'],
  },
});

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    guest: {
      type: mongoose.Schema.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest is required'],
    },
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
    },
    room: {
      type: mongoose.Schema.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOutDate: {
      type: Date,
    },
    items: [billItemSchema],
    payments: [paymentSchema],
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative'],
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paid', 'partially_paid', 'cancelled', 'finalized'],
      default: 'active',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    finalizedAt: {
      type: Date,
    },
    finalizedBy: {
      type: String,
      trim: true,
    },
    isGuestCheckedOut: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
billSchema.index({ guest: 1 });
billSchema.index({ room: 1 });
billSchema.index({ roomNumber: 1 });
billSchema.index({ billNumber: 1 });
billSchema.index({ checkInDate: 1, checkOutDate: 1 });
billSchema.index({ status: 1 });

// Generate bill number before saving
billSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  
  const count = await this.constructor.countDocuments({});
  this.billNumber = `BILL-${Date.now().toString().slice(-6)}-${(count + 1).toString().padStart(3, '0')}`;
  
  next();
});

// Enhanced bill status management
billSchema.pre('save', function (next) {
  // Calculate subtotal from items (excluding advance payments)
  this.subtotal = this.items
    .filter(item => !['tax', 'discount'].includes(item.type))
    .reduce((sum, item) => sum + item.amount, 0);

  // Calculate tax and discount amounts from items
  this.taxAmount = this.items
    .filter(item => item.type === 'tax')
    .reduce((sum, item) => sum + item.amount, 0);

  this.discountAmount = this.items
    .filter(item => item.type === 'discount')
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  // Calculate total paid amount
  this.paidAmount = this.payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate total amount (subtotal + tax - discount)
  this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;

  // Calculate balance
  this.balanceAmount = this.totalAmount - this.paidAmount;

  // Enhanced status management
  if (this.balanceAmount <= 0 && this.totalAmount > 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.balanceAmount > 0) {
    this.status = 'partially_paid';
  } else if (this.balanceAmount > 0) {
    this.status = 'active';
  }

  // Mark as finalized if fully paid and guest checked out
  if (this.balanceAmount <= 0 && this.isGuestCheckedOut) {
    this.status = 'finalized';
    this.finalizedAt = new Date();
  }

  next();
});

// Static method to create bill for new guest check-in
billSchema.statics.createBillForGuest = async function(guestId, guestName, roomId, roomNumber, checkInDate, checkOutDate, roomPrice) {
  try {
    // Calculate number of nights
    const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
    const totalAmount = roomPrice * nights;
    
    // Create new bill
    const bill = await this.create({
      guest: guestId,
      guestName: guestName,
      room: roomId,
      roomNumber: roomNumber,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      items: [{
        type: 'room_charge',
        description: `Room charge for ${nights} night(s)`,
        amount: totalAmount,
        quantity: nights,
        unitPrice: roomPrice,
        addedBy: 'System',
        date: new Date(),
        notes: `Automatic room charge for check-in`
      }],
      subtotal: totalAmount,
      totalAmount: totalAmount,
      balanceAmount: totalAmount,
      paidAmount: 0,
      status: 'active',
      isGuestCheckedOut: false
    });

    console.log(`✅ Created bill ${bill.billNumber} for guest ${guestName} - Room ${roomNumber} - Amount: ₹${totalAmount}`);
    return bill;
  } catch (error) {
    console.error('Error creating bill for guest:', error);
    throw error;
  }
};

// Static method to mark bill as guest checked out
billSchema.statics.markGuestCheckedOut = async function(guestId) {
  try {
    const bill = await this.findOne({
      guest: guestId,
      status: { $in: ['active', 'partially_paid'] }
    });

    if (bill) {
      bill.isGuestCheckedOut = true;
      
      // If fully paid, mark as finalized
      if (bill.balanceAmount <= 0) {
        bill.status = 'finalized';
        bill.finalizedAt = new Date();
        bill.finalizedBy = 'System';
      }
      
      await bill.save();
      console.log(`✅ Marked bill ${bill.billNumber} as guest checked out`);
      return bill;
    }
    
    return null;
  } catch (error) {
    console.error('Error marking bill as checked out:', error);
    throw error;
  }
};

// Static method to get active bills (for current guests)
billSchema.statics.getActiveBills = async function() {
  try {
    // Get bills for all checked-in guests (regardless of payment status)
    const bills = await this.find({
      status: { $in: ['active', 'partially_paid', 'paid'] },
      isGuestCheckedOut: false
    }).populate('guest', 'name phone email status')
      .populate('room', 'number type floor status');
    
    // Filter to only show bills for guests who are still checked in
    const activeBills = bills.filter(bill => 
      bill.guest && bill.guest.status === 'checked_in'
    );
    
    return activeBills;
  } catch (error) {
    console.error('Error getting active bills:', error);
    throw error;
  }
};

// Static method to get finalized bills (for guest history)
billSchema.statics.getFinalizedBills = async function() {
  try {
    // Get bills for guests who have checked out
    const bills = await this.find({
      $or: [
        { status: 'finalized' },
        { isGuestCheckedOut: true }
      ]
    }).populate('guest', 'name phone email status')
      .populate('room', 'number type floor');
    
    // Filter to only show bills for guests who have checked out
    const finalizedBills = bills.filter(bill => 
      bill.guest && bill.guest.status === 'checked_out'
    );
    
    return finalizedBills;
  } catch (error) {
    console.error('Error getting finalized bills:', error);
    throw error;
  }
};

// Static method to add order to bill
billSchema.statics.addOrderToBill = async function(guestId, order) {
  try {
    const bill = await this.findOne({
      guest: guestId,
      status: { $in: ['active', 'partially_paid'] },
      isGuestCheckedOut: false
    });

    if (!bill) {
      throw new Error('No active bill found for guest');
    }

    // Add detailed order items to bill
    for (const item of order.items) {
      const billItem = {
        type: 'food_order',
        description: `${item.foodName} x${item.quantity}`,
        amount: item.totalPrice,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        orderId: order._id,
        addedBy: 'System',
        date: new Date(),
        notes: item.specialInstructions || ''
      };
      bill.items.push(billItem);
    }

    await bill.save();
    console.log(`✅ Added order ${order.orderNumber} to bill ${bill.billNumber}`);
    return bill;
  } catch (error) {
    console.error('Error adding order to bill:', error);
    throw error;
  }
};

// Static method to record payment
billSchema.statics.recordPayment = async function(guestId, paymentData) {
  try {
    const bill = await this.findOne({
      guest: guestId,
      status: { $in: ['active', 'partially_paid'] },
      isGuestCheckedOut: false
    });

    if (!bill) {
      throw new Error('No active bill found for guest');
    }

    // Add payment record
    bill.payments.push({
      amount: paymentData.amount,
      method: paymentData.method,
      reference: paymentData.reference || '',
      receivedBy: paymentData.receivedBy,
      notes: paymentData.notes || '',
      date: new Date()
    });

    await bill.save();
    console.log(`✅ Recorded payment of ₹${paymentData.amount} for bill ${bill.billNumber}`);
    return bill;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
};

// Static method to get bill summary
billSchema.statics.getBillSummary = async function(guestId) {
  try {
    const bill = await this.findOne({
      guest: guestId,
      status: { $in: ['active', 'partially_paid', 'finalized'] }
    });

    if (!bill) {
      return null;
    }

    return {
      billNumber: bill.billNumber,
      totalAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      balanceAmount: bill.balanceAmount,
      status: bill.status,
      isGuestCheckedOut: bill.isGuestCheckedOut,
      items: bill.items,
      payments: bill.payments
    };
  } catch (error) {
    console.error('Error getting bill summary:', error);
    throw error;
  }
};

// Static method to get billing statistics
billSchema.statics.getBillingStats = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceAmount' }
        }
      }
    ]);

    const formattedStats = stats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        totalAmount: curr.totalAmount,
        totalPaid: curr.totalPaid,
        totalBalance: curr.totalBalance
      };
      return acc;
    }, {});

    // Get total revenue and outstanding amounts
    const totalRevenue = stats.reduce((sum, stat) => sum + stat.totalPaid, 0);
    const totalOutstanding = stats.reduce((sum, stat) => {
      if (stat._id !== 'finalized') {
        return sum + stat.totalBalance;
      }
      return sum;
    }, 0);

    // Get active guests count
    const activeGuestsCount = await this.countDocuments({
      status: { $in: ['active', 'partially_paid'] },
      isGuestCheckedOut: false
    });

    return {
      ...formattedStats,
      totalRevenue,
      totalOutstanding,
      activeGuestsCount
    };
  } catch (error) {
    console.error('Error getting billing stats:', error);
    throw error;
  }
};

module.exports = mongoose.model('Bill', billSchema);
