export interface Player {
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  ranking?: number;
  seedPosition?: number; // For tournament seeding
  isRegistered?: boolean; // For tournament registration status
  profileImage?: string;
  dateOfBirth?: Date;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlayerRegistration {
  playerId: string;
  tournamentId: string;
  registrationDate: Date;
  seedPosition?: number;
  status: 'pending' | 'approved' | 'rejected';
}