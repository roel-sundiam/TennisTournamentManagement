import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeSlot extends Document {
  startTime: Date;
  endTime: Date;
  court?: mongoose.Types.ObjectId;
  tournament: mongoose.Types.ObjectId;
  match?: mongoose.Types.ObjectId;
  status: 'available' | 'booked' | 'blocked';
  duration: number; // in minutes
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema: Schema = new Schema({
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(value: Date) {
        return value > new Date();
      },
      message: 'Start time must be in the future'
    }
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required'],
    validate: {
      validator: function(this: ITimeSlot, value: Date) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  court: {
    type: Schema.Types.ObjectId,
    ref: 'Court',
    required: false
  },
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament reference is required']
  },
  match: {
    type: Schema.Types.ObjectId,
    ref: 'Match'
  },
  status: {
    type: String,
    enum: {
      values: ['available', 'booked', 'blocked'],
      message: 'Invalid time slot status'
    },
    default: 'available'
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [300, 'Duration cannot exceed 5 hours (300 minutes)']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for performance
TimeSlotSchema.index({ court: 1, startTime: 1 });
TimeSlotSchema.index({ tournament: 1, startTime: 1 });
TimeSlotSchema.index({ status: 1 });
TimeSlotSchema.index({ match: 1 });

// Compound index to prevent overlapping time slots on same court
TimeSlotSchema.index({ court: 1, startTime: 1, endTime: 1 }, { unique: true });

// Virtual for availability status
TimeSlotSchema.virtual('isAvailable').get(function() {
  return this.status === 'available' && !this.match;
});

// Virtual for formatted time range
TimeSlotSchema.virtual('timeRange').get(function(this: ITimeSlot) {
  const start = this.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const end = this.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${start} - ${end}`;
});

// Virtual for formatted date
TimeSlotSchema.virtual('dateString').get(function(this: ITimeSlot) {
  return this.startTime.toLocaleDateString();
});

// Pre-save middleware to calculate duration
TimeSlotSchema.pre<ITimeSlot>('save', function(next) {
  if (this.startTime && this.endTime) {
    const durationMs = this.endTime.getTime() - this.startTime.getTime();
    this.duration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
  }
  next();
});

// Pre-save middleware to prevent overlapping time slots
TimeSlotSchema.pre<ITimeSlot>('save', async function(next) {
  if (this.isNew || this.isModified('startTime') || this.isModified('endTime') || this.isModified('court')) {
    const TimeSlotModel = this.constructor as any;
    const overlappingSlot = await TimeSlotModel.findOne({
      court: this.court,
      _id: { $ne: this._id },
      $or: [
        // New slot starts during existing slot
        { startTime: { $lte: this.startTime }, endTime: { $gt: this.startTime } },
        // New slot ends during existing slot
        { startTime: { $lt: this.endTime }, endTime: { $gte: this.endTime } },
        // New slot completely contains existing slot
        { startTime: { $gte: this.startTime }, endTime: { $lte: this.endTime } }
      ]
    });
    
    if (overlappingSlot) {
      return next(new Error('Time slot overlaps with existing slot on the same court'));
    }
  }
  next();
});

// Static method to get available time slots for a court
TimeSlotSchema.statics.getAvailableSlots = async function(this: any, courtId: mongoose.Types.ObjectId, date?: Date) {
  const query: any = { 
    court: courtId, 
    status: 'available',
    startTime: { $gte: new Date() } // Future slots only
  };
  
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    query.startTime = { $gte: startOfDay };
    query.endTime = { $lte: endOfDay };
  }
  
  return this.find(query).sort({ startTime: 1 });
};

// Static method to get time slots for a tournament
TimeSlotSchema.statics.getTournamentSlots = async function(this: any, tournamentId: mongoose.Types.ObjectId) {
  return this.find({ tournament: tournamentId })
    .populate('court')
    .populate('match')
    .sort({ startTime: 1 });
};

// Static method to find conflicts
TimeSlotSchema.statics.findConflicts = async function(this: any, courtId: mongoose.Types.ObjectId, startTime: Date, endTime: Date, excludeId?: mongoose.Types.ObjectId) {
  const query: any = {
    court: courtId,
    $or: [
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

// Ensure virtual fields are serialized
TimeSlotSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<ITimeSlot>('TimeSlot', TimeSlotSchema);