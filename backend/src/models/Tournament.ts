import mongoose, { Document, Schema } from 'mongoose';

export interface ITournament extends Document {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxPlayers: number;
  currentPlayers: number;
  format: 'single-elimination' | 'double-elimination' | 'round-robin';
  gameType: 'singles' | 'doubles';
  gameFormat: 'regular' | 'tiebreak-8' | 'tiebreak-10';
  pairingMethod?: 'random' | 'seeded' | 'manual';
  status: 'pending' | 'registration-open' | 'registration-closed' | 'in-progress' | 'completed' | 'archived';
  venue?: string;
  entryFee?: number;
  prizePool?: number;
  requiredCourts: number;
  rules?: string;
  organizer: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true,
    maxlength: [100, 'Tournament name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(value: Date) {
        return value > new Date();
      },
      message: 'Start date must be in the future'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  registrationDeadline: {
    type: Date,
    required: [true, 'Registration deadline is required']
  },
  maxPlayers: {
    type: Number,
    required: [true, 'Maximum number of players is required'],
    min: [2, 'Tournament must have at least 2 players'],
    max: [256, 'Tournament cannot exceed 256 players'],
    validate: {
      validator: function(value: number) {
        // For elimination tournaments, check if it's a power of 2
        return Number.isInteger(value) && value > 0;
      },
      message: 'Maximum players must be a positive integer'
    }
  },
  currentPlayers: {
    type: Number,
    default: 0,
    min: [0, 'Current players cannot be negative']
  },
  format: {
    type: String,
    enum: {
      values: ['single-elimination', 'double-elimination', 'round-robin'],
      message: 'Format must be single-elimination, double-elimination, or round-robin'
    },
    required: [true, 'Tournament format is required']
  },
  gameType: {
    type: String,
    enum: {
      values: ['singles', 'doubles'],
      message: 'Game type must be singles or doubles'
    },
    required: [true, 'Game type is required']
  },
  gameFormat: {
    type: String,
    enum: {
      values: ['regular', 'tiebreak-8', 'tiebreak-10'],
      message: 'Game format must be regular, tiebreak-8, or tiebreak-10'
    },
    default: 'regular',
    required: [true, 'Game format is required']
  },
  pairingMethod: {
    type: String,
    enum: {
      values: ['random', 'seeded', 'manual'],
      message: 'Pairing method must be random, seeded, or manual'
    },
    default: 'random'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'registration-open', 'registration-closed', 'in-progress', 'completed', 'archived'],
      message: 'Invalid tournament status'
    },
    default: 'pending'
  },
  venue: {
    type: String,
    trim: true,
    maxlength: [200, 'Venue cannot exceed 200 characters']
  },
  entryFee: {
    type: Number,
    min: [0, 'Entry fee cannot be negative'],
    default: 0
  },
  prizePool: {
    type: Number,
    min: [0, 'Prize pool cannot be negative'],
    default: 0
  },
  requiredCourts: {
    type: Number,
    min: [1, 'At least 1 court is required'],
    max: [20, 'Cannot exceed 20 courts'],
    default: 2
  },
  rules: {
    type: String,
    trim: true,
    maxlength: [2000, 'Rules cannot exceed 2000 characters']
  },
  organizer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tournament organizer is required']
  }
}, {
  timestamps: true
});

// Indexes for performance
TournamentSchema.index({ status: 1 });
TournamentSchema.index({ startDate: 1 });
TournamentSchema.index({ organizer: 1 });
TournamentSchema.index({ format: 1, gameType: 1 });

// Virtual for checking if registration is open
TournamentSchema.virtual('isRegistrationOpen').get(function(this: ITournament) {
  const now = new Date();
  return (this.status as any) === 'registration-open' && 
         now <= (this.registrationDeadline as any) && 
         (this.currentPlayers as any) < (this.maxPlayers as any);
});

// Virtual for checking if tournament is full
TournamentSchema.virtual('isFull').get(function(this: ITournament) {
  return (this.currentPlayers as any) >= (this.maxPlayers as any);
});

// Virtual for spots remaining
TournamentSchema.virtual('spotsRemaining').get(function(this: ITournament) {
  return Math.max(0, (this.maxPlayers as any) - (this.currentPlayers as any));
});

// Validation function for dates and maxPlayers
function validateTournamentData(data: any, next: any) {
  // Validate date relationships
  if (data.endDate && data.startDate && new Date(data.endDate) <= new Date(data.startDate)) {
    return next(new Error('End date must be after start date'));
  }
  
  if (data.registrationDeadline && data.startDate && new Date(data.registrationDeadline) > new Date(data.startDate)) {
    return next(new Error('Registration deadline must be before or equal to start date'));
  }
  
  // Validate maxPlayers for elimination tournaments
  if (data.format && data.maxPlayers && (data.format === 'single-elimination' || data.format === 'double-elimination')) {
    // Check if maxPlayers is a power of 2
    const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
    if (!isPowerOfTwo(data.maxPlayers)) {
      return next(new Error('For elimination tournaments, maximum players must be a power of 2 (2, 4, 8, 16, 32, etc.)'));
    }
  }
  next();
}

// Middleware to validate dates and maxPlayers for save operations
TournamentSchema.pre<ITournament>('save', function (next) {
  validateTournamentData(this, next);
});

// Middleware to validate dates and maxPlayers for update operations
TournamentSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  validateTournamentData(update, next);
});

// Ensure virtual fields are serialized
TournamentSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<ITournament>('Tournament', TournamentSchema);