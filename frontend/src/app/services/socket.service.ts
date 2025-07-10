import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface ScoreUpdateEvent {
  matchId: string;
  score: any;
  pointWinner: 'team1' | 'team2';
  timestamp: Date;
  isMatchCompleted: boolean;
  winner?: 'team1' | 'team2';
}

export interface MatchStartedEvent {
  matchId: string;
  status: string;
  startTime: Date;
}

export interface MatchCompletedEvent {
  matchId: string;
  winner: string;
  finalScore: any;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private connected = false;
  
  // Observable subjects for real-time events
  private scoreUpdateSubject = new Subject<ScoreUpdateEvent>();
  private matchStartedSubject = new Subject<MatchStartedEvent>();
  private matchCompletedSubject = new Subject<MatchCompletedEvent>();
  private connectionStatusSubject = new Subject<boolean>();

  // Public observables
  public scoreUpdates$ = this.scoreUpdateSubject.asObservable();
  public matchStarted$ = this.matchStartedSubject.asObservable();
  public matchCompleted$ = this.matchCompletedSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor() {
    // Initialize socket connection
    this.socket = io(environment.apiUrl || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      upgrade: true,
      autoConnect: false
    });

    this.setupEventListeners();
  }

  /**
   * Connect to the socket server
   */
  connect(): void {
    if (!this.connected) {
      console.log('🔌 Attempting to connect to Socket.IO server...');
      this.socket.connect();
    } else {
      console.log('🔌 Socket already connected');
    }
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.connected) {
      this.socket.disconnect();
    }
  }

  /**
   * Join a tournament room for real-time updates
   */
  joinTournament(tournamentId: string): void {
    if (this.connected) {
      console.log(`🏠 Attempting to join tournament room: ${tournamentId}`);
      this.socket.emit('join-tournament', tournamentId);
      console.log(`📤 Emitted join-tournament event for: ${tournamentId}`);
    } else {
      console.warn(`⚠️ Cannot join tournament ${tournamentId} - socket not connected`);
    }
  }

  /**
   * Leave a tournament room
   */
  leaveTournament(tournamentId: string): void {
    if (this.connected) {
      this.socket.emit('leave-tournament', tournamentId);
      console.log(`Left tournament room: ${tournamentId}`);
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Setup event listeners for socket events
   */
  private setupEventListeners(): void {
    // Connection events
    this.socket.on('connect', () => {
      this.connected = true;
      this.connectionStatusSubject.next(true);
      console.log('Socket.IO connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.connectionStatusSubject.next(false);
      console.log('Socket.IO disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.connectionStatusSubject.next(false);
    });

    // Tennis scoring events
    this.socket.on('score-updated', (data: ScoreUpdateEvent) => {
      console.log('Score update received:', data);
      this.scoreUpdateSubject.next(data);
    });

    this.socket.on('match-started', (data: MatchStartedEvent) => {
      console.log('Match started:', data);
      this.matchStartedSubject.next(data);
    });

    this.socket.on('match-completed', (data: MatchCompletedEvent) => {
      console.log('Match completed:', data);
      this.matchCompletedSubject.next(data);
    });
  }

  /**
   * Send a manual score update (for testing or admin purposes)
   */
  sendScoreUpdate(tournamentId: string, data: any): void {
    if (this.connected) {
      this.socket.emit('score-update', { ...data, tournamentId });
    }
  }

  /**
   * Get the current socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Listen for custom events
   */
  on(eventName: string): Observable<any> {
    console.log(`👂 Setting up listener for event "${eventName}"`);
    return new Observable(observer => {
      this.socket.on(eventName, (data: any) => {
        console.log(`📥 Received event "${eventName}":`, data);
        observer.next(data);
      });
      
      // Cleanup function
      return () => {
        console.log(`🔇 Removing listener for event "${eventName}"`);
        this.socket.off(eventName);
      };
    });
  }

  /**
   * Emit custom events
   */
  emit(eventName: string, data?: any): void {
    if (this.connected) {
      console.log(`📤 Emitting event "${eventName}":`, data);
      console.log(`🔗 Socket ID: ${this.socket.id}`);
      console.log(`🔗 Socket connected: ${this.socket.connected}`);
      this.socket.emit(eventName, data);
    } else {
      console.warn(`⚠️ Cannot emit "${eventName}" - socket not connected`);
      console.warn(`🔗 Socket state - connected: ${this.connected}, socket.connected: ${this.socket?.connected}`);
      
      // Try to reconnect if disconnected
      console.log(`🔄 Attempting to reconnect socket...`);
      this.connect();
    }
  }
}