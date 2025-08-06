import mongoose, { Document, Schema } from 'mongoose';

export interface ISetScore {
  setNumber: number;
  team1Games: number;
  team2Games: number;
  team1Tiebreak?: number;
  team2Tiebreak?: number;
  isTiebreak: boolean;
  isCompleted: boolean;
}

export interface ITennisScore {
  team1Points: number; // 0, 15, 30, 40
  team2Points: number;
  team1Games: number;
  team2Games: number;
  team1Sets: number;
  team2Sets: number;
  currentSet: number;
  sets: ISetScore[];
  isDeuce: boolean;
  advantage?: 'team1' | 'team2' | null;
  isMatchPoint: boolean;
  isSetPoint: boolean;
  winner?: 'team1' | 'team2';
}

export interface IMatchScore {
  tennisScore: ITennisScore;
  winner?: mongoose.Types.ObjectId;
  isCompleted: boolean;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in minutes
}

export interface IMatch extends Document {
  tournament: mongoose.Types.ObjectId;
  club: mongoose.Types.ObjectId;
  round: number;
  matchNumber: number;
  team1?: mongoose.Types.ObjectId;
  team2?: mongoose.Types.ObjectId;
  scheduledDateTime?: Date;
  scheduledDate?: string;
  scheduledTime?: string;
  court?: string;
  scheduledTimeSlot?: mongoose.Types.ObjectId;
  estimatedDuration?: number;
  actualStartTime?: Date;
  actualEndTime?: Date;
  courtAssignment?: mongoose.Types.ObjectId;
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
  score: IMatchScore;
  winner?: mongoose.Types.ObjectId;
  matchFormat: 'best-of-3' | 'best-of-5';
  gameFormat: 'regular' | 'tiebreak-8' | 'tiebreak-10';
  notes?: string;
  referee?: string;
  bracket: mongoose.Types.ObjectId;
  bracketPosition: {
    round: number;
    position: number;
  };
  nextMatchId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SetScoreSchema: Schema = new Schema({
  setNumber: {
    type: Number,
    required: true,
    min: [1, 'Set number must be at least 1']
  },
  team1Games: {
    type: Number,
    default: 0,
    min: [0, 'Games cannot be negative']
  },
  team2Games: {
    type: Number,
    default: 0,
    min: [0, 'Games cannot be negative']
  },
  team1Tiebreak: {
    type: Number,
    min: [0, 'Tiebreak score cannot be negative']
  },
  team2Tiebreak: {
    type: Number,
    min: [0, 'Tiebreak score cannot be negative']
  },
  isTiebreak: {
    type: Boolean,
    default: false
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const TennisScoreSchema: Schema = new Schema({
  team1Points: {
    type: Number,
    default: 0,
    enum: [0, 15, 30, 40]
  },
  team2Points: {
    type: Number,
    default: 0,
    enum: [0, 15, 30, 40]
  },
  team1Games: {
    type: Number,
    default: 0,
    min: [0, 'Games cannot be negative']
  },
  team2Games: {
    type: Number,
    default: 0,
    min: [0, 'Games cannot be negative']
  },
  team1Sets: {
    type: Number,
    default: 0,
    min: [0, 'Sets cannot be negative']
  },
  team2Sets: {
    type: Number,
    default: 0,
    min: [0, 'Sets cannot be negative']
  },
  currentSet: {
    type: Number,
    default: 1,
    min: [1, 'Current set must be at least 1']
  },
  sets: [SetScoreSchema],
  isDeuce: {
    type: Boolean,
    default: false
  },
  advantage: {
    type: String,
    enum: ['team1', 'team2', null],
    default: null
  },
  isMatchPoint: {
    type: Boolean,
    default: false
  },
  isSetPoint: {
    type: Boolean,
    default: false
  },
  winner: {
    type: String,
    enum: ['team1', 'team2', null],
    default: null
  }
}, { _id: false });

const MatchScoreSchema: Schema = new Schema({
  tennisScore: {
    type: TennisScoreSchema,
    default: () => ({
      team1Points: 0,
      team2Points: 0,
      team1Games: 0,
      team2Games: 0,
      team1Sets: 0,
      team2Sets: 0,
      currentSet: 1,
      sets: [],
      isDeuce: false,
      advantage: null,
      isMatchPoint: false,
      isSetPoint: false,
      winner: null
    })
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative']
  }
}, { _id: false });

const MatchSchema: Schema = new Schema({
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament reference is required']
  },
  club: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Club is required for match']
  },
  round: {
    type: Number,
    required: [true, 'Round number is required'],
    min: [1, 'Round must be at least 1']
  },
  matchNumber: {
    type: Number,
    required: [true, 'Match number is required'],
    min: [1, 'Match number must be at least 1']
  },
  team1: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: false // Allow null for future rounds that haven't been populated yet
  },
  team2: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: false // Allow null for future rounds that haven't been populated yet
  },
  scheduledDateTime: {
    type: Date,
    validate: {
      validator: function(value: Date) {
        if (!value) return true; // Optional field
        return value > new Date();
      },
      message: 'Scheduled date and time must be in the future'
    }
  },
  scheduledDate: {
    type: String,
    trim: true,
    maxlength: [20, 'Scheduled date cannot exceed 20 characters']
  },
  scheduledTime: {
    type: String,
    trim: true,
    maxlength: [20, 'Scheduled time cannot exceed 20 characters']
  },
  court: {
    type: String,
    trim: true,
    maxlength: [50, 'Court name cannot exceed 50 characters']
  },
  scheduledTimeSlot: {
    type: Schema.Types.ObjectId,
    ref: 'TimeSlot'
  },
  estimatedDuration: {
    type: Number,
    min: [15, 'Estimated duration must be at least 15 minutes'],
    max: [300, 'Estimated duration cannot exceed 5 hours (300 minutes)']
  },
  actualStartTime: {
    type: Date
  },
  actualEndTime: {
    type: Date,
    validate: {
      validator: function(this: IMatch, value: Date) {
        if (!value || !this.actualStartTime) return true;
        return value > this.actualStartTime;
      },
      message: 'Actual end time must be after actual start time'
    }
  },
  courtAssignment: {
    type: Schema.Types.ObjectId,
    ref: 'Court'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'],
      message: 'Invalid match status'
    },
    default: 'pending'
  },
  matchFormat: {
    type: String,
    enum: ['best-of-3', 'best-of-5'],
    default: 'best-of-3'
  },
  gameFormat: {
    type: String,
    enum: ['regular', 'tiebreak-8', 'tiebreak-10'],
    default: 'regular'
  },
  score: {
    type: MatchScoreSchema,
    default: () => ({
      tennisScore: {
        team1Points: 0,
        team2Points: 0,
        team1Games: 0,
        team2Games: 0,
        team1Sets: 0,
        team2Sets: 0,
        currentSet: 1,
        sets: [],
        isDeuce: false,
        advantage: null,
        isMatchPoint: false,
        isSetPoint: false,
        winner: null
      },
      isCompleted: false
    })
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  referee: {
    type: String,
    trim: true,
    maxlength: [100, 'Referee name cannot exceed 100 characters']
  },
  bracket: {
    type: Schema.Types.ObjectId,
    ref: 'Bracket',
    required: [true, 'Bracket reference is required']
  },
  bracketPosition: {
    round: {
      type: Number,
      required: [true, 'Bracket round is required'],
      min: [1, 'Bracket round must be at least 1']
    },
    position: {
      type: Number,
      required: [true, 'Bracket position is required'],
      min: [1, 'Bracket position must be at least 1']
    }
  },
  nextMatchId: {
    type: Schema.Types.ObjectId,
    ref: 'Match'
  }
}, {
  timestamps: true
});

