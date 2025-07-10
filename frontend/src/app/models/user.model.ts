export interface User {
  _id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'organizer' | 'player';
  isActive: boolean;
  fullName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'organizer' | 'player';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface LoginResponse extends AuthResponse {
  token: string;
  user: User;
}