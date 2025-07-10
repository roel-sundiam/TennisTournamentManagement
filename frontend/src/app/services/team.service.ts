import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Team {
  _id: string;
  name: string;
  players: any[];
  tournament: any;
  seed?: number;
  averageSkillLevel: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiUrl = `${environment.apiUrl}/api/teams`;

  constructor(private http: HttpClient) {}

  /**
   * Get all teams
   */
  getAllTeams(): Observable<Team[]> {
    return this.http.get<{success: boolean, data: Team[]}>(`${this.apiUrl}`)
      .pipe(map(response => response.data));
  }

  /**
   * Get teams for a specific tournament
   */
  getTeamsByTournament(tournamentId: string): Observable<Team[]> {
    return this.http.get<{success: boolean, data: Team[]}>(`${this.apiUrl}/${tournamentId}`)
      .pipe(map(response => response.data));
  }

  /**
   * Create multiple teams at once (for team generation)
   */
  createTeamsBulk(tournamentId: string, teams: any[]): Observable<Team[]> {
    return this.http.post<{success: boolean, data: Team[]}>(`${this.apiUrl}/bulk`, {
      tournamentId,
      teams
    }).pipe(map(response => response.data));
  }

  /**
   * Create a single team
   */
  createTeam(team: Partial<Team>): Observable<Team> {
    return this.http.post<{success: boolean, data: Team}>(`${this.apiUrl}`, team)
      .pipe(map(response => response.data));
  }

  /**
   * Update team
   */
  updateTeam(id: string, team: Partial<Team>): Observable<Team> {
    return this.http.put<{success: boolean, data: Team}>(`${this.apiUrl}/${id}`, team)
      .pipe(map(response => response.data));
  }

  /**
   * Delete team
   */
  deleteTeam(id: string): Observable<void> {
    return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  /**
   * Delete all teams for a tournament
   */
  deleteTeamsByTournament(tournamentId: string): Observable<void> {
    return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/tournament/${tournamentId}`)
      .pipe(map(() => void 0));
  }
}