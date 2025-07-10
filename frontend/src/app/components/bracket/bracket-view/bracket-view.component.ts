import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { BracketService } from '../../../services/bracket.service';
import { ScoringService } from '../../../services/scoring.service';
import { Bracket, BracketMatch, BracketRound, DoubleEliminationBracket, RoundRobinBracket } from '../../../models/bracket.model';
import { environment } from '../../../../environments/environment';
import { TournamentService } from '../../../services/tournament.service';

@Component({
  selector: 'app-bracket-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule
  ],
  templateUrl: './bracket-view.component.html',
  styleUrls: ['./bracket-view.component.scss']
})
export class BracketViewComponent implements OnInit {
  @Input() tournamentId?: string;
  
  bracket?: Bracket;
  bracketFormat: string = 'single-elimination';
  tournamentName?: string;
  gameFormat: string = 'regular';

  constructor(
    private bracketService: BracketService,
    private scoringService: ScoringService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private tournamentService: TournamentService
  ) {}

  ngOnInit(): void {
    // Get tournament ID from either path parameters or query parameters
    this.route.params.subscribe(params => {
      if (params['tournamentId']) {
        // Route: /tournaments/:tournamentId/brackets
        this.tournamentId = params['tournamentId'];
        console.log('🔍 Loading bracket for tournament (from path):', this.tournamentId);
        this.loadBracket();
      } else {
        // Route: /brackets?tournamentId=...
        this.route.queryParams.subscribe(queryParams => {
          if (queryParams['tournamentId']) {
            this.tournamentId = queryParams['tournamentId'];
            console.log('🔍 Loading bracket for tournament (from query):', this.tournamentId);
          }
          this.loadBracket();
        });
      }
    });
  }

  loadBracket(): void {
    this.bracket = undefined;
    this.tournamentName = undefined;
    
    // Clear any old bracket data to avoid confusion
    localStorage.removeItem('currentBracket');
    sessionStorage.removeItem('currentBracket');
    
    // Try to load bracket from backend first
    if (!this.tournamentId) {
      console.log('⚠️ No tournament ID provided');
      this.bracket = undefined;
      this.tournamentName = 'No Tournament Selected';
      return;
    }

    console.log('🔍 Making API call to load bracket for tournament:', this.tournamentId);
    console.log('🔗 API URL will be:', `${this.bracketService['apiUrl']}/${this.tournamentId}`);
    
    // Load tournament info to get game format
    this.tournamentService.getTournamentById(this.tournamentId).subscribe({
      next: (tournament) => {
        this.gameFormat = tournament.gameFormat || 'regular';
        console.log('🎯 Tournament game format:', this.gameFormat);
      },
      error: (error) => {
        console.log('⚠️ Could not load tournament info:', error);
      }
    });
    
    this.bracketService.getBracketFromBackend(this.tournamentId).subscribe({
      next: (response) => {
        console.log('📥 Raw API response:', response);
        if (response && response.success && response.data) {
          this.bracket = response.data;
          this.tournamentName = response.data.tournament?.name || response.data.name || 'Live Tournament';
          this.bracketFormat = this.bracket?.format || 'single-elimination';
          console.log('✅ Loaded bracket from backend:', this.bracket);
          console.log('🎯 Bracket format:', this.bracketFormat);
          console.log('📊 Bracket rounds:', this.bracket?.rounds?.length);
          console.log('🎾 Bracket teams:', this.bracket?.teams?.length);
          console.log('📄 Bracket bracketData:', this.bracket?.bracketData);
          
          // Ensure bracket is defined before proceeding
          if (this.bracket) {
            // If rounds are undefined but bracketData exists, use bracketData
            if (!this.bracket.rounds && this.bracket.bracketData?.rounds) {
              console.log('🔄 Using bracketData.rounds since bracket.rounds is undefined');
              this.bracket.rounds = this.bracket.bracketData.rounds;
              console.log('📊 Now bracket rounds:', this.bracket?.rounds?.length);
            }
            
            // If still no rounds but we have teams, generate a basic bracket structure
            if (!this.bracket.rounds && this.bracket.teams && this.bracket.teams.length > 0 && this.bracket.format) {
              console.log('🔧 Generating basic bracket structure from teams');
              this.bracket.rounds = this.generateBasicBracketFromTeams(this.bracket.teams, this.bracket.format);
              console.log('📊 Generated bracket rounds:', this.bracket?.rounds?.length);
            }
          }
          
          // Load database matches and merge with bracket
          this.loadDatabaseMatches();
        } else {
          console.log('⚠️ No bracket found for tournament:', this.tournamentId);
          console.log('📄 Response received:', response);
          this.bracket = undefined;
          this.tournamentName = 'No Bracket Generated';
        }
      },
      error: (error) => {
        console.log('❌ Error loading bracket:', error);
        console.log('🔗 Attempted URL:', `${this.bracketService['apiUrl']}/${this.tournamentId}`);
        console.log('📄 Error details:', error.message || error);
        console.log('🔍 Error status:', error.status);
        console.log('🔍 Error status type:', typeof error.status);
        this.bracket = undefined;
        
        // If it's a 404 error, it means no bracket exists yet - show generate option
        if (error.status === 404) {
          console.log('✅ Setting tournament name to "No Bracket Generated"');
          this.tournamentName = 'No Bracket Generated';
        } else {
          console.log('⚠️ Setting tournament name to "Error Loading Bracket"');
          this.tournamentName = 'Error Loading Bracket';
        }
        console.log('🎯 Final tournament name:', this.tournamentName);
      }
    });
  }


