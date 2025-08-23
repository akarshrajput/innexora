const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required'],
    },
    price: {
      type: Number,
      required: [true, 'Room price is required'],
      min: [0, 'Price cannot be negative'],
    },
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      default: 2,
    },
    amenities: [{
      type: String,
      trim: true,
    }],
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'cleaning'],
      default: 'available',
    },
    currentGuest: {
      type: mongoose.Schema.ObjectId,
      ref: 'Guest',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
roomSchema.index({ number: 1 }, { unique: true });
roomSchema.index({ status: 1 });

// Virtual for tickets in this room
roomSchema.virtual('tickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'room',
});

// Cascade delete tickets when a room is deleted
roomSchema.pre('remove', async function (next) {
  await this.model('Ticket').deleteMany({ room: this._id });
  next();
});

module.exports = mongoose.model('Room', roomSchema);
