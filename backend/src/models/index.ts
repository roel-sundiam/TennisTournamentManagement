// Export all models
export { default as User, IUser } from './User';
export { default as Club, IClub } from './Club';
export { default as Tournament, ITournament } from './Tournament';
export { default as Player, IPlayer } from './Player';
export { default as Team, ITeam } from './Team';
export { default as Match, IMatch, IMatchScore } from './Match';
export { default as Bracket, IBracket, IBracketNode } from './Bracket';
export { default as Court, ICourt } from './Court';
export { default as TimeSlot, ITimeSlot } from './TimeSlot';

// Model validation utilities
export const validateObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Skill level utilities
export const skillLevels = ['beginner', 'intermediate', 'advanced', 'professional'] as const;
export type SkillLevel = typeof skillLevels[number];

export const skillLevelValues = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  professional: 4
} as const;

// Tournament status utilities
export const tournamentStatuses = [
  'pending', 
  'registration-open', 
  'registration-closed', 
  'in-progress', 
  'completed', 
  'archived'
] as const;
export type TournamentStatus = typeof tournamentStatuses[number];

// Tournament format utilities
export const tournamentFormats = [
  'single-elimination', 
  'double-elimination', 
  'round-robin'
] as const;
export type TournamentFormat = typeof tournamentFormats[number];

// Game type utilities
export const gameTypes = ['singles', 'doubles'] as const;
export type GameType = typeof gameTypes[number];

// Match status utilities
export const matchStatuses = [
  'scheduled', 
  'in-progress', 
  'completed', 
  'cancelled', 
  'postponed'
] as const;
export type MatchStatus = typeof matchStatuses[number];

// User role utilities
export const userRoles = ['super-admin', 'club-admin', 'club-organizer', 'player'] as const;
export type UserRole = typeof userRoles[number];

// Club subscription utilities
export const subscriptionTiers = ['free', 'premium', 'enterprise'] as const;
export type SubscriptionTier = typeof subscriptionTiers[number];

// Court utilities
export const courtTypes = ['indoor', 'outdoor'] as const;
export type CourtType = typeof courtTypes[number];

export const courtStatuses = ['available', 'maintenance', 'reserved'] as const;
export type CourtStatus = typeof courtStatuses[number];

// Time slot utilities
export const timeSlotStatuses = ['available', 'booked', 'blocked'] as const;
export type TimeSlotStatus = typeof timeSlotStatuses[number];