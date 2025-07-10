import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Court {
  _id?: string;
  name: string;
  type: 'indoor' | 'outdoor';
  status: 'available' | 'maintenance' | 'reserved';
  location?: string;
  isActive: boolean;
  notes?: string;
  capacity?: number;
  createdAt?: Date;
  updatedAt?: Date;
  displayName?: string;
  isAvailable?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CourtService {
  private apiUrl = `${environment.apiUrl}/api/courts`;

  constructor(private http: HttpClient) {}

  getAllCourts(): Observable<Court[]> {
    return this.http.get<{success: boolean, data: Court[]}>(`${this.apiUrl}`)
      .pipe(map(response => response.data));
  }

  getAvailableCourts(limit?: number): Observable<Court[]> {
    // Generate courts with simple names like "Court 1", "Court 2", etc.
    const courts: Court[] = [];
    const maxCourts = limit || 3; // Default to 3 courts if no limit specified
    
    console.log('🏟️ Court service generating courts with limit:', limit, 'maxCourts:', maxCourts);
    
    for (let i = 1; i <= maxCourts; i++) {
      courts.push({
        _id: i.toString(),
        name: `Court ${i}`,
        type: 'outdoor',
        status: 'available',
        location: 'Tournament Area',
        isActive: true,
        capacity: 4,
        notes: `Tournament court ${i}`
      });
    }
    
    console.log('🏟️ Generated courts:', courts.map(c => c.name));
    return of(courts);
    
    // TODO: Uncomment when backend is running
    // let url = `${this.apiUrl}/available`;
    // if (limit) {
    //   url += `?limit=${limit}`;
    // }
    // return this.http.get<{success: boolean, data: Court[]}>(url)
    //   .pipe(map(response => response.data));
  }

  getCourtsByType(type: 'indoor' | 'outdoor'): Observable<Court[]> {
    return this.http.get<{success: boolean, data: Court[]}>(`${this.apiUrl}/type/${type}`)
      .pipe(map(response => response.data));
  }

  getCourtById(id: string): Observable<Court> {
    return this.http.get<{success: boolean, data: Court}>(`${this.apiUrl}/${id}`)
      .pipe(map(response => response.data));
  }

  createCourt(court: Partial<Court>): Observable<Court> {
    return this.http.post<{success: boolean, data: Court}>(`${this.apiUrl}`, court)
      .pipe(map(response => response.data));
  }

  updateCourt(id: string, court: Partial<Court>): Observable<Court> {
    return this.http.put<{success: boolean, data: Court}>(`${this.apiUrl}/${id}`, court)
      .pipe(map(response => response.data));
  }

  deleteCourt(id: string): Observable<void> {
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  updateCourtStatus(id: string, status: 'available' | 'maintenance' | 'reserved'): Observable<Court> {
    return this.http.put<{success: boolean, data: Court}>(`${this.apiUrl}/${id}/status`, { status })
      .pipe(map(response => response.data));
  }

  toggleCourtActive(id: string): Observable<Court> {
    return this.http.put<{success: boolean, data: Court}>(`${this.apiUrl}/${id}/toggle`, {})
      .pipe(map(response => response.data));
  }
}