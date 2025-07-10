import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ScoringService } from '../../../services/scoring.service';
import { BracketService } from '../../../services/bracket.service';
import { MatchDetails, TennisScore } from '../../../models/scoring.model';

@Component({
  selector: 'app-match-scorer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule
  ],
  template: `
    <div class="match-scorer-container" *ngIf="match">
      <!-- Match Header -->
      <div class="match-header">
        <div class="match-info">
          <h1>{{ match.player1.name || 'Player 1' }} vs {{ match.player2.name || 'Player 2' }}</h1>
          <div class="match-meta">
            <span class="court">{{ match.court || 'Center Court' }}</span>
            <span class="format">{{ match.matchFormat | titlecase }}</span>
            <span class="game-format">{{ formatGameFormat(match.gameFormat || 'regular') }}</span>
            <span class="status" [class]="'status-' + match.status">{{ match.status | titlecase }}</span>
          </div>
        </div>
        
        <div class="match-controls">
          <button mat-raised-button color="primary" 
                  *ngIf="match.status === 'scheduled'"
                  (click)="startMatch()">
            <mat-icon>play_arrow</mat-icon>
            Start Match
          </button>
          
          <button mat-raised-button color="warn" 
                  *ngIf="match.status === 'in-progress'"
                  (click)="pauseMatch()">
            <mat-icon>pause</mat-icon>
            Pause
          </button>
          
          <button mat-raised-button color="accent" 
                  *ngIf="match.status === 'suspended'"
                  (click)="resumeMatch()">
            <mat-icon>play_arrow</mat-icon>
            Resume
          </button>
        </div>
      </div>

      <!-- Main Scoreboard -->
      <mat-card class="scoreboard-card">
        <div class="scoreboard">
          <!-- Header Row -->
          <div class="score-header">
            <div class="player-header">Player</div>
            <div class="sets-header">
              <span *ngFor="let set of match.score.sets; let i = index" class="set-header">
                Set {{ i + 1 }}
              </span>
            </div>
            <div class="points-header">Points</div>
          </div>

          <!-- Player 1 Row -->
          <div class="player-row" [class.winner]="match.score.winner === 'player1'">
            <div class="player-info">
              <div class="player-name">
                <mat-icon *ngIf="isServing('player1')" class="serving-icon">sports_tennis</mat-icon>
                {{ match.player1.name || 'Player 1' }}
                <span class="seed" *ngIf="match.player1.seed">({{ match.player1.seed }})</span>
              </div>
            </div>
            
            <div class="sets-scores">
              <div *ngFor="let set of match.score.sets; let i = index" 
                   class="set-score" 
                   [class.current-set]="i === match.score.currentSet - 1">
                {{ set.player1Games }}
                <span *ngIf="set.player1Tiebreak !== undefined" class="tiebreak">
                  <sup>{{ set.player1Tiebreak }}</sup>
                </span>
              </div>
            </div>
            
            <div class="current-points">
              {{ formatCurrentPoints('player1') }}
            </div>
          </div>

          <!-- Player 2 Row -->
          <div class="player-row" [class.winner]="match.score.winner === 'player2'">
            <div class="player-info">
              <div class="player-name">
                <mat-icon *ngIf="isServing('player2')" class="serving-icon">sports_tennis</mat-icon>
                {{ match.player2.name || 'Player 2' }}
                <span class="seed" *ngIf="match.player2.seed">({{ match.player2.seed }})</span>
              </div>
            </div>
            
            <div class="sets-scores">
              <div *ngFor="let set of match.score.sets; let i = index" 
                   class="set-score" 
                   [class.current-set]="i === match.score.currentSet - 1">
                {{ set.player2Games }}
                <span *ngIf="set.player2Tiebreak !== undefined" class="tiebreak">
                  <sup>{{ set.player2Tiebreak }}</sup>
                </span>
              </div>
            </div>
            
            <div class="current-points">
              {{ formatCurrentPoints('player2') }}
            </div>
          </div>
        </div>

        <!-- Match Status Indicators -->
        <div class="match-indicators" *ngIf="match.status === 'in-progress'">
          <mat-chip *ngIf="match.score.isMatchPoint" color="warn" selected>
            <mat-icon>warning</mat-icon>
            Match Point
          </mat-chip>
          <mat-chip *ngIf="match.score.isSetPoint && !match.score.isMatchPoint" color="accent" selected>
            <mat-icon>flag</mat-icon>
            Set Point
          </mat-chip>
          <mat-chip *ngIf="match.score.isDeuce" color="primary" selected>
            <mat-icon>balance</mat-icon>
            Deuce
          </mat-chip>
          <mat-chip *ngIf="match.score.advantage" color="primary" selected>
            <mat-icon>trending_up</mat-icon>
            Advantage {{ getAdvantagePlayer() }}
          </mat-chip>
        </div>
      </mat-card>

      <!-- Scoring Buttons -->
      <div class="scoring-section" *ngIf="match.status === 'in-progress'">
        <div class="scoring-buttons">
          <button mat-fab 
                  color="primary" 
                  class="score-button player1-button"
                  (click)="awardPoint('player1')"
                  [disabled]="match.status !== 'in-progress'">
            <div class="button-content">
              <span class="player-initial">{{ getPlayerInitial(match.player1.name || 'P1') }}</span>
            </div>
          </button>

          <div class="vs-indicator">
            <div class="current-game">
              <span class="game-label">Current Game</span>
              <div class="game-score">
                {{ formatCurrentPoints('player1') }} - {{ formatCurrentPoints('player2') }}
              </div>
            </div>
          </div>

          <button mat-fab 
                  color="primary" 
                  class="score-button player2-button"
                  (click)="awardPoint('player2')"
                  [disabled]="match.status !== 'in-progress'">
            <div class="button-content">
              <span class="player-initial">{{ getPlayerInitial(match.player2.name || 'P2') }}</span>
            </div>
          </button>
        </div>

        <!-- Additional Controls -->
        <div class="additional-controls">
          <button mat-button color="warn" (click)="undoLastPoint()" [disabled]="!canUndo">
            <mat-icon>undo</mat-icon>
            Undo Last Point
          </button>
          
          <button mat-button (click)="correctScore()">
            <mat-icon>edit</mat-icon>
            Correct Score
          </button>
          
          <button mat-button color="accent" (click)="switchServer()">
            <mat-icon>sync_alt</mat-icon>
            Switch Server
          </button>
        </div>
      </div>

      <!-- Match Complete -->
      <div class="match-complete" *ngIf="match.status === 'completed'">
        <mat-card class="winner-card">
          <mat-card-content>
            <div class="winner-announcement">
              <mat-icon class="trophy-icon">emoji_events</mat-icon>
              <h2>Match Complete!</h2>
              <h3>Winner: {{ getWinnerName() }}</h3>
              <p class="final-score">Final Score: {{ formatFinalScore() }}</p>
            </div>
            
            <div class="match-actions">
              <button mat-raised-button color="primary" (click)="advanceTournament()">
                <mat-icon>fast_forward</mat-icon>
                Advance Tournament
              </button>
              
              <button mat-button (click)="viewMatchDetails()">
                <mat-icon>assessment</mat-icon>
                View Full Details
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Match Statistics -->
      <mat-card class="stats-card">
        <mat-card-header>
          <mat-card-title>Match Statistics</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Duration</span>
              <span class="stat-value">{{ getMatchDuration() }}</span>
            </div>
            
            <div class="stat-item">
              <span class="stat-label">Total Points</span>
              <span class="stat-value">{{ getTotalPoints() }}</span>
            </div>
            
            <div class="stat-item">
              <span class="stat-label">Current Set</span>
              <span class="stat-value">{{ match.score.currentSet }}</span>
            </div>
            
            <div class="stat-item">
              <span class="stat-label">Games Played</span>
              <span class="stat-value">{{ getTotalGames() }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- Loading State -->
    <div class="loading-state" *ngIf="!match">
      <mat-icon class="loading-icon">sports_tennis</mat-icon>
      <h2>Loading Match...</h2>
      <p>Please wait while we load the match details.</p>
    </div>
  `,
  styles: [`
    .match-scorer-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    .match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 24px;
      background: linear-gradient(135deg, var(--primary-color) 0%, #4caf50 100%);
      color: white;
      border-radius: 12px;

      .match-info {
        h1 {
          font-size: 2rem;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        .match-meta {
          display: flex;
          gap: 16px;
          font-size: 0.9rem;
          opacity: 0.9;

          .court, .format, .game-format, .status {
            padding: 4px 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
          }

          .game-format {
            background: rgba(255,193,7,0.3);
            color: #fff3c4;
            font-weight: 600;
          }
        }
      }

      .match-controls {
        display: flex;
        gap: 12px;

        button {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
    }

    .scoreboard-card {
      margin-bottom: 24px;
      overflow: hidden;
    }

    .scoreboard {
      .score-header {
        display: grid;
        grid-template-columns: 2fr 3fr 1fr;
        gap: 16px;
        padding: 16px;
        background: #f5f5f5;
        font-weight: 600;
        color: var(--text-primary);

        .sets-header {
          display: flex;
          gap: 16px;

          .set-header {
            flex: 1;
            text-align: center;
          }
        }

        .points-header {
          text-align: center;
        }
      }

      .player-row {
        display: grid;
        grid-template-columns: 2fr 3fr 1fr;
        gap: 16px;
        padding: 16px;
        border-bottom: 1px solid #e0e0e0;
        transition: all 0.3s ease;

        &.winner {
          background: #e8f5e8;
          border-left: 4px solid #4caf50;
          font-weight: 600;
        }

        .player-info {
          display: flex;
          align-items: center;

          .player-name {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.1rem;

            .serving-icon {
              color: var(--primary-color);
              font-size: 20px;
              height: 20px;
              width: 20px;
            }

            .seed {
              font-size: 0.9rem;
              color: var(--text-secondary);
            }
          }
        }

        .sets-scores {
          display: flex;
          gap: 16px;

          .set-score {
            flex: 1;
            text-align: center;
            font-size: 1.2rem;
            font-weight: 600;
            padding: 8px;
            border-radius: 4px;
            background: #f9f9f9;

            &.current-set {
              background: var(--primary-color);
              color: white;
            }

            .tiebreak {
              font-size: 0.8rem;
              margin-left: 2px;
            }
          }
        }

        .current-points {
          text-align: center;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--primary-color);
        }
      }
    }

    .match-indicators {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px;
      padding: 16px;
      background: #f9f9f9;

      mat-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;

        mat-icon {
          font-size: 16px;
          height: 16px;
          width: 16px;
        }
      }
    }

    .scoring-section {
      margin-bottom: 24px;

      .scoring-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 48px;
        margin-bottom: 24px;

        .score-button {
          width: 120px;
          height: 120px;
          font-size: 2rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          transition: all 0.3s ease;

          &:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
          }

          &:active {
            transform: scale(0.95);
          }

          .button-content {
            display: flex;
            flex-direction: column;
            align-items: center;

            .player-initial {
              font-size: 2.5rem;
              font-weight: 600;
            }
          }
        }

        .vs-indicator {
          text-align: center;

          .current-game {
            .game-label {
              display: block;
              font-size: 0.9rem;
              color: var(--text-secondary);
              margin-bottom: 4px;
            }

            .game-score {
              font-size: 1.5rem;
              font-weight: 600;
              color: var(--primary-color);
            }
          }
        }
      }

      .additional-controls {
        display: flex;
        justify-content: center;
        gap: 16px;
        flex-wrap: wrap;

        button {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
    }

    .match-complete {
      margin-bottom: 24px;

      .winner-card {
        text-align: center;
        background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c8 100%);

        .winner-announcement {
          margin-bottom: 24px;

          .trophy-icon {
            font-size: 4rem;
            height: 4rem;
            width: 4rem;
            color: #f57c00;
            margin-bottom: 16px;
          }

          h2 {
            font-size: 2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 8px 0;
          }

          h3 {
            font-size: 1.5rem;
            color: var(--primary-color);
            margin: 0 0 12px 0;
          }

          .final-score {
            font-size: 1.1rem;
            color: var(--text-secondary);
            margin: 0;
          }
        }

        .match-actions {
          display: flex;
          justify-content: center;
          gap: 16px;

          button {
            display: flex;
            align-items: center;
            gap: 8px;
          }
        }
      }
    }

    .stats-card {
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;

        .stat-item {
          text-align: center;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 8px;

          .stat-label {
            display: block;
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 4px;
          }

          .stat-value {
            font-size: 1.3rem;
            font-weight: 600;
            color: var(--primary-color);
          }
        }
      }
    }

    .loading-state {
      text-align: center;
      padding: 64px 24px;
      color: var(--text-secondary);

      .loading-icon {
        font-size: 4rem;
        height: 4rem;
        width: 4rem;
        color: var(--primary-color);
        margin-bottom: 16px;
        animation: spin 2s linear infinite;
      }

      h2 {
        font-size: 1.5rem;
        margin: 0 0 8px 0;
        color: var(--text-primary);
      }

      p {
        font-size: 1rem;
        margin: 0;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .match-header {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }

      .scoreboard .score-header,
      .scoreboard .player-row {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .scoring-buttons {
        flex-direction: column;
        gap: 24px;

        .score-button {
          width: 100px;
          height: 100px;
        }
      }

      .additional-controls {
        flex-direction: column;

        button {
          width: 100%;
        }
      }
    }
  `]
})
export class MatchScorerComponent implements OnInit {
  @Input() matchId?: string;

