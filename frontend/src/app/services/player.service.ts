import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Player, PlayerRegistration } from '../models/player.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private apiUrl = `${environment.apiUrl}/api/players`;

  constructor(private http: HttpClient) {}

  getAllPlayers(): Observable<Player[]> {
    console.log('🔍 PlayerService: Making API call to get all players');
    return this.http.get<{success: boolean, data: any[]}>(`${this.apiUrl}`)
      .pipe(map(response => {
        console.log('🔍 PlayerService: Raw API response:', response);
        console.log('🔍 PlayerService: Response data length:', response?.data?.length);
        
        if (!response.data || !Array.isArray(response.data)) {
          console.error('🔍 PlayerService: Invalid response data structure');
          return [];
        }
        
        const players = response.data.map((player, index) => {
          return {
            ...player,
            name: player.fullName || `${player.firstName} ${player.lastName}`,
            isRegistered: player.isActive || false
          };
        });
        
        console.log('🔍 PlayerService: Final transformed players:', players);
        console.log('🔍 PlayerService: Returning', players.length, 'players');
        return players;
      }));
  }

  getPlayersByTournament(tournamentId: string): Observable<Player[]> {
    return this.http.get<{success: boolean, data: any[]}>(`${this.apiUrl}/tournament/${tournamentId}`)
      .pipe(map(response => response.data.map(player => ({
        ...player,
        name: player.fullName || `${player.firstName} ${player.lastName}`,
        isRegistered: player.isActive || false,
        seedPosition: player.seed || player.seedPosition
      }))));
  }

  getPlayerById(id: string): Observable<Player> {
    return this.http.get<{success: boolean, data: any}>(`${this.apiUrl}/${id}`)
      .pipe(map(response => ({
        ...response.data,
        name: response.data.fullName || `${response.data.firstName} ${response.data.lastName}`,
        isRegistered: response.data.isActive || false
      })));
  }

  createPlayer(player: Partial<Player>): Observable<Player> {
    return this.http.post<{success: boolean, data: Player}>(`${this.apiUrl}`, player)
      .pipe(map(response => response.data));
  }

  updatePlayer(id: string, player: Partial<Player>): Observable<Player> {
    return this.http.put<{success: boolean, data: Player}>(`${this.apiUrl}/${id}`, player)
      .pipe(map(response => response.data));
  }

  deletePlayer(id: string): Observable<void> {
    return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  updatePlayerSeeding(players: Player[]): Observable<Player[]> {
    // Mock implementation - in real app, would send updated seeding to backend
    return of(players);
  }

  registerPlayerForTournament(registration: PlayerRegistration): Observable<PlayerRegistration> {
    // return this.http.post<PlayerRegistration>(`${this.apiUrl}/register`, registration);
    return of({} as PlayerRegistration);
  }

  getAvailablePlayers(tournamentId: string): Observable<Player[]> {
    // Start with empty database for clean testing
    return of([]);
  }
}