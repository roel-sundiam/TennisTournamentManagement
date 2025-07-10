import mongoose, { Document, Schema } from 'mongoose';

export interface IBracketNode {
  round: number;
  position: number;
  team?: mongoose.Types.ObjectId;
  match?: mongoose.Types.ObjectId;
  nextNode?: {
    round: number;
    position: number;
  };
  previousNodes?: {
    round: number;
    position: number;
  }[];
}

export interface IBracket extends Document {
  tournament: mongoose.Types.ObjectId;
  name?: string;
  format: 'single-elimination' | 'double-elimination' | 'round-robin';
  teams: mongoose.Types.ObjectId[];
  totalRounds: number;
  totalTeams: number;
  status: 'draft' | 'active' | 'completed';
  structure: IBracketNode[];
  bracketData?: any; // Store the complete bracket structure from frontend
  isGenerated: boolean;
  isComplete: boolean;
  winner?: mongoose.Types.ObjectId;
  runnerUp?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BracketNodeSchema: Schema = new Schema({
  round: {
    type: Number,
    required: [true, 'Round is required'],
    min: [1, 'Round must be at least 1']
  },
  position: {
    type: Number,
    required: [true, 'Position is required'],
    min: [1, 'Position must be at least 1']
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  match: {
    type: Schema.Types.ObjectId,
    ref: 'Match'
  },
  nextNode: {
    round: {
      type: Number,
      min: [1, 'Next node round must be at least 1']
    },
    position: {
      type: Number,
      min: [1, 'Next node position must be at least 1']
    }
  },
  previousNodes: [{
    round: {
      type: Number,
      min: [1, 'Previous node round must be at least 1']
    },
    position: {
      type: Number,
      min: [1, 'Previous node position must be at least 1']
    }
  }]
}, { _id: false });

const BracketSchema: Schema = new Schema({
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: [true, 'Tournament reference is required'],
    unique: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: [200, 'Bracket name cannot exceed 200 characters']
  },
  format: {
    type: String,
    enum: {
      values: ['single-elimination', 'double-elimination', 'round-robin'],
      message: 'Format must be single-elimination, double-elimination, or round-robin'
    },
    required: [true, 'Bracket format is required']
  },
  teams: [{
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  }],
  totalRounds: {
    type: Number,
    required: [true, 'Total rounds is required'],
    min: [1, 'Total rounds must be at least 1']
  },
  totalTeams: {
    type: Number,
    required: [true, 'Total teams is required'],
    min: [2, 'Total teams must be at least 2']
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'completed'],
      message: 'Status must be draft, active, or completed'
    },
    default: 'draft'
  },
  structure: [BracketNodeSchema],
  bracketData: {
    type: Schema.Types.Mixed,
    default: null
  },
  isGenerated: {
    type: Boolean,
    default: false
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  runnerUp: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  }
}, {
  timestamps: true
});

// Indexes for performance
BracketSchema.index({ tournament: 1 });
BracketSchema.index({ format: 1 });
BracketSchema.index({ isComplete: 1 });

// Method to calculate total rounds needed for elimination tournaments
BracketSchema.methods.calculateTotalRounds = function(): number {
  if (this.format === 'round-robin') {
    // In round-robin, each team plays every other team once
    // Number of rounds = (n-1) where n is number of teams
    return Math.max(1, this.totalTeams - 1);
  } else {
    // For elimination tournaments, rounds = log2(totalTeams)
    return Math.ceil(Math.log2(this.totalTeams));
  }
};

