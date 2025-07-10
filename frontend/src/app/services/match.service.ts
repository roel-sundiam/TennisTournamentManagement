import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Team {
  _id: string;
  name: string;
  players: any[];
}

export interface TimeSlot {
  _id: string;
  startTime: Date;
  endTime: Date;
  court: string | null;
  status: 'available' | 'booked' | 'blocked';
}

export interface ScheduledMatch {
  _id: string;
  tournament: string;
  round: number;
  matchNumber: number;
  team1: Team;
  team2: Team;
  scheduledDateTime?: Date;
  court?: string;
  scheduledTimeSlot?: TimeSlot;
  estimatedDuration?: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
  matchFormat: 'best-of-3' | 'best-of-5';
  bracketPosition: {
    round: number;
    position: number;
  };
  winner?: Team;
  score: any;
}

export interface RescheduleRequest {
  newTimeSlotId: string;
}

export interface SwapRequest {
  match1Id: string;
  match2Id: string;
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private apiUrl = `${environment.apiUrl}/api/scheduling`;

  constructor(private http: HttpClient) {}

  /**
   * Get all scheduled matches for a tournament
   */
  getTournamentMatches(tournamentId: string): Observable<{ success: boolean; data: ScheduledMatch[] }> {
    return this.http.get<{ success: boolean; data: ScheduledMatch[] }>(`${this.apiUrl}/${tournamentId}/matches`);
  }

  /**
   * Reschedule a match to a different time slot
   */
  rescheduleMatch(matchId: string, rescheduleData: RescheduleRequest): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.apiUrl}/matches/${matchId}/reschedule`, rescheduleData);
  }

  /**
   * Swap two matches between their time slots
   */
  swapMatches(swapData: SwapRequest): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/matches/swap`, swapData);
  }

  /**
   * Update match result/score
   */
  updateMatchResult(matchId: string, result: any): Observable<{ success: boolean; data: ScheduledMatch }> {
    return this.http.put<{ success: boolean; data: ScheduledMatch }>(`${this.apiUrl}/matches/${matchId}/result`, result);
  }

  /**
   * Get matches by round for bracket view
   */
  getMatchesByRound(tournamentId: string): Observable<{ [round: number]: ScheduledMatch[] }> {
    return new Observable(observer => {
      this.getTournamentMatches(tournamentId).subscribe({
        next: (response) => {
          const matchesByRound: { [round: number]: ScheduledMatch[] } = {};
          
          response.data.forEach(match => {
            if (!matchesByRound[match.round]) {
              matchesByRound[match.round] = [];
            }
            matchesByRound[match.round].push(match);
          });
          
          observer.next(matchesByRound);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Format match display name
   */
  getMatchDisplayName(match: ScheduledMatch): string {
    return `${match.team1.name} vs ${match.team2.name}`;
  }

  /**
   * Format match time
   */
  getMatchTimeDisplay(match: ScheduledMatch): string {
    if (!match.scheduledDateTime) return 'Not scheduled';
    
    const date = new Date(match.scheduledDateTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Get match status color for UI
   */
  getMatchStatusColor(status: string): string {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in-progress': return 'accent';
      case 'completed': return 'warn';
      case 'cancelled': return 'basic';
      case 'postponed': return 'warn';
      default: return 'basic';
    }
  }

  /**
   * Check if a match can be rescheduled
   */
  canRescheduleMatch(match: ScheduledMatch): boolean {
    return match.status === 'scheduled' && !match.winner;
  }
}