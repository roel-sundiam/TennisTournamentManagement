import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { MatchDetails, TennisScore, SetScore, MatchEvent, LiveMatchSummary, TournamentLiveStats, ScoreboardDisplay } from '../models/scoring.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScoringService {
  private apiUrl = `${environment.apiUrl}/api/matches`;
  private liveMatchesSubject = new BehaviorSubject<LiveMatchSummary[]>([]);
  private matchEventsSubject = new BehaviorSubject<MatchEvent[]>([]);

  public liveMatches$ = this.liveMatchesSubject.asObservable();
  public matchEvents$ = this.matchEventsSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('🏗️ ScoringService constructor called');
    this.loadLiveMatchesFromStorage();
    this.loadLiveMatchesFromBackend();
  }

  // Core Scoring Logic
  updateScore(matchId: string, pointWinner: 'player1' | 'player2'): Observable<any> {
    // Convert player1/player2 to team1/team2 for backend
    const teamWinner = pointWinner === 'player1' ? 'team1' : 'team2';
    
    return this.http.put(`${this.apiUrl}/${matchId}/score`, { 
      pointWinner: teamWinner 
    }).pipe(
      tap(response => {
        console.log('Score updated successfully:', response);
        // Refresh live matches after score update
        this.refreshLiveMatches();
      }),
      // Transform response data for frontend compatibility
      map((response: any) => {
        if (response.success && response.data) {
          return this.transformMatchDataForScoring(response.data);
        }
        return response;
      }),
      catchError(error => {
        console.error('Error updating score:', error);
        throw error;
      })
    );
  }

  /**
   * Start a match
   */
  startMatch(matchId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${matchId}/start`, {}).pipe(
      tap(response => {
        console.log('Match started successfully:', response);
        this.refreshLiveMatches();
      }),
      // Transform response data for frontend compatibility
      map((response: any) => {
        if (response.success && response.data) {
          return {
            ...response,
            data: this.transformMatchDataForScoring(response.data)
          };
        }
        return response;
      }),
      catchError(error => {
        console.error('Error starting match:', error);
        throw error;
      })
    );
  }

  /**
   * Complete a match
   */
  completeMatch(matchId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${matchId}/complete`, {}).pipe(
      tap(response => {
        console.log('Match completed successfully:', response);
        this.refreshLiveMatches();
      }),
      catchError(error => {
        console.error('Error completing match:', error);
        throw error;
      })
    );
  }

  /**
   * Submit final score for a match
   */
  submitFinalScore(matchId: string, scoreData: any): Observable<any> {
    const url = `${this.apiUrl}/${matchId}/final-score`;
    console.log('🚀 Sending final score request:', {
      url: url,
      matchId: matchId,
      scoreData: scoreData
    });
    
    return this.http.put(url, scoreData).pipe(
      tap(response => {
        console.log('✅ Final score response received:', response);
        this.refreshLiveMatches();
      }),
      // Transform response data for frontend compatibility
      map((response: any) => {
        if (response.success && response.data) {
          return {
            ...response,
            data: this.transformMatchDataForScoring(response.data)
          };
        }
        return response;
      }),
      catchError(error => {
        console.error('❌ Error submitting final score:', error);
        console.error('❌ Request URL:', url);
        console.error('❌ Request data:', scoreData);
        console.error('❌ Error response:', error.error);
        throw error;
      })
    );
  }

  /**
   * Get match details from backend
   */
  getMatchDetails(matchId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/match/${matchId}`).pipe(
      tap(response => {
        console.log('Raw match data from backend:', response);
      }),
      // Transform and extract the data
      map((response: any) => {
        if (response.success && response.data) {
          const transformedData = this.transformMatchDataForScoring(response.data);
          console.log('Transformed match data for scoring:', transformedData);
          return transformedData;
        } else {
          console.error('Invalid response structure:', response);
          throw new Error('Invalid response from backend');
        }
      }),
      catchError(error => {
        console.error('Error fetching match details:', error);
        // Fallback to mock data if backend is unavailable
        return this.getMockMatchDetails(matchId);
      })
    );
  }

  /**
   * Transform match data from scheduling format (team1/team2) to scoring format (player1/player2)
   */
  private transformMatchDataForScoring(matchData: any): any {
    console.log('🔄 Transforming match data:', matchData);
    console.log('🔍 Raw score data from backend:', matchData.score);
    console.log('🔍 Tennis score nested data:', matchData.score?.tennisScore);
    
    // Transform the tennis score from team1/team2 to player1/player2 format
    const transformedScore = this.transformTennisScore(matchData.score?.tennisScore);
    console.log('🔄 Transformed score result:', transformedScore);
    
    const result = {
      ...matchData,
      // Transform team1/team2 to player1/player2 for scoring component compatibility
      player1: {
        id: matchData.team1?._id || matchData.team1?.id || 'team1',
        name: matchData.team1?.name || matchData.team1?.displayName || 'Team 1',
        seed: matchData.team1?.seed
      },
      player2: {
        id: matchData.team2?._id || matchData.team2?.id || 'team2', 
        name: matchData.team2?.name || matchData.team2?.displayName || 'Team 2',
        seed: matchData.team2?.seed
      },
      // Transform score structure to match frontend expectations
      score: transformedScore,
      // Preserve game format from backend (should inherit from tournament)
      gameFormat: matchData.gameFormat || 'regular',
      matchFormat: matchData.matchFormat || 'best-of-3',
      // Map other fields
      tournamentId: matchData.tournament?._id || matchData.tournament,
      bracketId: matchData.bracket || 'default-bracket',
      matchId: matchData._id
    };
    
    console.log('✅ Final transformed data with score:', {
      player1: result.player1,
      player2: result.player2,
      score: result.score,
      gameFormat: result.gameFormat
    });
    
    return result;
  }

  /**
   * Transform tennis score from backend format (team1/team2) to frontend format (player1/player2)
   */
  private transformTennisScore(backendScore: any): any {
    console.log('🔍 Transforming tennis score from backend:', backendScore);
    
    if (!backendScore) {
      console.log('⚠️ No backend score provided, creating initial score');
      return this.createInitialScore();
    }

    const result = {
      player1Points: backendScore.team1Points || 0,
      player2Points: backendScore.team2Points || 0,
      player1Games: backendScore.team1Games || 0,
      player2Games: backendScore.team2Games || 0,
      player1Sets: backendScore.team1Sets || 0,
      player2Sets: backendScore.team2Sets || 0,
      currentSet: backendScore.currentSet || 1,
      sets: backendScore.sets?.map((set: any) => ({
        setNumber: set.setNumber,
        player1Games: set.team1Games,
        player2Games: set.team2Games,
        player1Tiebreak: set.team1Tiebreak,
        player2Tiebreak: set.team2Tiebreak,
        isTiebreak: set.isTiebreak,
        isCompleted: set.isCompleted
      })) || [],
      isDeuce: backendScore.isDeuce || false,
      advantage: backendScore.advantage === 'team1' ? 'player1' : 
                 backendScore.advantage === 'team2' ? 'player2' : null,
      isMatchPoint: backendScore.isMatchPoint || false,
      isSetPoint: backendScore.isSetPoint || false,
      winner: backendScore.winner === 'team1' ? 'player1' : 
              backendScore.winner === 'team2' ? 'player2' : undefined
    };
    
    console.log('🔄 Tennis score transformation result:', {
      input: backendScore,
      output: result,
      player1Games: result.player1Games,
      player2Games: result.player2Games,
      sets: result.sets
    });
    
    return result;
  }

  /**
   * Create initial score structure for new matches
   */
  private createInitialScore(): any {
    return {
      player1Points: 0,
      player2Points: 0,
      player1Games: 0,
      player2Games: 0,
      player1Sets: 0,
      player2Sets: 0,
      currentSet: 1,
      sets: [{
        setNumber: 1,
        player1Games: 0,
        player2Games: 0,
        isTiebreak: false,
        isCompleted: false
      }],
      isDeuce: false,
      advantage: null,
      isMatchPoint: false,
      isSetPoint: false,
      winner: null
    };
  }

  /**
   * Get matches for a tournament
   */
  getTournamentMatches(tournamentId: string, status?: string): Observable<any> {
    let url = `${this.apiUrl}/${tournamentId}`;
    if (status) {
      url += `?status=${status}`;
    }
    
    return this.http.get(url).pipe(
      catchError(error => {
        console.error('Error fetching tournament matches:', error);
        return of({ success: false, data: [] });
      })
    );
  }

  /**
   * Get all live matches across all tournaments
   */
  getAllLiveMatches(): Observable<any> {
    console.log('🔍 Fetching live matches from:', `${environment.apiUrl}/api/matches/live`);
    return this.http.get(`${environment.apiUrl}/api/matches/live`).pipe(
      tap(response => {
        console.log('🎾 Backend response:', response);
      }),
      catchError(error => {
        console.error('❌ Error fetching all live matches:', error);
        return of({ success: false, data: [] });
      })
    );
  }

  /**
   * Get completed matches
   */
  getCompletedMatches(tournamentId?: string, limit: number = 50): Observable<any> {
    let url = `${environment.apiUrl}/api/matches/completed?limit=${limit}`;
    if (tournamentId) {
      url += `&tournamentId=${tournamentId}`;
    }
    
    console.log('🏆 Fetching completed matches from:', url);
    return this.http.get(url).pipe(
      tap(response => {
        console.log('✅ Completed matches response:', response);
      }),
      catchError(error => {
        console.error('❌ Error fetching completed matches:', error);
        return of({ success: false, data: [] });
      })
    );
  }

  /**
   * Refresh live matches data from backend
   */
  refreshLiveMatches(): void {
    console.log('🔄 Refreshing live matches...');
    this.getAllLiveMatches().subscribe({
      next: (response) => {
        if (response.success && response.data.length > 0) {
          console.log('✅ Found live matches from database:', response.data.length);
          const liveMatches = this.convertBackendMatchesToLiveMatches(response.data);
          this.liveMatchesSubject.next(liveMatches);
          // Save to localStorage
          localStorage.setItem('liveMatches', JSON.stringify(liveMatches));
        } else {
          console.log('📋 No live matches found in database');
          this.liveMatchesSubject.next([]);
          localStorage.removeItem('liveMatches');
        }
      },
      error: (error) => {
        console.error('❌ Error loading from database:', error);
      }
    });
  }

  /**
   * Create a new match in database
   */
  createMatch(matchData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/matches`, matchData).pipe(
      tap(response => {
        console.log('✅ Match created in database:', response);
      }),
      catchError(error => {
        console.error('❌ Error creating match:', error);
        throw error;
      })
    );
  }

  /**
   * Add match to live matches (for bracket integration)
   */
  addMatchToLiveMatches(matchDetails: any): void {
    console.log('📊 Adding match to live scoring service:', matchDetails);
    
    const currentMatches = this.liveMatchesSubject.value;
    console.log('📋 Current matches before adding:', currentMatches.length);
    
    // Create a LiveMatchSummary object
    const liveMatch: LiveMatchSummary = {
      matchId: matchDetails.matchId,
      player1Name: matchDetails.player1.name,
      player2Name: matchDetails.player2.name,
      score: matchDetails.score,
      status: 'in-progress',
      court: matchDetails.court,
      elapsedTime: '0:00:00',
      lastUpdate: new Date(),
      gameFormat: matchDetails.gameFormat || 'regular'
    };
    
    console.log('🎾 Created live match object:', liveMatch);
    
    // Check if match already exists
    const existingIndex = currentMatches.findIndex(m => m.matchId === matchDetails.matchId);
    console.log('🔍 Existing match index:', existingIndex);
    
    if (existingIndex >= 0) {
      // Update existing match
      currentMatches[existingIndex] = liveMatch;
      console.log('✅ Updated existing live match at index:', existingIndex);
    } else {
      // Add new match
      currentMatches.push(liveMatch);
      console.log('✅ Added new live match, total matches now:', currentMatches.length);
    }
    
    // Update the service with the new matches list
    this.liveMatchesSubject.next([...currentMatches]);
    console.log('📢 Broadcasted updated matches to subscribers:', currentMatches.length);
    
    // Save to localStorage for persistence across page refreshes
    localStorage.setItem('liveMatches', JSON.stringify(currentMatches));
    console.log('💾 Saved live matches to localStorage');
    
    // Also add a match started event
    const startEvent: MatchEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      matchId: matchDetails.matchId,
      timestamp: new Date(),
      eventType: 'match_start',
      player: undefined,
      details: `Match started: ${matchDetails.player1.name} vs ${matchDetails.player2.name}`,
      score: matchDetails.score
    };
    
    // Add to match events
    this.addMatchEvent(startEvent);
    
    console.log('📡 Match added to live scoring dashboard successfully');
  }

  /**
   * Load live matches from localStorage
   */
  private loadLiveMatchesFromStorage(): void {
    try {
      const savedMatches = localStorage.getItem('liveMatches');
      if (savedMatches) {
        const matches = JSON.parse(savedMatches);
        console.log('💾 Loaded live matches from localStorage:', matches.length);
        this.liveMatchesSubject.next(matches);
      } else {
        console.log('💾 No saved matches found in localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading matches from localStorage:', error);
    }
  }

  /**
   * Load live matches from backend
   */
  private loadLiveMatchesFromBackend(): void {
    console.log('🔄 loadLiveMatchesFromBackend called');
    const currentMatches = this.liveMatchesSubject.value;
    console.log('🔄 Current matches before backend load:', currentMatches.length);
    
    // Try to get all live matches from backend
    this.getAllLiveMatches().subscribe({
      next: (response) => {
        if (response.success && response.data.length > 0) {
          console.log('✅ Found real live matches from backend:', response.data);
          const liveMatches = this.convertBackendMatchesToLiveMatches(response.data);
          this.liveMatchesSubject.next(liveMatches);
          localStorage.setItem('liveMatches', JSON.stringify(liveMatches));
          console.log('✅ Using real backend data - ' + liveMatches.length + ' live matches loaded');
        } else {
          console.log('⚠️ No live matches found in backend - database is empty');
          // Keep any existing matches from localStorage
          if (currentMatches.length === 0) {
            this.liveMatchesSubject.next([]);
            this.matchEventsSubject.next([]);
          }
        }
      },
      error: (error) => {
        console.log('❌ Backend not available for live matches:', error);
        // Keep any existing matches from localStorage
        if (currentMatches.length === 0) {
          this.liveMatchesSubject.next([]);
          this.matchEventsSubject.next([]);
        }
      }
    });
  }

  /**
   * Convert backend matches to LiveMatchSummary format
   */
  private convertBackendMatchesToLiveMatches(matches: any[]): LiveMatchSummary[] {
    return matches.map(match => ({
      matchId: match._id,
      player1Name: match.team1?.name || 'Player 1',
      player2Name: match.team2?.name || 'Player 2', 
      score: this.convertBackendScore(match.score?.tennisScore),
      status: match.status,
      court: match.court || 'TBD',
      elapsedTime: this.calculateElapsedTime(match.score?.startTime),
      lastUpdate: new Date(match.updatedAt),
      gameFormat: match.gameFormat || 'regular'
    }));
  }

  /**
   * Convert backend tennis score to frontend format
   */
  private convertBackendScore(backendScore: any): TennisScore {
    if (!backendScore) {
      return this.createMockScore(0, 0, 0, 0, 0, 0);
    }

    return {
      player1Points: backendScore.team1Points || 0,
      player2Points: backendScore.team2Points || 0,
      player1Games: backendScore.team1Games || 0,
      player2Games: backendScore.team2Games || 0,
      player1Sets: backendScore.team1Sets || 0,
      player2Sets: backendScore.team2Sets || 0,
      currentSet: backendScore.currentSet || 1,
      sets: backendScore.sets?.map((set: any) => ({
        setNumber: set.setNumber,
        player1Games: set.team1Games,
        player2Games: set.team2Games,
        player1Tiebreak: set.team1Tiebreak,
        player2Tiebreak: set.team2Tiebreak,
        isTiebreak: set.isTiebreak,
        isCompleted: set.isCompleted
      })) || [],
      isDeuce: backendScore.isDeuce || false,
      advantage: backendScore.advantage === 'team1' ? 'player1' : 
                 backendScore.advantage === 'team2' ? 'player2' : null,
      isMatchPoint: backendScore.isMatchPoint || false,
      isSetPoint: backendScore.isSetPoint || false,
      winner: backendScore.winner === 'team1' ? 'player1' : 
              backendScore.winner === 'team2' ? 'player2' : undefined
    };
  }

  /**
   * Calculate elapsed time from start time
   */
  private calculateElapsedTime(startTime?: string): string {
    if (!startTime) return '0:00:00';
    
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get mock match details (fallback)
   */
  private getMockMatchDetails(matchId: string): Observable<any> {
    return of({
      success: true,
      data: this.createMockMatch(matchId)
    });
  }

  private addMatchEvent(event: MatchEvent): void {
    const events = this.matchEventsSubject.value;
    events.unshift(event); // Add to beginning
    this.matchEventsSubject.next(events.slice(0, 50)); // Keep last 50 events
  }

  // API Methods

  getLiveMatches(): Observable<LiveMatchSummary[]> {
    return this.liveMatches$;
  }

  getTournamentLiveStats(tournamentId: string): Observable<TournamentLiveStats> {
    const liveMatches = this.liveMatchesSubject.value;
    const stats: TournamentLiveStats = {
      tournamentId,
      activeMatches: liveMatches.filter(m => m.status === 'in-progress').length,
      completedMatches: liveMatches.filter(m => m.status === 'completed').length,
      totalMatches: 15, // Mock total
      currentRound: 'Quarterfinals',
      liveMatches: liveMatches.filter(m => m.status === 'in-progress'),
      recentResults: liveMatches.filter(m => m.status === 'completed').slice(0, 5)
    };
    return of(stats);
  }

  formatScoreString(score: TennisScore): string {
    const pointStrings = ['0', '15', '30', '40'];
    let p1Points = score.player1Points >= 40 ? '40' : pointStrings[pointStrings.indexOf(score.player1Points.toString())] || '0';
    let p2Points = score.player2Points >= 40 ? '40' : pointStrings[pointStrings.indexOf(score.player2Points.toString())] || '0';

    if (score.isDeuce) {
      p1Points = 'DEUCE';
      p2Points = 'DEUCE';
    } else if (score.advantage) {
      p1Points = score.advantage === 'player1' ? 'AD' : '40';
      p2Points = score.advantage === 'player2' ? 'AD' : '40';
    }

    const sets = score.sets.map(set => `${set.player1Games}-${set.player2Games}`).join(' ');
    return `${sets} | ${p1Points}-${p2Points}`;
  }

  getScoreboardDisplay(matchId: string): Observable<ScoreboardDisplay> {
    return new Observable(observer => {
      this.getMatchDetails(matchId).subscribe(match => {
        const display: ScoreboardDisplay = {
          player1: {
            name: match.player1.name,
            sets: match.score.sets.map((s: any) => s.player1Games),
            currentGame: match.score.player1Games,
            currentPoint: this.formatPoint(match.score.player1Points, match.score),
            isServing: true // Mock serving indicator
          },
          player2: {
            name: match.player2.name,
            sets: match.score.sets.map((s: any) => s.player2Games),
            currentGame: match.score.player2Games,
            currentPoint: this.formatPoint(match.score.player2Points, match.score),
            isServing: false
          },
          matchStatus: match.status,
          currentSet: match.score.currentSet,
          elapsedTime: '1:45:30' // Mock elapsed time
        };
        observer.next(display);
        observer.complete();
      });
    });
  }

  private formatPoint(points: number, score: TennisScore): string {
    if (score.isDeuce) return 'DEUCE';
    if (score.advantage === 'player1' && points >= 40) return 'AD';
    if (score.advantage === 'player2' && points >= 40) return 'AD';
    
    const pointStrings = ['0', '15', '30', '40'];
    return pointStrings[pointStrings.indexOf(points.toString())] || '0';
  }

  // Test match creation
  createTestMatch(): LiveMatchSummary {
    const testMatch: LiveMatchSummary = {
      matchId: `test-match-${Date.now()}`,
      player1Name: `Player A${Math.floor(Math.random() * 100)}`,
      player2Name: `Player B${Math.floor(Math.random() * 100)}`,
      score: this.createMockScore(0, 0, 0, 0, 0, 0),
      status: 'in-progress',
      court: `Court ${Math.floor(Math.random() * 5) + 1}`,
      elapsedTime: '0:00:00',
      lastUpdate: new Date(),
      gameFormat: ['regular', 'tiebreak-8', 'tiebreak-10'][Math.floor(Math.random() * 3)] as 'regular' | 'tiebreak-8' | 'tiebreak-10'
    };
    
    const currentMatches = this.liveMatchesSubject.value;
    currentMatches.push(testMatch);
    this.liveMatchesSubject.next([...currentMatches]);
    localStorage.setItem('liveMatches', JSON.stringify(currentMatches));
    
    return testMatch;
  }

  private createMockMatch(matchId: string): MatchDetails {
    return {
      _id: matchId,
      tournamentId: 'tournament-1',
      bracketId: 'bracket-1',
      matchId,
      player1: { id: '1', name: 'John Smith', seed: 1 },
      player2: { id: '2', name: 'Mike Davis', seed: 3 },
      score: this.createMockScore(6, 4, 2, 3, 1, 0),
      status: 'in-progress',
      court: 'Center Court',
      scheduledTime: new Date(),
      startTime: new Date(Date.now() - 3600000), // Started 1 hour ago
      matchFormat: 'best-of-3',
      gameFormat: 'regular',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private createMockScore(p1Games: number, p2Games: number, p1Points: number, p2Points: number, p1Sets: number, p2Sets: number): TennisScore {
    return {
      player1Points: p1Points,
      player2Points: p2Points,
      player1Games: p1Games,
      player2Games: p2Games,
      player1Sets: p1Sets,
      player2Sets: p2Sets,
      currentSet: Math.max(p1Sets, p2Sets) + 1,
      sets: [
        { setNumber: 1, player1Games: p1Sets > 0 ? 6 : p1Games, player2Games: p1Sets > 0 ? 4 : p2Games, isTiebreak: false, isCompleted: p1Sets > 0 || p2Sets > 0 }
      ],
      isDeuce: p1Points >= 40 && p2Points >= 40 && p1Points === p2Points,
      advantage: null,
      isMatchPoint: false,
      isSetPoint: false
    };
  }
}