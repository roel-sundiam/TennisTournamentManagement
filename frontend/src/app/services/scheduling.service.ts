import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Court } from './court.service';

export interface TimeSlot {
  _id?: string;
  startTime: Date;
  endTime: Date;
  court: string | Court;
  tournament: string;
  match?: string;
  status: 'available' | 'booked' | 'blocked';
  duration: number;
  notes?: string;
  timeRange?: string;
  dateString?: string;
}

export interface ScheduleRequest {
  tournamentId: string;
  startDate: Date;
  endDate: Date;
  courts: string[];
  timeSlotDuration: number; // in minutes
  startTime: string; // e.g., "09:00"
  endTime: string; // e.g., "18:00"
  breakBetweenMatches: number; // in minutes
}

export interface ScheduleConflict {
  type: 'court_overlap' | 'player_double_booking' | 'time_conflict';
  message: string;
  details: any;
}

export interface TournamentSchedule {
  tournamentId: string;
  totalMatches: number;
  scheduledMatches: number;
  timeSlots: TimeSlot[];
  conflicts: ScheduleConflict[];
  estimatedDuration: number; // in hours
  schedule?: {
    _id: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    courts: string[];
    timeSlotDuration: number;
    startTime: string;
    endTime: string;
    breakBetweenMatches: number;
    status: string;
    generatedAt: Date;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SchedulingService {
  private apiUrl = `${environment.apiUrl}/api/scheduling`;

  constructor(private http: HttpClient) {}

  // Generate tournament schedule
  generateSchedule(request: ScheduleRequest): Observable<TournamentSchedule> {
    return this.http.post<{success: boolean, data: TournamentSchedule}>(`${this.apiUrl}/generate`, request)
      .pipe(map(response => response.data));
  }

  // Get schedule for tournament
  getTournamentSchedule(tournamentId: string): Observable<TournamentSchedule> {
    console.log('🔍 SchedulingService.getTournamentSchedule called with:', tournamentId);
    console.log('🔍 API URL will be:', `${this.apiUrl}/${tournamentId}`);
    console.log('🔍 Base apiUrl:', this.apiUrl);
    return this.http.get<{success: boolean, data: TournamentSchedule}>(`${this.apiUrl}/${tournamentId}`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          // If no schedule exists (404), return empty schedule
          if (error.status === 404) {
            return of({
              tournamentId: tournamentId,
              totalMatches: 0,
              scheduledMatches: 0,
              timeSlots: [],
              conflicts: [],
              estimatedDuration: 0
            });
          }
          throw error;
        })
      );
  }

  // Get available time slots for a court
  getAvailableTimeSlots(courtId: string, date?: Date): Observable<TimeSlot[]> {
    let params: { [key: string]: string } = {};
    if (date) {
      params['date'] = date.toISOString();
    }
    return this.http.get<{success: boolean, data: TimeSlot[]}>(`${this.apiUrl}/timeslots/${courtId}`, { params })
      .pipe(map(response => response.data));
  }

  // Reschedule a match
  rescheduleMatch(matchId: string, newTimeSlotId: string): Observable<void> {
    return this.http.put<{success: boolean}>(`${this.apiUrl}/reschedule/${matchId}`, { timeSlotId: newTimeSlotId })
      .pipe(map(() => void 0));
  }

  // Check for scheduling conflicts
  checkConflicts(tournamentId: string): Observable<ScheduleConflict[]> {
    return this.http.get<{success: boolean, data: ScheduleConflict[]}>(`${this.apiUrl}/conflicts/${tournamentId}`)
      .pipe(map(response => response.data));
  }

  // Block time slot
  blockTimeSlot(timeSlotId: string, reason?: string): Observable<TimeSlot> {
    return this.http.put<{success: boolean, data: TimeSlot}>(`${this.apiUrl}/timeslots/${timeSlotId}/block`, { reason })
      .pipe(map(response => response.data));
  }

  // Unblock time slot
  unblockTimeSlot(timeSlotId: string): Observable<TimeSlot> {
    return this.http.put<{success: boolean, data: TimeSlot}>(`${this.apiUrl}/timeslots/${timeSlotId}/unblock`, {})
      .pipe(map(response => response.data));
  }

  // Utility methods for frontend
  formatTimeSlot(timeSlot: TimeSlot): string {
    const start = new Date(timeSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(timeSlot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${start} - ${end}`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getTimeSlotDuration(timeSlot: TimeSlot): string {
    const hours = Math.floor(timeSlot.duration / 60);
    const minutes = timeSlot.duration % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  isTimeSlotAvailable(timeSlot: TimeSlot): boolean {
    return timeSlot.status === 'available' && !timeSlot.match;
  }

  getConflictSeverity(conflict: ScheduleConflict): 'low' | 'medium' | 'high' {
    switch (conflict.type) {
      case 'time_conflict': return 'low';
      case 'court_overlap': return 'medium';
      case 'player_double_booking': return 'high';
      default: return 'medium';
    }
  }

  // Calculate optimal schedule parameters
  calculateOptimalSchedule(tournamentData: any): {
    estimatedDuration: number;
    recommendedSlotDuration: number;
    minimumCourts: number;
    recommendedStartTime: string;
  } {
    const matchCount = tournamentData.totalMatches || 0;
    const gameFormat = tournamentData.gameFormat || 'regular';
    
    // Estimate match duration based on format
    let avgMatchDuration = 90; // minutes
    switch (gameFormat) {
      case 'tiebreak-8': avgMatchDuration = 45; break;
      case 'tiebreak-10': avgMatchDuration = 60; break;
      case 'regular': avgMatchDuration = 90; break;
    }

    const recommendedSlotDuration = avgMatchDuration + 15; // Add 15min buffer
    const totalMinutes = matchCount * recommendedSlotDuration;
    const estimatedDuration = Math.ceil(totalMinutes / 60); // hours
    const minimumCourts = Math.ceil(matchCount / 8); // Assume 8 matches per court per day

    return {
      estimatedDuration,
      recommendedSlotDuration,
      minimumCourts,
      recommendedStartTime: '09:00'
    };
  }
}