export interface Tournament {
  _id?: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  maxPlayers: number;
  currentPlayers: number;
  format: 'single-elimination' | 'double-elimination' | 'round-robin';
  gameType: 'singles' | 'doubles';
  gameFormat: 'regular' | 'tiebreak-8' | 'tiebreak-10';
  pairingMethod?: 'random' | 'seeded' | 'manual';
  status: 'draft' | 'registration-open' | 'registration-closed' | 'in-progress' | 'completed' | 'cancelled';
  venue?: string;
  entryFee?: number;
  prizePool?: number;
  requiredCourts: number;
  organizer?: string;
  rules?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TournamentFilters {
  status?: string;
  format?: string;
  gameType?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}