import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { Bracket, BracketMatch, BracketRound, DoubleEliminationBracket, RoundRobinBracket, PlayerStanding } from '../models/bracket.model';
import { Player } from '../models/player.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BracketService {
  private apiUrl = `${environment.apiUrl}/api/brackets`;

  constructor(private http: HttpClient) {}

  /**
   * Get bracket from backend API
   */
  getBracketFromBackend(tournamentId?: string): Observable<any> {
    if (!tournamentId) {
      return of({ success: false, data: null });
    }
    
    return this.http.get<{success: boolean, data: any}>(`${this.apiUrl}/${tournamentId}`)
      .pipe(
        map(response => {
          console.log('📥 Bracket loaded from database:', response);
          return response;
        })
      );
  }

  generateSingleEliminationBracket(players: Player[], tournamentId: string): Observable<Bracket> {
    const playerCount = players.length;
    const totalRounds = Math.ceil(Math.log2(playerCount));
    const firstRoundMatches = Math.ceil(playerCount / 2);
    
    const rounds: BracketRound[] = [];
    
    // Generate all rounds
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      const matchesInRound = Math.ceil(firstRoundMatches / Math.pow(2, roundNum - 1));
      const roundName = this.getRoundName(roundNum, totalRounds);
      
      const matches: BracketMatch[] = [];
      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        matches.push({
          roundNumber: roundNum,
          matchNumber: matchNum,
          status: 'pending'
        });
      }
      
      rounds.push({
        roundNumber: roundNum,
        roundName,
        matches,
        isCompleted: false
      });
    }

    // Seed players into first round
    this.seedPlayersIntoFirstRound(players, rounds[0]);

    const bracket: Bracket = {
      tournamentId,
      format: 'single-elimination',
      status: 'draft',
      rounds,
      totalRounds,
      createdAt: new Date()
    };

    // Save bracket to database
    return this.saveBracketToDatabase(bracket, tournamentId);
  }

  private saveBracketToDatabase(bracket: any, tournamentId: string): Observable<any> {
    console.log('💾 Saving bracket to database:', bracket);
    
    const bracketData = {
      tournamentId,
      format: bracket.format,
      bracketData: bracket
    };

    return this.http.post<{success: boolean, data: any}>(`${this.apiUrl}`, bracketData)
      .pipe(
        switchMap(response => {
          console.log('✅ Bracket saved to database:', response.data);
          
          // Now create Match records for each bracket match
          return this.createMatchRecords(bracket, tournamentId, response.data._id)
            .pipe(map(() => response.data));
        })
      );
  }

  private createMatchRecords(bracket: any, tournamentId: string, bracketId: string): Observable<any> {
    console.log('🔧 Creating Match records for bracket matches...');
    console.log('🔍 Bracket data:', bracket);
    
    const matchesToCreate: any[] = [];
    
    // Extract all matches from bracket rounds
    if (bracket.rounds && Array.isArray(bracket.rounds)) {
      for (const round of bracket.rounds) {
        if (round.matches && Array.isArray(round.matches)) {
          for (const match of round.matches) {
            console.log('🔍 Checking match:', {
              roundNumber: match.roundNumber,
              matchNumber: match.matchNumber,
              player1: match.player1,
              player2: match.player2,
              hasPlayer1Id: !!match.player1?.id,
              hasPlayer2Id: !!match.player2?.id
            });
            
            // Create matches for all rounds, even if they don't have teams assigned yet
            const team1Id = match.player1?.id || match.player1?._id;
            const team2Id = match.player2?.id || match.player2?._id;
            
            // Always create match records - advancement logic needs them to exist
            {
              const matchData = {
                tournamentId: tournamentId,
                round: match.roundNumber,
                matchNumber: match.matchNumber,
                team1: team1Id || null,
                team2: team2Id || null,
                bracketId: bracketId,
                status: (team1Id && team2Id) ? 'scheduled' : 'pending', // Only schedule if both teams exist
                bracketPosition: {
                  round: match.roundNumber,
                  position: match.matchNumber
                }
              };
              
              console.log('✅ Created match data:', matchData);
              matchesToCreate.push(matchData);
            }
          }
        }
      }
    }
    
    console.log(`📊 Found ${matchesToCreate.length} matches to create in database`);
    
    if (matchesToCreate.length === 0) {
      console.log('⚠️ No valid matches found to create');
      return of(null);
    }
    
    // Create matches using bulk creation endpoint
    return this.http.post(`${environment.apiUrl}/api/matches/bulk`, {
      matches: matchesToCreate
    }).pipe(
      tap((response: any) => {
        console.log(`✅ Created ${response?.data?.length || 0} Match records in database`);
      }),
      catchError(error => {
        console.error('❌ Error creating Match records:', error);
        // Don't fail the entire bracket creation if match creation fails
        console.log('⚠️ Continuing without Match records - scores will be local only');
        return of(null);
      })
    );
  }

  generateDoubleEliminationBracket(players: Player[], tournamentId: string): Observable<DoubleEliminationBracket> {
    const playerCount = players.length;
    const winnersRounds = Math.ceil(Math.log2(playerCount));
    const losersRounds = (winnersRounds - 1) * 2;

    // Generate winners bracket
    const winnersRoundsList: BracketRound[] = [];
    for (let roundNum = 1; roundNum <= winnersRounds; roundNum++) {
      const matchesInRound = Math.ceil(playerCount / Math.pow(2, roundNum));
      const roundName = `Winners ${this.getRoundName(roundNum, winnersRounds)}`;
      
      const matches: BracketMatch[] = [];
      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        matches.push({
          roundNumber: roundNum,
          matchNumber: matchNum,
          status: 'pending'
        });
      }
      
      winnersRoundsList.push({
        roundNumber: roundNum,
        roundName,
        matches,
        isCompleted: false
      });
    }

    // Generate losers bracket
    const losersRoundsList: BracketRound[] = [];
    for (let roundNum = 1; roundNum <= losersRounds; roundNum++) {
      const roundName = `Losers Round ${roundNum}`;
      const matchesInRound = this.calculateLosersRoundMatches(roundNum, playerCount);
      
      const matches: BracketMatch[] = [];
      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        matches.push({
          roundNumber: roundNum,
          matchNumber: matchNum,
          status: 'pending'
        });
      }
      
      losersRoundsList.push({
        roundNumber: roundNum,
        roundName,
        matches,
        isCompleted: false
      });
    }

    // Seed players into first winners round
    this.seedPlayersIntoFirstRound(players, winnersRoundsList[0]);

    const bracket: DoubleEliminationBracket = {
      tournamentId,
      format: 'double-elimination',
      status: 'draft',
      rounds: [...winnersRoundsList, ...losersRoundsList],
      winnersRounds: winnersRoundsList,
      losersRounds: losersRoundsList,
      totalRounds: winnersRounds + losersRounds + 1, // +1 for grand final
      createdAt: new Date()
    };

    // Save bracket to database
    return this.saveBracketToDatabase(bracket, tournamentId);
  }

  generateRoundRobinBracket(players: Player[], tournamentId: string): Observable<RoundRobinBracket> {
    const playerCount = players.length;
    const totalMatches = (playerCount * (playerCount - 1)) / 2;
    const matches: BracketMatch[] = [];
    let matchNumber = 1;

    // Assign seed positions if they don't exist
    const sortedPlayers = [...players].sort((a, b) => (a.seedPosition || 0) - (b.seedPosition || 0));
    sortedPlayers.forEach((player, index) => {
      if (!player.seedPosition) {
        player.seedPosition = index + 1;
      }
    });

    // Generate all round-robin matches
    for (let i = 0; i < playerCount; i++) {
      for (let j = i + 1; j < playerCount; j++) {
        matches.push({
          roundNumber: 1,
          matchNumber: matchNumber++,
          player1: {
            id: sortedPlayers[i]._id!,
            name: sortedPlayers[i].name,
            seed: sortedPlayers[i].seedPosition,
            ranking: sortedPlayers[i].ranking
          },
          player2: {
            id: sortedPlayers[j]._id!,
            name: sortedPlayers[j].name,
            seed: sortedPlayers[j].seedPosition,
            ranking: sortedPlayers[j].ranking
          },
          status: 'pending'
        });
      }
    }

    // Initialize standings
    const standings: PlayerStanding[] = players.map(player => ({
      playerId: player._id!,
      playerName: player.name,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0
    }));

    const rounds: BracketRound[] = [{
      roundNumber: 1,
      roundName: 'Round Robin',
      matches,
      isCompleted: false
    }];

    const bracket: RoundRobinBracket = {
      tournamentId,
      format: 'round-robin',
      status: 'draft',
      rounds,
      standings,
      totalRounds: 1,
      createdAt: new Date()
    };

    // Save bracket to database
    return this.saveBracketToDatabase(bracket, tournamentId);
  }

  private seedPlayersIntoFirstRound(players: Player[], firstRound: BracketRound): void {
    const sortedPlayers = [...players].sort((a, b) => (a.seedPosition || 0) - (b.seedPosition || 0));
    
    // Assign seed positions if they don't exist (1, 2, 3, etc.)
    sortedPlayers.forEach((player, index) => {
      if (!player.seedPosition) {
        player.seedPosition = index + 1;
      }
    });
    
    // Create proper tournament seeding pairs
    const seedingPairs = this.createTournamentSeeding(sortedPlayers);
    
    for (let i = 0; i < firstRound.matches.length && i < seedingPairs.length; i++) {
      const match = firstRound.matches[i];
      const pair = seedingPairs[i];
      
      if (pair.player1) {
        match.player1 = {
          id: pair.player1._id!,
          name: pair.player1.name,
          seed: pair.player1.seedPosition,
          ranking: pair.player1.ranking
        };
      }
      
      if (pair.player2) {
        match.player2 = {
          id: pair.player2._id!,
          name: pair.player2.name,
          seed: pair.player2.seedPosition,
          ranking: pair.player2.ranking
        };
      } else {
        // Bye match
        match.status = 'bye';
        match.winner = match.player1;
      }
    }
  }

  private createTournamentSeeding(sortedPlayers: Player[]): Array<{player1?: Player, player2?: Player}> {
    const pairs: Array<{player1?: Player, player2?: Player}> = [];
    const playerCount = sortedPlayers.length;
    
    // For proper tournament seeding: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5, etc.
    for (let i = 0; i < Math.ceil(playerCount / 2); i++) {
      const player1 = sortedPlayers[i];
      const player2 = sortedPlayers[playerCount - 1 - i];
      
      if (player1 && player2 && player1 !== player2) {
        pairs.push({ player1, player2 });
      } else if (player1) {
        // Odd number of players, this player gets a bye
        pairs.push({ player1, player2: undefined });
      }
    }
    
    return pairs;
  }

  private getRoundName(roundNumber: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - roundNumber + 1;
    
    switch (roundsFromEnd) {
      case 1: return 'Final';
      case 2: return 'Semifinal';
      case 3: return 'Quarterfinal';
      case 4: return 'Round of 16';
      case 5: return 'Round of 32';
      case 6: return 'Round of 64';
      default: return `Round ${roundNumber}`;
    }
  }

  private calculateLosersRoundMatches(roundNumber: number, totalPlayers: number): number {
    // Simplified calculation for losers bracket matches
    if (roundNumber % 2 === 1) {
      // Odd rounds: receive players from winners bracket
      return Math.ceil(totalPlayers / Math.pow(2, Math.ceil(roundNumber / 2) + 1));
    } else {
      // Even rounds: internal losers bracket matches
      return Math.ceil(totalPlayers / Math.pow(2, roundNumber / 2 + 1));
    }
  }

  updateMatchResult(matchId: string, winnerId: string, score: any): Observable<BracketMatch> {
    // In a real implementation, this would update the backend
    // For demo, we'll just return a mock updated match
    const updatedMatch: BracketMatch = {
      roundNumber: 1,
      matchNumber: 1,
      player1: { id: '1', name: 'Player 1' },
      player2: { id: '2', name: 'Player 2' },
      winner: { id: winnerId, name: winnerId === '1' ? 'Player 1' : 'Player 2' },
      score: score,
      status: 'completed'
    };
    
    return of(updatedMatch);
  }

  advanceTournament(bracketId: string, completedMatch: BracketMatch): Observable<Bracket> {
    console.log('🏆 Advancing tournament:', bracketId, 'with completed match:', completedMatch);
    
    // The backend automatically handles advancement when match score is updated
    // Here we just refresh the bracket to show the updated state
    return this.refreshBracketFromBackend(bracketId);
  }

  /**
   * Refresh bracket data from backend to show latest advancement
   */
  refreshBracketFromBackend(bracketId: string): Observable<any> {
    console.log('🔄 Refreshing bracket from backend:', bracketId);
    return this.http.get(`${this.apiUrl}/bracket/${bracketId}`).pipe(
      tap(response => {
        console.log('📊 Updated bracket received:', response);
      }),
      catchError(error => {
        console.error('❌ Error refreshing bracket:', error);
        return of({ success: false, data: null });
      })
    );
  }

  /**
   * Get updated bracket by tournament ID after match completion
   */
  getBracketAfterMatchCompletion(tournamentId: string): Observable<any> {
    console.log('🎾 Getting updated bracket after match completion for tournament:', tournamentId);
    return this.getBracketFromBackend(tournamentId);
  }

  advanceWinnerToNextRound(bracket: Bracket, completedMatch: BracketMatch): Bracket {
    if (!completedMatch.winner) return bracket;

    const { roundNumber, matchNumber } = completedMatch;
    
    // Find next round and calculate next match position
    const nextRoundNumber = roundNumber + 1;
    const nextMatchNumber = Math.ceil(matchNumber / 2);
    
    // Find the next match in the bracket
    const nextRound = bracket.rounds.find(r => r.roundNumber === nextRoundNumber);
    if (!nextRound) {
      // Tournament is complete
      return bracket;
    }
    
    const nextMatch = nextRound.matches.find(m => m.matchNumber === nextMatchNumber);
    if (!nextMatch) return bracket;
    
    // Determine if winner goes to player1 or player2 slot
    const isPlayer1Slot = matchNumber % 2 === 1;
    
    if (isPlayer1Slot) {
      nextMatch.player1 = completedMatch.winner;
    } else {
      nextMatch.player2 = completedMatch.winner;
    }
    
    // Check if next match is ready to start
    if (nextMatch.player1 && nextMatch.player2) {
      nextMatch.status = 'pending';
    }
    
    return bracket;
  }

  getBracketByTournament(tournamentId: string): Observable<Bracket> {
    // return this.http.get<Bracket>(`${this.apiUrl}/tournament/${tournamentId}`);
    return of({} as Bracket);
  }

  // Mock data for testing
  getMockBracket(format: string): Observable<Bracket> {
    const mockPlayers: Player[] = [
      { _id: '1', name: 'John Smith', seedPosition: 1, skillLevel: 'advanced', isRegistered: true },
      { _id: '2', name: 'Sarah Johnson', seedPosition: 2, skillLevel: 'professional', isRegistered: true },
      { _id: '3', name: 'Mike Davis', seedPosition: 3, skillLevel: 'intermediate', isRegistered: true },
      { _id: '4', name: 'Emily Wilson', seedPosition: 4, skillLevel: 'advanced', isRegistered: true },
      { _id: '5', name: 'Alex Brown', seedPosition: 5, skillLevel: 'intermediate', isRegistered: true },
      { _id: '6', name: 'Lisa Garcia', seedPosition: 6, skillLevel: 'beginner', isRegistered: true },
      { _id: '7', name: 'Tom Anderson', seedPosition: 7, skillLevel: 'advanced', isRegistered: true },
      { _id: '8', name: 'Rachel Lee', seedPosition: 8, skillLevel: 'intermediate', isRegistered: true }
    ];

    switch (format) {
      case 'single-elimination':
        return this.generateSingleEliminationBracket(mockPlayers, 'mock-tournament');
      case 'double-elimination':
        return this.generateDoubleEliminationBracket(mockPlayers, 'mock-tournament');
      case 'round-robin':
        return this.generateRoundRobinBracket(mockPlayers, 'mock-tournament');
      default:
        return this.generateSingleEliminationBracket(mockPlayers, 'mock-tournament');
    }
  }

  // Mock data with famous players that match the backend sample data
  getMockBracketWithFamousPlayers(format: string): Observable<Bracket> {
    const famousPlayers: Player[] = [
      { _id: '1', name: 'Rafael Nadal', seedPosition: 1, skillLevel: 'professional', isRegistered: true },
      { _id: '2', name: 'Roger Federer', seedPosition: 2, skillLevel: 'professional', isRegistered: true },
      { _id: '3', name: 'Serena Williams', seedPosition: 3, skillLevel: 'professional', isRegistered: true },
      { _id: '4', name: 'Novak Djokovic', seedPosition: 4, skillLevel: 'professional', isRegistered: true },
      { _id: '5', name: 'Maria Sharapova', seedPosition: 5, skillLevel: 'professional', isRegistered: true },
      { _id: '6', name: 'Andy Murray', seedPosition: 6, skillLevel: 'professional', isRegistered: true }
    ];

    switch (format) {
      case 'single-elimination':
        return this.generateSingleEliminationBracket(famousPlayers, 'live-scoring-test-tournament');
      case 'double-elimination':
        return this.generateDoubleEliminationBracket(famousPlayers, 'live-scoring-test-tournament');
      case 'round-robin':
        return this.generateRoundRobinBracket(famousPlayers, 'live-scoring-test-tournament');
      default:
        return this.generateSingleEliminationBracket(famousPlayers, 'live-scoring-test-tournament');
    }
  }
}