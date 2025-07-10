import mongoose, { Document, Schema } from 'mongoose';

export interface IScheduleConflict {
  type: 'court_overlap' | 'player_double_booking' | 'time_conflict';
  message: string;
  details: any;
  severity: 'low' | 'medium' | 'high';
}

export interface ISchedule extends Document {
  tournament: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  courts: any[];
  timeSlotDuration: number; // in minutes
  startTime: string; // e.g., "09:00"
  endTime: string; // e.g., "18:00"
  breakBetweenMatches: number; // in minutes
  totalMatches: number;
  scheduledMatches: number;
  conflicts: IScheduleConflict[];
  estimatedDuration: number; // in hours
  status: 'draft' | 'published' | 'in-progress' | 'completed' | 'cancelled';
  generatedAt: Date;
  publishedAt?: Date;
  completedAt?: Date;
  generatedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleConflictSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['court_overlap', 'player_double_booking', 'time_conflict'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: Schema.Types.Mixed
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, { _id: false });

const ScheduleSchema: Schema = new Schema({
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament reference is required'],
    unique: true // One schedule per tournament
  },
  name: {
    type: String,
    required: [true, 'Schedule name is required'],
    trim: true,
    maxlength: [100, 'Schedule name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(this: ISchedule, value: Date) {
        return value >= this.startDate;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  courts: [{
    type: Schema.Types.Mixed,
    required: false
  }],
  timeSlotDuration: {
    type: Number,
    required: [true, 'Time slot duration is required'],
    min: [15, 'Time slot duration must be at least 15 minutes'],
    max: [300, 'Time slot duration cannot exceed 5 hours']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  breakBetweenMatches: {
    type: Number,
    required: [true, 'Break between matches is required'],
    min: [0, 'Break between matches cannot be negative'],
    max: [60, 'Break between matches cannot exceed 60 minutes']
  },
  totalMatches: {
    type: Number,
    required: [true, 'Total matches is required'],
    min: [1, 'Total matches must be at least 1']
  },
  scheduledMatches: {
    type: Number,
    default: 0,
    min: [0, 'Scheduled matches cannot be negative']
  },
  conflicts: [ScheduleConflictSchema],
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [0.5, 'Estimated duration must be at least 0.5 hours']
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'in-progress', 'completed', 'cancelled'],
      message: 'Invalid schedule status'
    },
    default: 'draft'
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for performance
ScheduleSchema.index({ tournament: 1 });
ScheduleSchema.index({ status: 1 });
ScheduleSchema.index({ generatedAt: -1 });
ScheduleSchema.index({ courts: 1 });
ScheduleSchema.index({ startDate: 1, endDate: 1 });

// Virtual for completion percentage
ScheduleSchema.virtual('completionPercentage').get(function(this: ISchedule) {
  if (this.totalMatches === 0) return 0;
  return Math.round((this.scheduledMatches / this.totalMatches) * 100);
});

// Virtual for duration in days
ScheduleSchema.virtual('durationDays').get(function(this: ISchedule) {
  const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for time range
ScheduleSchema.virtual('timeRange').get(function(this: ISchedule) {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual for conflict summary
ScheduleSchema.virtual('conflictSummary').get(function(this: ISchedule) {
  const high = this.conflicts.filter(c => c.severity === 'high').length;
  const medium = this.conflicts.filter(c => c.severity === 'medium').length;
  const low = this.conflicts.filter(c => c.severity === 'low').length;
  
  return {
    total: this.conflicts.length,
    high,
    medium,
    low,
    hasConflicts: this.conflicts.length > 0
  };
});

// Pre-save middleware to validate time range
ScheduleSchema.pre<ISchedule>('save', function(next) {
  // Convert time strings to minutes for comparison
  const startMinutes = this.startTime.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
  const endMinutes = this.endTime.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
  
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});

// Pre-save middleware to update status timestamps
ScheduleSchema.pre<ISchedule>('save', function(next) {
  if (this.isModified('status')) {
    switch (this.status) {
      case 'published':
        if (!this.publishedAt) this.publishedAt = new Date();
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = new Date();
        break;
    }
  }
  next();
});

// Static method to get schedules by status
ScheduleSchema.statics.getByStatus = async function(status: string) {
  return this.find({ status })
    .populate('tournament', 'name startDate endDate')
    .sort({ generatedAt: -1 });
};

// Static method to get schedules for a tournament
ScheduleSchema.statics.getByTournament = async function(tournamentId: mongoose.Types.ObjectId) {
  return this.findOne({ tournament: tournamentId })
    .populate('tournament');
};

// Static method to get recent schedules
ScheduleSchema.statics.getRecent = async function(limit: number = 10) {
  return this.find()
    .populate('tournament', 'name startDate endDate status')
    .sort({ generatedAt: -1 })
    .limit(limit);
};

// Ensure virtual fields are serialized
ScheduleSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<ISchedule>('Schedule', ScheduleSchema);