// Method to generate bracket structure for single elimination
BracketSchema.methods.generateSingleEliminationStructure = function(): IBracketNode[] {
  const structure: IBracketNode[] = [];
  const rounds = this.calculateTotalRounds();
  
  for (let round = 1; round <= rounds; round++) {
    const teamsInRound = Math.pow(2, rounds - round + 1);
    const matchesInRound = teamsInRound / 2;
    
    for (let position = 1; position <= matchesInRound; position++) {
      const node: IBracketNode = {
        round,
        position,
        previousNodes: [],
        nextNode: undefined
      };

      // Set up connections
      if (round < rounds) {
        node.nextNode = {
          round: round + 1,
          position: Math.ceil(position / 2)
        };
      }

      if (round > 1) {
        const prevPosition1 = (position - 1) * 2 + 1;
        const prevPosition2 = (position - 1) * 2 + 2;
        node.previousNodes = [
          { round: round - 1, position: prevPosition1 },
          { round: round - 1, position: prevPosition2 }
        ];
      }

      structure.push(node);
    }
  }

  return structure;
};

// Method to generate bracket structure for double elimination
BracketSchema.methods.generateDoubleEliminationStructure = function(): IBracketNode[] {
  const structure: IBracketNode[] = [];
  const mainRounds = this.calculateTotalRounds();
  
  // Generate winner's bracket (same as single elimination)
  const winnersBracket = this.generateSingleEliminationStructure();
  structure.push(...winnersBracket);
  
  // Generate loser's bracket (more complex structure)
  // This is simplified - a full implementation would be more detailed
  const losersRounds = mainRounds * 2 - 1;
  
  for (let round = mainRounds + 1; round <= mainRounds + losersRounds; round++) {
    const position = 1; // Simplified for this example
    structure.push({
      round,
      position,
      previousNodes: [],
      nextNode: round < mainRounds + losersRounds ? { round: round + 1, position: 1 } : undefined
    });
  }
  
  return structure;
};

// Method to generate bracket structure for round robin
BracketSchema.methods.generateRoundRobinStructure = function(): IBracketNode[] {
  const structure: IBracketNode[] = [];
  const rounds = this.totalTeams - 1;
  
  // In round-robin, each round has n/2 matches (where n is number of teams)
  const matchesPerRound = Math.floor(this.totalTeams / 2);
  
  for (let round = 1; round <= rounds; round++) {
    for (let position = 1; position <= matchesPerRound; position++) {
      structure.push({
        round,
        position,
        previousNodes: [],
        nextNode: undefined
      });
    }
  }
  
  return structure;
};

// Method to generate bracket structure based on format
BracketSchema.methods.generateStructure = function(): void {
  this.totalRounds = this.calculateTotalRounds();
  
  switch (this.format) {
    case 'single-elimination':
      this.structure = this.generateSingleEliminationStructure();
      break;
    case 'double-elimination':
      this.structure = this.generateDoubleEliminationStructure();
      break;
    case 'round-robin':
      this.structure = this.generateRoundRobinStructure();
      break;
    default:
      throw new Error('Invalid bracket format');
  }
  
  this.isGenerated = true;
};

// Method to get teams in a specific round
BracketSchema.methods.getTeamsInRound = function(this: IBracket, round: number): mongoose.Types.ObjectId[] {
  return this.structure
    .filter((node: IBracketNode) => node.round === round && node.team)
    .map((node: IBracketNode) => node.team!);
};

// Method to advance team to next round
BracketSchema.methods.advanceTeam = function(this: IBracket, fromRound: number, fromPosition: number, team: mongoose.Types.ObjectId): void {
  const currentNode = this.structure.find((node: IBracketNode) => 
    node.round === fromRound && node.position === fromPosition
  );
  
  if (currentNode && currentNode.nextNode) {
    const nextNode = this.structure.find((node: IBracketNode) => 
      node.round === currentNode.nextNode!.round && 
      node.position === currentNode.nextNode!.position
    );
    
    if (nextNode) {
      nextNode.team = team;
    }
  }
};

// Virtual for bracket progress percentage
BracketSchema.virtual('progressPercentage').get(function(this: IBracket) {
  const totalNodes = this.structure.length;
  const completedNodes = this.structure.filter((node: IBracketNode) => node.team).length;
  return totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
});

// Ensure virtual fields are serialized
BracketSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model<IBracket>('Bracket', BracketSchema);