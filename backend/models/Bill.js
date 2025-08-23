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
      enum: ['active', 'paid', 'partially_paid', 'cancelled'],
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

// Calculate totals before saving
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

  // Update status based on payment
  if (this.balanceAmount <= 0 && this.totalAmount > 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && this.balanceAmount > 0) {
    this.status = 'partially_paid';
  } else {
    this.status = 'active';
  }

  next();
});

// Static method to add room charges
billSchema.statics.addRoomCharge = async function(guestId, roomPrice, nights = 1) {
  const bill = await this.findOne({ guest: guestId, status: { $ne: 'cancelled' } });
  if (bill) {
    bill.items.push({
      type: 'room_charge',
      description: `Room charge for ${nights} night(s)`,
      amount: roomPrice,
      quantity: nights,
      unitPrice: roomPrice,
      addedBy: 'system'
    });
    await bill.save();
    return bill;
  }
  return null;
};

// Static method to add order to bill
billSchema.statics.addOrderToBill = async function(guestId, order) {
  try {
    const bill = await this.findOne({
      guest: guestId,
      status: 'active'
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
    return bill;
  } catch (error) {
    console.error('Error adding order to bill:', error);
    throw error;
  }
};

module.exports = mongoose.model('Bill', billSchema);