  private generateBasicBracketFromTeams(teams: any[], format: string): any[] {
    console.log('🔧 Generating bracket structure for', teams.length, 'teams with format:', format);
    
    if (format === 'round-robin') {
      return this.generateRoundRobinFromTeams(teams);
    } else {
      return this.generateEliminationFromTeams(teams);
    }
  }

  private generateRoundRobinFromTeams(teams: any[]): any[] {
    const matches = [];
    let matchNumber = 1;

    // Generate all possible matchups
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          roundNumber: 1,
          matchNumber: matchNumber++,
          player1: {
            id: teams[i]._id,
            name: teams[i].name,
            seed: teams[i].seed
          },
          player2: {
            id: teams[j]._id,
            name: teams[j].name,  
            seed: teams[j].seed
          },
          status: 'pending'
        });
      }
    }

    return [{
      roundNumber: 1,
      roundName: 'Round Robin',
      matches: matches,
      isCompleted: false
    }];
  }

  private generateEliminationFromTeams(teams: any[]): any[] {
    const totalRounds = Math.ceil(Math.log2(teams.length));
    const rounds = [];

    // Generate first round with all teams
    const firstRoundMatches = [];
    const matchesInFirstRound = Math.ceil(teams.length / 2);

    for (let i = 0; i < matchesInFirstRound; i++) {
      const team1 = teams[i * 2];
      const team2 = teams[i * 2 + 1];

      firstRoundMatches.push({
        roundNumber: 1,
        matchNumber: i + 1,
        player1: team1 ? {
          id: team1._id,
          name: team1.name,
          seed: team1.seed
        } : undefined,
        player2: team2 ? {
          id: team2._id,
          name: team2.name,
          seed: team2.seed
        } : undefined,
        status: team2 ? 'pending' : 'bye'
      });
    }

    rounds.push({
      roundNumber: 1,
      roundName: this.getRoundName(1, totalRounds),
      matches: firstRoundMatches,
      isCompleted: false
    });

    // Generate subsequent rounds (empty for now)
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.ceil(matchesInFirstRound / Math.pow(2, round - 1));
      const roundMatches = [];

      for (let i = 0; i < matchesInRound; i++) {
        roundMatches.push({
          roundNumber: round,
          matchNumber: i + 1,
          status: 'pending',
          player1: null,
          player2: null,
          score: null,
          winner: null
        });
      }

      rounds.push({
        roundNumber: round,
        roundName: this.getRoundName(round, totalRounds),
        matches: roundMatches,
        isCompleted: false
      });
    }

    return rounds;
  }

  private getRoundName(roundNumber: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - roundNumber + 1;
    
    switch (roundsFromEnd) {
      case 1: return 'Final';
      case 2: return 'Semifinal';
      case 3: return 'Quarterfinal';
      case 4: return 'Round of 16';
      default: return `Round ${roundNumber}`;
    }
  }

  getWinnersRounds(): BracketRound[] {
    if (this.bracket?.format === 'double-elimination') {
      const doubleBracket = this.bracket as DoubleEliminationBracket;
      return doubleBracket.winnersRounds || [];
    }
    return [];
  }

  getLosersRounds(): BracketRound[] {
    if (this.bracket?.format === 'double-elimination') {
      const doubleBracket = this.bracket as DoubleEliminationBracket;
      return doubleBracket.losersRounds || [];
    }
    return [];
  }

  getRoundRobinStandings(): any[] {
    if (this.bracket?.format === 'round-robin') {
      const roundRobinBracket = this.bracket as RoundRobinBracket;
      return roundRobinBracket.standings || [];
    }
    return [];
  }



  openLiveScoring(match: BracketMatch): void {
    if (!this.tournamentId) {
      this.snackBar.open('No tournament ID available', 'Close', { duration: 3000 });
      return;
    }

    // First, check if this match exists in the database
    const matchId = `bracket-${match.roundNumber}-${match.matchNumber}`;
    console.log('🔍 Looking for database match with ID:', matchId);

    // Try to find a database match for this bracket position
    this.http.get(`${environment.apiUrl}/api/matches/${this.tournamentId}`).subscribe({
      next: (response: any) => {
        const databaseMatches = response.data || [];
        console.log('📊 Found database matches:', databaseMatches.length);
        
        // Look for a match in the same round and position
        let dbMatch = databaseMatches.find((m: any) => 
          m.round === match.roundNumber && m.matchNumber === match.matchNumber
        );

        if (dbMatch) {
          console.log('✅ Found existing database match:', dbMatch);
          this.openScoringWithDatabaseMatch(dbMatch);
        } else {
          console.log('⚠️ No database match found, creating one...');
          this.createAndOpenMatch(match);
        }
      },
      error: (error) => {
        console.error('❌ Error checking database matches:', error);
        // Fall back to creating a new match
        this.createAndOpenMatch(match);
      }
    });
  }

  private createAndOpenMatch(match: BracketMatch): void {
    // Create a database match for this bracket match
    const matchData = {
      tournamentId: this.tournamentId,
      round: match.roundNumber,
      matchNumber: match.matchNumber,
      team1: match.player1?.id,
      team2: match.player2?.id,
      bracketId: this.bracket?._id,
      bracketPosition: `R${match.roundNumber}M${match.matchNumber}`
    };

    console.log('🔧 Creating database match:', matchData);

    this.http.post(`${environment.apiUrl}/api/matches`, matchData).subscribe({
      next: (response: any) => {
        console.log('✅ Successfully created database match:', response);
        this.openScoringWithDatabaseMatch(response.data);
      },
      error: (error) => {
        console.error('❌ Error creating database match:', error);
        this.snackBar.open(
          `Error creating match: ${error.error?.message || 'Unknown error'}`,
          'Close',
          { duration: 5000 }
        );
      }
    });
  }

  private openScoringWithDatabaseMatch(dbMatch: any): void {
    // Convert database match to scoring dialog format
    const matchDetails = {
      _id: dbMatch._id,
      tournamentId: dbMatch.tournament,
      bracketId: dbMatch.bracket,
      matchId: dbMatch._id,
      player1: {
        id: dbMatch.team1?.id || dbMatch.team1?._id || '1',
        name: dbMatch.team1?.name || 'TBD',
        seed: dbMatch.team1?.seed
      },
      player2: {
        id: dbMatch.team2?.id || dbMatch.team2?._id || '2',
        name: dbMatch.team2?.name || 'TBD',
        seed: dbMatch.team2?.seed
      },
      score: this.convertDatabaseScore(dbMatch.score?.tennisScore) || this.initializeScore(),
      status: dbMatch.status === 'scheduled' ? 'in-progress' : dbMatch.status,
      court: `Court ${dbMatch.round}`,
      scheduledTime: new Date(dbMatch.createdAt),
      startTime: dbMatch.score?.startTime ? new Date(dbMatch.score.startTime) : new Date(),
      matchFormat: dbMatch.matchFormat || 'best-of-3',
      createdAt: new Date(dbMatch.createdAt),
      updatedAt: new Date(dbMatch.updatedAt)
    };

    console.log('🎾 Opening scoring dialog with database match:', matchDetails);

    // Add to live scoring service
    this.scoringService.addMatchToLiveMatches(matchDetails);
    
    // Open scoring dialog
    this.openScoringDialog(matchDetails);
  }

  private convertDatabaseScore(dbScore: any): any {
    if (!dbScore) return this.initializeScore();

    return {
      player1Points: dbScore.team1Points || 0,
      player2Points: dbScore.team2Points || 0,
      player1Games: dbScore.team1Games || 0,
      player2Games: dbScore.team2Games || 0,
      player1Sets: dbScore.team1Sets || 0,
      player2Sets: dbScore.team2Sets || 0,
      currentSet: dbScore.currentSet || 1,
      sets: dbScore.sets?.map((set: any) => ({
        setNumber: set.setNumber,
        player1Games: set.team1Games || 0,
        player2Games: set.team2Games || 0,
        isTiebreak: set.isTiebreak || false,
        isCompleted: set.isCompleted || false
      })) || [{
        setNumber: 1,
        player1Games: 0,
        player2Games: 0,
        isTiebreak: false,
        isCompleted: false
      }],
      isDeuce: dbScore.isDeuce || false,
      advantage: dbScore.advantage === 'team1' ? 'player1' : 
                 dbScore.advantage === 'team2' ? 'player2' : null,
      isMatchPoint: dbScore.isMatchPoint || false,
      isSetPoint: dbScore.isSetPoint || false,
      winner: dbScore.winner === 'team1' ? 'player1' : 
              dbScore.winner === 'team2' ? 'player2' : undefined
    };
  }

  private initializeScore() {
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
      isSetPoint: false
    };
  }

  private openScoringDialog(matchDetails: any): void {
    // Import the dialog component dynamically and open it
    import('../../scoring/live-scoring-dialog/live-scoring-dialog.component').then(module => {
      const dialogRef = this.dialog.open(module.LiveScoringDialogComponent, {
        width: '90vw',
        maxWidth: '1200px',
        height: '90vh',
        data: { match: matchDetails },
        disableClose: false
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && result.completed) {
          // Update the bracket with match results
          this.updateMatchResult(result.match);
        }
      });
    }).catch(error => {
      console.error('Error loading scoring dialog:', error);
      // Fallback: navigate to scoring page
      this.router.navigate(['/scoring'], { 
        queryParams: { matchId: matchDetails.matchId } 
      });
    });
  }

  updateMatchResult(completedMatch: any): void {
    if (!this.bracket || !completedMatch.score.winner) return;

    // Find the match in the bracket
    for (const round of this.bracket.rounds) {
      const match = round.matches.find(m => 
        m.roundNumber === completedMatch.roundNumber && 
        m.matchNumber === completedMatch.matchNumber
      );
      
      if (match) {
        // Update match with results
        match.status = 'completed';
        match.score = {
          player1Score: completedMatch.score.player1Sets,
          player2Score: completedMatch.score.player2Sets
        };
        
        // Set winner
        if (completedMatch.score.winner === 'player1') {
          match.winner = match.player1;
        } else {
          match.winner = match.player2;
        }

        // Advance winner to next round
        this.advanceWinnerToNextRound(match);
        
        // Save updated bracket
        this.saveBracketState();
        break;
      }
    }
  }

  private advanceWinnerToNextRound(completedMatch: BracketMatch): void {
    if (!this.bracket || !completedMatch.winner) return;

    const nextRoundNumber = completedMatch.roundNumber + 1;
    const nextMatchNumber = Math.ceil(completedMatch.matchNumber / 2);

    // Find the next match
    const nextRound = this.bracket.rounds.find(r => r.roundNumber === nextRoundNumber);
    if (!nextRound) {
      console.log('Tournament complete!');
      return;
    }

    const nextMatch = nextRound.matches.find(m => m.matchNumber === nextMatchNumber);
    if (!nextMatch) return;

    // Determine if winner goes to player1 or player2 slot
    const isPlayer1Slot = completedMatch.matchNumber % 2 === 1;
    
    if (isPlayer1Slot) {
      nextMatch.player1 = completedMatch.winner;
    } else {
      nextMatch.player2 = completedMatch.winner;
    }

    // Check if next match is ready to start
    if (nextMatch.player1 && nextMatch.player2) {
      nextMatch.status = 'pending';
    }
  }

  private saveBracketState(): void {
    if (this.bracket && this.tournamentName) {
      const bracketData = {
        bracket: this.bracket,
        tournament: { name: this.tournamentName },
        generatedAt: new Date().toISOString()
      };
      localStorage.setItem('currentBracket', JSON.stringify(bracketData));
    }
  }

  getPlayerDisplayName(player: any): string {
    if (!player?.name) return '';
    
    // Check if player has ranking information
    if (player.ranking) {
      return `${player.name} (Rank #${player.ranking})`;
    }
    
    return player.name;
  }

  getPlayerDisplayNameWithSeed(player: any): string {
    if (!player?.name) return '';
    
    // Check if this is a team (already formatted with player names)
    if (player.skillLevel === 'team' || player.isTeam || player.name.includes('/')) {
      // For teams, show team name with team seed number
      if (player.seed) {
        return `${player.name} (${player.seed})`;
      }
      return player.name;
    }
    
    // For individual players, display name with seed number after the name
    if (player.seed) {
      return `${player.name} (${player.seed})`;
    }
    
    return player.name;
  }

  // Force consistent content for bracket display
  getDisplayName(player: any): string {
    if (!player || !player.name) {
      return 'To Be Determined'; // Longer text like the player names
    }
    return this.getPlayerDisplayNameWithSeed(player);
  }

  getDisplayScore(score: any, playerKey: string): string {
    if (!score || !score[playerKey]) {
      return ''; // Always return empty string for consistency
    }
    return score[playerKey].toString();
  }

  private addMatchToLiveScoring(matchDetails: any): void {
    console.log('🏓 Adding match to live scoring system...', matchDetails.matchId);
    console.log('🎾 Match details:', matchDetails);
    console.log('📊 ScoringService instance:', this.scoringService);
    
    // Use the proper public method from ScoringService
    this.scoringService.addMatchToLiveMatches(matchDetails);
    
    console.log('✅ Match added to live scoring service');
    
    // Also emit a console message to help debugging
    setTimeout(() => {
      console.log('🔍 Checking ScoringService live matches after 1 second...');
      const currentMatches = this.scoringService['liveMatchesSubject']?.value || [];
      console.log('📊 Current live matches in service:', currentMatches.length);
      if (currentMatches.length > 0) {
        console.log('📋 Live matches:', currentMatches.map(m => ({ 
          id: m.matchId, 
          players: `${m.player1Name} vs ${m.player2Name}` 
        })));
      }
    }, 1000);
  }

  openFinalScoreDialog(match: BracketMatch): void {
    // Only allow scoring if both players are present
    if (!match.player1?.name || !match.player2?.name || 
        match.player1?.name === 'TBD' || match.player2?.name === 'TBD') {
      this.snackBar.open('Cannot enter score: Both players must be determined first', 'Close', { duration: 3000 });
      return;
    }

    // Import the dialog component dynamically and open it
    import('../final-score-dialog/final-score-dialog.component').then(module => {
      const dialogRef = this.dialog.open(module.FinalScoreDialogComponent, {
        width: '600px',
        maxWidth: '95vw',
        data: { 
          match: match,
          tournamentId: this.tournamentId,
          gameFormat: this.gameFormat
        },
        disableClose: false
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('💾 Final score result:', result);
          this.updateMatchWithFinalScore(match, result);
        }
      });
    }).catch(error => {
      console.error('Error loading final score dialog:', error);
      this.snackBar.open('Error opening score entry form', 'Close', { duration: 3000 });
    });
  }

  private updateMatchWithFinalScore(match: BracketMatch, result: any): void {
    // Update the match with the final score
    match.status = 'completed';
    match.score = {
      player1Score: result.finalScore.player1Score,
      player2Score: result.finalScore.player2Score
    };

    // Set the winner
    if (result.finalScore.winner === 'player1') {
      match.winner = match.player1;
    } else {
      match.winner = match.player2;
    }

    // Advance winner to next round if applicable
    this.advanceWinnerToNextRound(match);
    
    // Save updated bracket
    this.saveBracketState();

    console.log('✅ Match updated with final score:', match);
  }

  private loadDatabaseMatches(): void {
    if (!this.tournamentId || !this.bracket) {
      return;
    }

    console.log('🔍 Loading database matches for tournament:', this.tournamentId);

    // Get all matches for this tournament from the database
    this.http.get(`${environment.apiUrl}/api/matches/${this.tournamentId}`).subscribe({
      next: (response: any) => {
        const databaseMatches = response.data || [];
        console.log('📊 Found database matches:', databaseMatches.length);
        
        if (databaseMatches.length > 0) {
          this.mergeDatabaseMatchesWithBracket(databaseMatches);
        }
      },
      error: (error) => {
        console.log('⚠️ Could not load database matches:', error);
      }
    });
  }

  private mergeDatabaseMatchesWithBracket(databaseMatches: any[]): void {
    if (!this.bracket?.rounds) {
      return;
    }

    console.log('🔧 Merging database matches with bracket display');
    console.log('📋 Database matches to merge:', databaseMatches.map(m => `Round ${m.round}, Match ${m.matchNumber}, Status: ${m.status}`));

    // Update bracket matches with database match results
    for (const round of this.bracket.rounds) {
      console.log(`🎯 Checking Round ${round.roundNumber} with ${round.matches.length} matches`);
      for (const bracketMatch of round.matches) {
        console.log(`🔍 Looking for database match: Round ${bracketMatch.roundNumber}, Match ${bracketMatch.matchNumber}`);
        console.log(`👥 Bracket match players: P1=${bracketMatch.player1?.name || 'TBD'}, P2=${bracketMatch.player2?.name || 'TBD'}`);
        
        // Find corresponding database match
        const dbMatch = databaseMatches.find((m: any) => 
          m.round === bracketMatch.roundNumber && m.matchNumber === bracketMatch.matchNumber
        );
        
        if (dbMatch) {
          console.log(`✅ Found DB match: Round ${dbMatch.round}, Match ${dbMatch.matchNumber}, Status: ${dbMatch.status}, Has Score: ${!!dbMatch.score?.tennisScore}`);
        } else {
          console.log(`❌ No DB match found for Round ${bracketMatch.roundNumber}, Match ${bracketMatch.matchNumber}`);
        }

        if (dbMatch && dbMatch.status === 'completed' && dbMatch.score?.tennisScore) {
          console.log(`✅ Found completed database match for Round ${bracketMatch.roundNumber}, Match ${bracketMatch.matchNumber}`);
          
          const tennisScore = dbMatch.score.tennisScore;
          
          // Update bracket match with database results
          bracketMatch.status = 'completed';
          
          // Set scores based on game format
          if (this.gameFormat === 'tiebreak-8' || this.gameFormat === 'tiebreak-10') {
            // For tiebreak formats, use games as the score
            bracketMatch.score = {
              player1Score: tennisScore.team1Games || 0,
              player2Score: tennisScore.team2Games || 0
            };
          } else {
            // For regular tennis, use sets as the score
            bracketMatch.score = {
              player1Score: tennisScore.team1Sets || 0,
              player2Score: tennisScore.team2Sets || 0
            };
          }

          // Set winner
          if (tennisScore.winner === 'team1') {
            bracketMatch.winner = bracketMatch.player1;
          } else if (tennisScore.winner === 'team2') {
            bracketMatch.winner = bracketMatch.player2;
          }

          console.log(`📊 Updated bracket match: ${bracketMatch.score.player1Score}-${bracketMatch.score.player2Score}, Winner: ${bracketMatch.winner?.name}`);
        }
      }
    }

    console.log('✅ Finished merging database matches with bracket');
  }

  regenerateBracket(): void {
    if (!this.tournamentId) {
      this.snackBar.open('No tournament ID available', 'Close', { duration: 3000 });
      return;
    }

    const confirmMessage = 'Are you sure you want to regenerate the bracket? This will delete the current bracket and all match scores.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    console.log('🔄 Regenerating bracket for tournament:', this.tournamentId);

    // Navigate to bracket generation with the current tournament
    this.router.navigate(['/brackets/generate'], {
      queryParams: { tournamentId: this.tournamentId }
    });
  }

}