  match?: MatchDetails;
  canUndo = false;
  private currentServer: 'player1' | 'player2' = 'player1';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private scoringService: ScoringService,
    private bracketService: BracketService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Get match ID from route or input
    const routeMatchId = this.route.snapshot.paramMap.get('matchId');
    const targetMatchId = this.matchId || routeMatchId || 'match-1';
    
    this.loadMatch(targetMatchId);
  }

  private loadMatch(matchId: string): void {
    console.log('Loading match with ID:', matchId);
    this.scoringService.getMatchDetails(matchId).subscribe({
      next: (match) => {
        console.log('Match data received in component:', match);
        console.log('Player1 data:', match?.player1);
        console.log('Player2 data:', match?.player2);
        this.match = match;
      },
      error: (error) => {
        console.error('Error loading match:', error);
      }
    });
  }

  formatCurrentPoints(player: 'player1' | 'player2'): string {
    if (!this.match) return '0';
    
    const score = this.match.score;
    const points = player === 'player1' ? score.player1Points : score.player2Points;
    
    if (score.isDeuce) return 'DEUCE';
    if (score.advantage === player) return 'AD';
    if (score.advantage && score.advantage !== player && points >= 40) return '40';
    
    const pointStrings = ['0', '15', '30', '40'];
    return pointStrings[pointStrings.indexOf(points.toString())] || '0';
  }

  isServing(player: 'player1' | 'player2'): boolean {
    return this.currentServer === player;
  }

  getPlayerInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  getAdvantagePlayer(): string {
    if (!this.match?.score.advantage) return '';
    
    return this.match.score?.advantage === 'player1' 
      ? this.match.player1?.name || 'Player 1'
      : this.match.player2?.name || 'Player 2';
  }

  startMatch(): void {
    if (!this.match) return;
    
    // Call backend to start the match
    this.scoringService.startMatch(this.match.matchId).subscribe({
      next: (updatedMatch) => {
        this.match = updatedMatch.data;
        console.log('Match started successfully:', this.match);
      },
      error: (error) => {
        console.error('Error starting match:', error);
        // Fallback to local update if backend fails
        if (this.match) {
          this.match.status = 'in-progress';
          this.match.startTime = new Date();
        }
      }
    });
  }

  pauseMatch(): void {
    if (this.match) {
      this.match.status = 'suspended';
    }
  }

  resumeMatch(): void {
    if (this.match) {
      this.match.status = 'in-progress';
    }
  }

  awardPoint(player: 'player1' | 'player2'): void {
    if (!this.match) return;

    // Auto-start match if it's scheduled
    if (this.match.status === 'scheduled') {
      this.startMatch();
      // Wait a moment for the status to update, then proceed
      setTimeout(() => this.awardPointAfterStart(player), 100);
      return;
    }

    if (this.match.status !== 'in-progress') return;

    this.scoringService.updateScore(this.match.matchId, player).subscribe({
      next: (updatedMatch) => {
        this.match = updatedMatch;
        this.canUndo = true;
        
        // Check if match was just completed
        if (this.match?.status === 'completed' && this.match.score?.winner) {
          console.log('🎾 Match completed! Winner:', this.match.score.winner);
          // Small delay to ensure backend processing is complete
          setTimeout(() => {
            this.showMatchCompleteDialog();
          }, 1000);
        }
        
        // Switch server logic (simplified)
        if (this.match?.score) {
          const totalPoints = (this.match.score.player1Points || 0) + (this.match.score.player2Points || 0);
          if (totalPoints > 0 && totalPoints % 2 === 0) {
            this.switchServer();
          }
        }
      },
      error: (error) => {
        console.error('Error updating score:', error);
      }
    });
  }

  private awardPointAfterStart(player: 'player1' | 'player2'): void {
    if (!this.match || this.match.status !== 'in-progress') return;

    this.scoringService.updateScore(this.match.matchId, player).subscribe({
      next: (updatedMatch) => {
        this.match = updatedMatch;
        this.canUndo = true;
        
        // Switch server logic (simplified)
        if (this.match?.score) {
          const totalPoints = (this.match.score.player1Points || 0) + (this.match.score.player2Points || 0);
          if (totalPoints > 0 && totalPoints % 2 === 0) {
            this.switchServer();
          }
        }
      },
      error: (error) => {
        console.error('Error updating score:', error);
      }
    });
  }

  undoLastPoint(): void {
    console.log('Undo last point - not implemented in demo');
    this.canUndo = false;
  }

  correctScore(): void {
    console.log('Correct score - opening dialog');
    // In a real implementation, this would open a dialog to manually correct the score
  }

  switchServer(): void {
    this.currentServer = this.currentServer === 'player1' ? 'player2' : 'player1';
  }

  getWinnerName(): string {
    if (!this.match?.score.winner) return '';
    
    return this.match.score?.winner === 'player1' 
      ? this.match.player1?.name || 'Player 1'
      : this.match.player2?.name || 'Player 2';
  }

  formatFinalScore(): string {
    if (!this.match) return '';
    return this.scoringService.formatScoreString(this.match.score);
  }

  advanceTournament(): void {
    if (!this.match || !this.match.score?.winner) return;
    
    console.log('🏆 Tournament advancement requested with winner:', this.match.score?.winner);
    
    // Backend automatically handles advancement when match completes
    // Here we just refresh the bracket to show the updated state
    this.bracketService.getBracketAfterMatchCompletion(this.match.tournamentId).subscribe({
      next: (bracketResponse) => {
        console.log('✅ Bracket refreshed after match completion:', bracketResponse);
        
        // Show success message
        const winnerName = this.getWinnerName();
        const message = `🎾 Match Complete!\n\n🏆 Winner: ${winnerName}\n\n✅ Tournament bracket has been updated automatically!`;
        alert(message);
        
        // Navigate back to tournament bracket view
        this.router.navigate(['/tournaments', this.match?.tournamentId, 'manage']);
      },
      error: (error) => {
        console.error('❌ Error refreshing bracket after match:', error);
        alert('Match completed but there was an error refreshing the bracket. Please check the tournament view manually.');
      }
    });
  }

  viewMatchDetails(): void {
    console.log('Viewing match details');
    // Navigate to detailed match view
  }

  getMatchDuration(): string {
    if (!this.match?.startTime) return '--:--';
    
    const endTime = this.match.endTime || new Date();
    const diff = endTime.getTime() - this.match.startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  getTotalPoints(): number {
    if (!this.match) return 0;
    
    // Simplified calculation
    const score = this.match.score;
    return score.sets.reduce((total, set) => {
      return total + set.player1Games + set.player2Games;
    }, 0) * 4; // Approximate points per game
  }

  getTotalGames(): number {
    if (!this.match) return 0;
    
    return (this.match.score?.sets?.reduce((total, set) => {
      return total + set.player1Games + set.player2Games;
    }, 0) || 0) + (this.match.score?.player1Games || 0) + (this.match.score?.player2Games || 0);
  }

  formatGameFormat(gameFormat: string): string {
    switch (gameFormat) {
      case 'tiebreak-8':
        return '8-Game Tiebreak';
      case 'tiebreak-10':
        return '10-Game Tiebreak';
      case 'regular':
      default:
        return 'Regular';
    }
  }

  showMatchCompleteDialog(): void {
    const winnerName = this.getWinnerName();
    const finalScore = this.formatFinalScore();
    
    const message = `🎾 Match Complete!\n\n🏆 Winner: ${winnerName}\n📊 Final Score: ${finalScore}\n\n✅ Tournament bracket has been updated automatically!\n\nWould you like to view the updated bracket?`;
    
    if (confirm(message)) {
      // Navigate to tournament bracket
      this.router.navigate(['/tournaments', this.match?.tournamentId, 'brackets']);
    }
    // If they click "Cancel", they stay on the scoring page to review the completed match
  }
}