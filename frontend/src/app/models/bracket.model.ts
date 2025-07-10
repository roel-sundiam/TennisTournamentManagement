export interface BracketMatch {
  _id?: string;
  roundNumber: number;
  matchNumber: number;
  player1?: {
    id: string;
    name: string;
    seed?: number;
    ranking?: number;
  };
  player2?: {
    id: string;
    name: string;
    seed?: number;
    ranking?: number;
  };
  winner?: {
    id: string;
    name: string;
    ranking?: number;
  };
  score?: {
    player1Score: number;
    player2Score: number;
    sets?: Array<{
      player1: number;
      player2: number;
    }>;
  };
  status: 'pending' | 'in-progress' | 'completed' | 'bye';
  scheduledTime?: Date;
  court?: string;
  nextMatchId?: string;
  previousMatch1Id?: string;
  previousMatch2Id?: string;
}

export interface Bracket {
  _id?: string;
  tournamentId: string;
  name?: string;
  format: 'single-elimination' | 'double-elimination' | 'round-robin';
  teams?: any[]; // Array of team references from database
  totalTeams?: number;
  status: 'draft' | 'active' | 'completed';
  rounds: BracketRound[];
  bracketData?: any; // Complete bracket structure from frontend generation
  totalRounds: number;
  isGenerated?: boolean;
  isComplete?: boolean;
  winner?: any;
  runnerUp?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: BracketMatch[];
  isCompleted: boolean;
}

export interface DoubleEliminationBracket extends Bracket {
  winnersRounds: BracketRound[];
  losersRounds: BracketRound[];
  finalMatch?: BracketMatch;
  grandFinalMatch?: BracketMatch;
}

export interface RoundRobinBracket extends Bracket {
  groups?: RoundRobinGroup[];
  standings: PlayerStanding[];
}

export interface RoundRobinGroup {
  groupName: string;
  players: string[];
  matches: BracketMatch[];
  standings: PlayerStanding[];
}

export interface PlayerStanding {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
}

export interface BracketPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BracketVisualization {
  matches: Array<BracketMatch & { position: BracketPosition }>;
  connections: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>;
  width: number;
  height: number;
}