import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ScoringService } from '../../../services/scoring.service';
import { BracketService } from '../../../services/bracket.service';
import { MatchDetails, TennisScore } from '../../../models/scoring.model';

@Component({
  selector: 'app-match-scorer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="match-scorer-container" *ngIf="match">
      <!-- Match Header -->
      <div class="match-header">
        <div class="match-info">
          <h1>{{ getPlayerName(match.player1) }} vs {{ getPlayerName(match.player2) }}</h1>
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
        </div>
      </div>

      <!-- Simple Score Entry Form -->
      <div class="score-entry-section" *ngIf="match.status === 'in-progress' || match.status === 'scheduled'">
        <mat-card class="score-entry-card">
          <mat-card-header>
            <mat-card-title>Enter Final Score</mat-card-title>
            <mat-card-subtitle>{{ getPlayerName(match.player1) }} vs {{ getPlayerName(match.player2) }}</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="simple-score-form">
              <div class="score-input-row">
                <div class="player-section">
                  <label class="player-label">{{ getPlayerName(match.player1) }}</label>
                  <mat-form-field appearance="outline" class="score-field">
                    <input matInput 
                           type="number" 
                           [(ngModel)]="finalScore.team1Score" 
                           min="0" 
                           max="50"
                           placeholder="0">
                  </mat-form-field>
                </div>
                
                <div class="score-separator">-</div>
                
                <div class="player-section">
                  <label class="player-label">{{ getPlayerName(match.player2) }}</label>
                  <mat-form-field appearance="outline" class="score-field">
                    <input matInput 
                           type="number" 
                           [(ngModel)]="finalScore.team2Score" 
                           min="0" 
                           max="50"
                           placeholder="0">
                  </mat-form-field>
                </div>
              </div>
              
              <div class="format-info">
                <span class="format-label">{{ formatGameFormat(match.gameFormat || 'regular') }}</span>
              </div>
            </div>
          </mat-card-content>
          
          <mat-card-actions class="simple-actions">
            <button mat-raised-button 
                    color="primary" 
                    (click)="submitFinalScore()"
                    [disabled]="!isValidScore()">
              <mat-icon>save</mat-icon>
              Save Score
            </button>
            
            <button mat-button (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Back
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Match Complete -->
      <div class="match-complete" *ngIf="match.status === 'completed' && !isEditingScore">
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
              
              <button mat-button color="warn" (click)="editScore()">
                <mat-icon>edit</mat-icon>
                Edit Score
              </button>
              
              <button mat-button (click)="viewMatchDetails()">
                <mat-icon>assessment</mat-icon>
                View Full Details
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Edit Score for Completed Match -->
      <div class="score-edit-section" *ngIf="match.status === 'completed' && isEditingScore">
        <mat-card class="score-entry-card">
          <mat-card-header>
            <mat-card-title>Edit Final Score</mat-card-title>
            <mat-card-subtitle>{{ formatGameFormat(match.gameFormat || 'regular') }} Match - Current: {{ formatFinalScore() }}</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="score-entry-form">
              <!-- Player 1 Score -->
              <div class="player-score-section">
                <h3>{{ getPlayerName(match.player1) }}</h3>
                <div class="score-input-group">
                  <mat-form-field appearance="outline" class="score-input">
                    <mat-label>Score</mat-label>
                    <input matInput 
                           type="number" 
                           [(ngModel)]="finalScore.team1Score" 
                           min="0" 
                           max="50"
                           placeholder="e.g., 10">
                  </mat-form-field>
                </div>
              </div>
              
              <!-- VS Indicator -->
              <div class="vs-separator">
                <span class="vs-text">VS</span>
              </div>
              
              <!-- Player 2 Score -->
              <div class="player-score-section">
                <h3>{{ getPlayerName(match.player2) }}</h3>
                <div class="score-input-group">
                  <mat-form-field appearance="outline" class="score-input">
                    <mat-label>Score</mat-label>
                    <input matInput 
                           type="number" 
                           [(ngModel)]="finalScore.team2Score" 
                           min="0" 
                           max="50"
                           placeholder="e.g., 9">
                  </mat-form-field>
                </div>
              </div>
            </div>
            
            <!-- Score Examples -->
            <div class="score-examples">
              <p><strong>Examples:</strong></p>
              <ul>
                <li *ngIf="match.gameFormat === 'tiebreak-10'">10-game tiebreak: 10-8, 10-7, 12-10</li>
                <li *ngIf="match.gameFormat === 'tiebreak-8'">8-game tiebreak: 8-6, 8-5, 9-7</li>
                <li *ngIf="match.gameFormat === 'regular'">Regular set: 6-4, 6-3, 7-5</li>
              </ul>
            </div>
          </mat-card-content>
          
          <mat-card-actions class="score-actions">
            <button mat-raised-button 
                    color="primary" 
                    (click)="updateFinalScore()"
                    [disabled]="!isValidScore()">
              <mat-icon>save</mat-icon>
              Update Score
            </button>
            
            <button mat-button (click)="cancelEdit()">
              <mat-icon>close</mat-icon>
              Cancel
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
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

    .score-entry-section {
      margin-bottom: 24px;
      
      .score-entry-card {
        max-width: 600px;
        margin: 0 auto;
        
        .simple-score-form {
          padding: 24px 0;
          
          .score-input-row {
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 20px;
            margin-bottom: 24px;
            
            .player-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              
              .player-label {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--primary-color);
                text-align: center;
                max-width: 150px;
                word-wrap: break-word;
              }
              
              .score-field {
                width: 80px;
                
                input {
                  text-align: center;
                  font-size: 2rem;
                  font-weight: 600;
                  padding: 12px;
                }
              }
            }
            
            .score-separator {
              font-size: 2rem;
              font-weight: 600;
              color: var(--primary-color);
              margin-bottom: 8px;
            }
          }
          
          .format-info {
            text-align: center;
            
            .format-label {
              background: #f5f5f5;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 0.9rem;
              color: var(--text-secondary);
            }
          }
        }
        
        .simple-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
          padding-top: 16px;
          
          button {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            min-width: 120px;
          }
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
  finalScore = {
    team1Score: 0,
    team2Score: 0
  };
  isEditingScore = false;

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
        
        // Reset final score form and load current scores if any
        this.loadCurrentScores();
      },
      error: (error) => {
        console.error('Error loading match:', error);
      }
    });
  }


  getPlayerName(player: any): string {
    if (!player) return 'Player';
    
    // Check multiple possible fields for the name
    if (player.name) return player.name;
    if (player.displayName) return player.displayName;
    if (typeof player === 'string') return player;
    
    return 'Player';
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

  submitFinalScore(): void {
    if (!this.match || !this.isValidScore()) return;

    const winner = this.finalScore.team1Score > this.finalScore.team2Score ? 'team1' : 'team2';
    
    const submitData = {
      gameFormat: this.match.gameFormat,
      finalScore: {
        team1Games: this.finalScore.team1Score,
        team2Games: this.finalScore.team2Score,
        winner: winner
      },
      status: 'completed'
    };
    
    console.log('🎾 Submitting final score:', {
      matchId: this.match.matchId,
      data: submitData,
      finalScore: this.finalScore
    });
    
    // Use the existing final score API endpoint
    this.scoringService.submitFinalScore(this.match.matchId, submitData).subscribe({
      next: (response) => {
        console.log('✅ Final score submitted successfully:', response);
        if (response.data) {
          this.match = response.data;
          console.log('✅ Updated match data:', this.match);
          
          // Force reload match data from backend to ensure we have the latest
          if (this.match?.matchId) {
            this.loadMatch(this.match.matchId);
          }
          
          // Show completion message
          this.showMatchCompleteDialog();
        }
      },
      error: (error) => {
        console.error('❌ Error submitting final score:', error);
        console.error('❌ Error details:', error.error);
        alert('Error submitting final score. Please try again.');
      }
    });
  }

  isValidScore(): boolean {
    const score1 = this.finalScore.team1Score;
    const score2 = this.finalScore.team2Score;
    
    // Basic validation: scores must be non-negative and different
    if (score1 < 0 || score2 < 0 || score1 === score2) {
      return false;
    }
    
    // Allow any valid final score - keep it simple
    return score1 >= 0 && score2 >= 0 && score1 !== score2;
  }

  cancelMatch(): void {
    if (!this.match) return;
    
    // Reset match status to scheduled
    this.match.status = 'scheduled';
    this.finalScore = {
      team1Score: 0,
      team2Score: 0
    };
  }

  goBack(): void {
    // Navigate back to tournament management
    if (this.match?.tournamentId) {
      this.router.navigate(['/tournaments', this.match.tournamentId, 'manage'], {
        fragment: 'schedule'
      });
    } else {
      this.router.navigate(['/tournaments']);
    }
  }

  editScore(): void {
    if (!this.match || !this.match.score) return;
    
    // Load current scores into the form
    const tennisScore = this.match.score;
    if (tennisScore.sets && tennisScore.sets.length > 0) {
      const currentSet = tennisScore.sets[0];
      this.finalScore = {
        team1Score: currentSet.player1Games || tennisScore.player1Games || 0,
        team2Score: currentSet.player2Games || tennisScore.player2Games || 0
      };
    } else {
      this.finalScore = {
        team1Score: tennisScore.player1Games || 0,
        team2Score: tennisScore.player2Games || 0
      };
    }
    
    this.isEditingScore = true;
  }

  updateFinalScore(): void {
    if (!this.match || !this.isValidScore()) return;

    const winner = this.finalScore.team1Score > this.finalScore.team2Score ? 'team1' : 'team2';
    
    // Use the existing final score API endpoint
    this.scoringService.submitFinalScore(this.match.matchId, {
      gameFormat: this.match.gameFormat,
      finalScore: {
        team1Games: this.finalScore.team1Score,
        team2Games: this.finalScore.team2Score,
        winner: winner
      },
      status: 'completed'
    }).subscribe({
      next: (response) => {
        console.log('Final score updated successfully:', response);
        this.match = response.data;
        this.isEditingScore = false;
        
        // Show success message
        alert('Score updated successfully!');
      },
      error: (error) => {
        console.error('Error updating final score:', error);
        alert('Error updating final score. Please try again.');
      }
    });
  }

  cancelEdit(): void {
    this.isEditingScore = false;
    // Reset form
    this.finalScore = {
      team1Score: 0,
      team2Score: 0
    };
  }

  loadCurrentScores(): void {
    if (!this.match || !this.match.score) {
      this.finalScore = {
        team1Score: 0,
        team2Score: 0
      };
      return;
    }
    
    const tennisScore = this.match.score;
    
    // Load current scores if they exist
    if (tennisScore.sets && tennisScore.sets.length > 0) {
      const currentSet = tennisScore.sets[0];
      this.finalScore = {
        team1Score: currentSet.player1Games || tennisScore.player1Games || 0,
        team2Score: currentSet.player2Games || tennisScore.player2Games || 0
      };
    } else {
      this.finalScore = {
        team1Score: tennisScore.player1Games || 0,
        team2Score: tennisScore.player2Games || 0
      };
    }
  }

  hasCurrentScore(): boolean {
    if (!this.match || !this.match.score) return false;
    
    const tennisScore = this.match.score;
    return (tennisScore.player1Games > 0 || tennisScore.player2Games > 0);
  }

  getCurrentScoreDisplay(): string {
    if (!this.match || !this.match.score) return '';
    
    const tennisScore = this.match.score;
    return `${tennisScore.player1Games || 0} - ${tennisScore.player2Games || 0}`;
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

  getWinnerName(): string {
    if (!this.match?.score.winner) return '';
    
    return this.match.score?.winner === 'player1' 
      ? this.match.player1?.name || 'Player 1'
      : this.match.player2?.name || 'Player 2';
  }

  formatFinalScore(): string {
    if (!this.match || !this.match.score) return '';
    
    console.log('🔍 Formatting final score from match:', {
      match: this.match,
      score: this.match.score,
      sets: this.match.score.sets
    });
    
    // For simplified scoring, show the final game scores
    const tennisScore = this.match.score;
    if (tennisScore.sets && tennisScore.sets.length > 0) {
      const finalSet = tennisScore.sets[0];
      console.log('🎾 Using set score:', finalSet);
      return `${finalSet.player1Games}-${finalSet.player2Games}`;
    }
    
    console.log('🎾 Using game score:', `${tennisScore.player1Games}-${tennisScore.player2Games}`);
    return `${tennisScore.player1Games}-${tennisScore.player2Games}`;
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