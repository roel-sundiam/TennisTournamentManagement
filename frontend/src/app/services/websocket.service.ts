import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export interface LiveScoreUpdate {
  matchId: string;
  score: any;
  status: string;
  lastUpdate: Date;
}

export interface MatchEvent {
  matchId: string;
  eventType: 'point_scored' | 'game_won' | 'set_won' | 'match_won' | 'match_started' | 'match_paused' | 'match_resumed' | string;
  player?: 'player1' | 'player2';
  timestamp: Date;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private reconnectTimeout: any;

  // Observables for different message types
  private messagesSubject = new Subject<WebSocketMessage>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private liveScoreUpdatesSubject = new Subject<LiveScoreUpdate>();
  private matchEventsSubject = new Subject<MatchEvent>();

  public messages$ = this.messagesSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public liveScoreUpdates$ = this.liveScoreUpdatesSubject.asObservable();
  public matchEvents$ = this.matchEventsSubject.asObservable();

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Use WebSocket URL from environment or fallback
      const wsUrl = environment.wsUrl || 'ws://localhost:3000';
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = (event) => {
        console.log('✅ WebSocket connected successfully');
        this.connectionStatusSubject.next(true);
        this.reconnectAttempts = 0;
        
        // Subscribe to live scoring updates
        this.send({
          type: 'subscribe',
          data: { channels: ['live-scores', 'match-events', 'tournament-updates'] }
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          message.timestamp = new Date();
          
          console.log('📨 WebSocket message received:', message);
          this.messagesSubject.next(message);
          
          // Route messages to specific observables
          this.routeMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        this.connectionStatusSubject.next(false);
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.connectionStatusSubject.next(false);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private routeMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'live-score-update':
        this.liveScoreUpdatesSubject.next(message.data as LiveScoreUpdate);
        break;
      
      case 'match-event':
        this.matchEventsSubject.next(message.data as MatchEvent);
        break;
      
      case 'score-update':
        // Handle legacy score update format
        this.liveScoreUpdatesSubject.next({
          matchId: message.data.matchId,
          score: message.data.score,
          status: message.data.status,
          lastUpdate: new Date()
        });
        break;
        
      default:
        console.log('📋 Unhandled message type:', message.type);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public send(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      console.log('📤 WebSocket message sent:', message);
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent:', message);
    }
  }

  public subscribeToMatch(matchId: string): void {
    this.send({
      type: 'subscribe-match',
      data: { matchId }
    });
  }

  public unsubscribeFromMatch(matchId: string): void {
    this.send({
      type: 'unsubscribe-match',
      data: { matchId }
    });
  }

  public subscribeToTournament(tournamentId: string): void {
    this.send({
      type: 'subscribe-tournament',
      data: { tournamentId }
    });
  }

  public updateScore(matchId: string, pointWinner: 'player1' | 'player2'): void {
    this.send({
      type: 'score-update',
      data: { matchId, pointWinner }
    });
  }

  public startMatch(matchId: string): void {
    this.send({
      type: 'start-match',
      data: { matchId }
    });
  }

  public pauseMatch(matchId: string): void {
    this.send({
      type: 'pause-match',
      data: { matchId }
    });
  }

  public resumeMatch(matchId: string): void {
    this.send({
      type: 'resume-match',
      data: { matchId }
    });
  }

  public endMatch(matchId: string): void {
    this.send({
      type: 'end-match',
      data: { matchId }
    });
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }
    
    this.connectionStatusSubject.next(false);
  }

  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}