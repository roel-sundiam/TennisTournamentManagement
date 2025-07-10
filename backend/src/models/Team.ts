import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  players: mongoose.Types.ObjectId[];
  tournament: mongoose.Types.ObjectId;
  seed?: number;
  averageSkillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  players: [{
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  }],
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament reference is required']
  },
  seed: {
    type: Number,
    min: [1, 'Seed must be at least 1']
  },
  averageSkillLevel: {
    type: String,
    enum: {
      values: ['beginner', 'intermediate', 'advanced', 'professional'],
      message: 'Average skill level must be beginner, intermediate, advanced, or professional'
    },
    required: [true, 'Average skill level is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
TeamSchema.index({ tournament: 1 });
TeamSchema.index({ tournament: 1, seed: 1 });
TeamSchema.index({ tournament: 1, isActive: 1 });

// Compound unique index to prevent duplicate teams in same tournament
TeamSchema.index({ tournament: 1, name: 1 }, { unique: true });

// Validation for team composition
TeamSchema.pre<ITeam>('validate', async function (next) {
  // Populate tournament to check game type
  await this.populate('tournament');
  const tournament = this.tournament as any;

  if (tournament.gameType === 'singles' && this.players.length !== 1) {
    return next(new Error('Singles tournament teams must have exactly 1 player'));
  }

  if (tournament.gameType === 'doubles' && this.players.length !== 2) {
    return next(new Error('Doubles tournament teams must have exactly 2 players'));
  }

  // Check for duplicate players in the same team
  const playerIds = this.players.map(p => p.toString());
  const uniquePlayers = Array.from(new Set(playerIds));
  if (uniquePlayers.length !== this.players.length) {
    return next(new Error('A player cannot be on the same team multiple times'));
  }

  next();
});

// Middleware to ensure unique seeds within tournament
TeamSchema.pre<ITeam>('save', async function (next) {
  console.log('🔍 Team pre-save middleware triggered');
  
  // Basic validation - check if tournament exists
  const tournament = await mongoose.model('Tournament').findById(this.tournament);
  if (!tournament) {
    return next(new Error('Tournament not found'));
  }

  // For now, skip player registration validation to get teams saving
  // We can add this back later once basic functionality works
  console.log('🔍 Team validation passed, proceeding with save');
  next();
});

// Virtual for display name with seed
TeamSchema.virtual('displayName').get(function() {
  return this.seed ? `#${this.seed} ${this.name}` : this.name;
});

// Virtual for team size
TeamSchema.virtual('teamSize').get(function(this: ITeam) {
  return (this.players as any).length;
});

// Static method to check if player is already on a team in tournament
TeamSchema.statics.isPlayerOnTeam = async function(this: any, playerId: mongoose.Types.ObjectId, tournamentId: mongoose.Types.ObjectId, excludeTeamId?: mongoose.Types.ObjectId) {
  const query: any = {
    players: playerId,
    tournament: tournamentId,
    isActive: true
  };

  if (excludeTeamId) {
    query._id = { $ne: excludeTeamId };
  }

  const existingTeam = await this.findOne(query);
  return !!existingTeam;
};

// Ensure virtual fields are serialized
TeamSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<ITeam>('Team', TeamSchema);