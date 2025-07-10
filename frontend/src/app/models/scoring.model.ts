export interface TennisScore {
  player1Points: number; // 0, 15, 30, 40
  player2Points: number;
  player1Games: number;
  player2Games: number;
  player1Sets: number;
  player2Sets: number;
  currentSet: number;
  sets: SetScore[];
  isDeuce: boolean;
  advantage?: 'player1' | 'player2' | null;
  isMatchPoint: boolean;
  isSetPoint: boolean;
  winner?: 'player1' | 'player2';
}

export interface SetScore {
  setNumber: number;
  player1Games: number;
  player2Games: number;
  player1Tiebreak?: number;
  player2Tiebreak?: number;
  isTiebreak: boolean;
  isCompleted: boolean;
}

export interface MatchDetails {
  _id?: string;
  tournamentId: string;
  bracketId: string;
  matchId: string;
  player1: {
    id: string;
    name: string;
    seed?: number;
  };
  player2: {
    id: string;
    name: string;
    seed?: number;
  };
  score: TennisScore;
  status: 'scheduled' | 'in-progress' | 'completed' | 'suspended' | 'cancelled';
  court?: string;
  scheduledTime?: Date;
  startTime?: Date;
  endTime?: Date;
  matchFormat: 'best-of-3' | 'best-of-5';
  gameFormat?: 'regular' | 'tiebreak-8' | 'tiebreak-10';
  umpire?: string;
  spectators?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScoreUpdate {
  matchId: string;
  pointWinner: 'player1' | 'player2';
  timestamp: Date;
  scoreAfter: TennisScore;
  eventType: 'point' | 'game' | 'set' | 'match';
}

export interface MatchEvent {
  id: string;
  matchId: string;
  timestamp: Date;
  eventType: 'match_start' | 'point_won' | 'game_won' | 'set_won' | 'match_won' | 'suspension' | 'resumption';
  player?: 'player1' | 'player2';
  details: string;
  score: TennisScore;
}

export interface LiveMatchSummary {
  matchId: string;
  player1Name: string;
  player2Name: string;
  score: TennisScore;
  status: string;
  court?: string;
  elapsedTime?: string;
  lastUpdate: Date;
  gameFormat?: 'regular' | 'tiebreak-8' | 'tiebreak-10';
}

export interface TournamentLiveStats {
  tournamentId: string;
  activeMatches: number;
  completedMatches: number;
  totalMatches: number;
  currentRound: string;
  liveMatches: LiveMatchSummary[];
  recentResults: LiveMatchSummary[];
}

export interface ScoreboardDisplay {
  player1: {
    name: string;
    sets: number[];
    currentGame: number;
    currentPoint: string; // "0", "15", "30", "40", "AD"
    isServing: boolean;
  };
  player2: {
    name: string;
    sets: number[];
    currentGame: number;
    currentPoint: string;
    isServing: boolean;
  };
  matchStatus: string;
  currentSet: number;
  elapsedTime: string;
}