import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Tournament } from '../models/tournament.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private apiUrl = `${environment.apiUrl}/api/tournaments`;

  constructor(private http: HttpClient) {}

  getAllTournaments(): Observable<Tournament[]> {
    return this.http.get<{success: boolean, data: Tournament[]}>(`${this.apiUrl}`)
      .pipe(map(response => response.data));
  }

  getTournamentById(id: string): Observable<Tournament> {
    console.log('🔍 Loading tournament by ID:', id);
    return this.http.get<{success: boolean, data: Tournament}>(`${this.apiUrl}/${id}`)
      .pipe(map(response => {
        console.log('📥 Loaded tournament data:', response.data);
        console.log('📊 Loaded tournament requiredCourts:', response.data.requiredCourts);
        return response.data;
      }));
  }

  createTournament(tournament: Partial<Tournament>): Observable<Tournament> {
    return this.http.post<{success: boolean, data: Tournament}>(`${this.apiUrl}`, tournament)
      .pipe(map(response => response.data));
  }

  updateTournament(id: string, tournament: Partial<Tournament>): Observable<Tournament> {
    console.log('🚀 Tournament service - updating tournament:', id, tournament);
    return this.http.put<{success: boolean, data: Tournament}>(`${this.apiUrl}/${id}`, tournament)
      .pipe(map(response => {
        console.log('✅ Tournament service - update response:', response);
        console.log('📊 Updated tournament requiredCourts:', response.data.requiredCourts);
        return response.data;
      }));
  }

  deleteTournament(id: string): Observable<void> {
    return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  filterTournaments(status?: string): Observable<Tournament[]> {
    if (!status || status === 'all') {
      return this.getAllTournaments();
    }
    
    // For now, filter mock data
    return new Observable(observer => {
      this.getAllTournaments().subscribe(tournaments => {
        const filtered = tournaments.filter(t => t.status === status);
        observer.next(filtered);
        observer.complete();
      });
    });
  }
}