// Indexes for performance
MatchSchema.index({ tournament: 1 });
MatchSchema.index({ tournament: 1, round: 1 });
MatchSchema.index({ tournament: 1, status: 1 });
MatchSchema.index({ bracket: 1 });
MatchSchema.index({ scheduledDateTime: 1 });
MatchSchema.index({ scheduledTimeSlot: 1 });
MatchSchema.index({ courtAssignment: 1 });
MatchSchema.index({ actualStartTime: 1 });
MatchSchema.index({ 'bracketPosition.round': 1, 'bracketPosition.position': 1 });
MatchSchema.index({ club: 1 });
MatchSchema.index({ club: 1, tournament: 1 });
MatchSchema.index({ club: 1, status: 1 });

// Compound unique index to prevent duplicate matches
MatchSchema.index({ tournament: 1, round: 1, matchNumber: 1 }, { unique: true });

// Validation to ensure teams are different
MatchSchema.pre<IMatch>('validate', function (next) {
  if (this.team1 && this.team2 && this.team1.toString() === this.team2.toString()) {
    return next(new Error('A team cannot play against itself'));
  }
  next();
});

// Middleware to set winner and completion status
MatchSchema.pre<IMatch>('save', function (next) {
  if (this.status === 'completed' && this.score && this.score.tennisScore) {
    const tennisScore = this.score.tennisScore;
    
    // Determine winner based on tennis score
    if (tennisScore.winner === 'team1') {
      this.winner = this.team1;
      this.score.winner = this.team1;
    } else if (tennisScore.winner === 'team2') {
      this.winner = this.team2;
      this.score.winner = this.team2;
    }

    this.score.isCompleted = !!this.winner;
    
    // Set end time and calculate duration if not already set
    if (!this.score.endTime && this.score.startTime) {
      this.score.endTime = new Date();
      this.score.duration = Math.round((this.score.endTime.getTime() - this.score.startTime.getTime()) / (1000 * 60));
    }
  }

  next();
});

// Virtual for match display name
MatchSchema.virtual('displayName').get(function() {
  return `Round ${this.round} - Match ${this.matchNumber}`;
});

// Virtual for match result
MatchSchema.virtual('result').get(function(this: IMatch) {
  if (!this.score || !this.score.isCompleted || !this.score.tennisScore) return null;
  
  const tennisScore = this.score.tennisScore;
  const sets = tennisScore.sets.map((set: any) => 
    set.isTiebreak ? 
      `${set.team1Games}-${set.team2Games} (${set.team1Tiebreak}-${set.team2Tiebreak})` :
      `${set.team1Games}-${set.team2Games}`
  ).join(', ');
  return `Sets: ${sets}`;
});

// Virtual for match duration in hours and minutes
MatchSchema.virtual('formattedDuration').get(function(this: IMatch) {
  const duration = this.score?.duration;
  if (!duration) return null;
  
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Static method to get next available match number for a round
MatchSchema.statics.getNextMatchNumber = async function(tournamentId: mongoose.Types.ObjectId, round: number) {
  const lastMatch = await this.findOne({ tournament: tournamentId, round })
    .sort({ matchNumber: -1 });
  
  return lastMatch ? lastMatch.matchNumber + 1 : 1;
};

// Ensure virtual fields are serialized
MatchSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<IMatch>('Match', MatchSchema);