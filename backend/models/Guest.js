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

module.exports = mongoose.model('Guest', guestSchema);
