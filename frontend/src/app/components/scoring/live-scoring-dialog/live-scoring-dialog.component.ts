import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchDetails, TennisScore } from '../../../models/scoring.model';
import { ScoringService } from '../../../services/scoring.service';

interface DialogData {
  match: MatchDetails;
}

@Component({
  selector: 'app-live-scoring-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="live-scoring-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>Live Match Scoring</h2>
        <button mat-icon-button (click)="closeDialog()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <div class="match-info">
          <div class="match-header">
            <div class="players">
              {{ currentMatch.player1.name }} vs {{ currentMatch.player2.name }}
            </div>
            <div class="match-meta">
              <div class="match-status" [class]="'status-' + currentMatch.status">
                {{ currentMatch.status | titlecase }}
              </div>
              <div class="game-format">
                {{ getGameFormatDisplay() }}
              </div>
            </div>
          </div>
        </div>

        <div class="scoreboard">
          <!-- Player 1 -->
          <div class="player-section" [class.winner]="score.winner === 'player1'">
            <div class="player-info">
              <div class="player-name">{{ currentMatch.player1.name }}</div>
              <div class="player-seed" *ngIf="currentMatch.player1.seed">({{ currentMatch.player1.seed }})</div>
            </div>
            
            <div class="score-section">
              <!-- Sets Score (only for regular tennis) -->
              <div class="sets-score" *ngIf="isRegularTennis()">
                <div class="score-label">Sets</div>
                <div class="score-value">{{ score.player1Sets }}</div>
              </div>
              
              <!-- Games Score -->
              <div class="games-score">
                <div class="score-label">{{ getScoreLabel() }}</div>
                <div class="score-value">{{ score.player1Games }}</div>
              </div>
              
              <!-- Current Points (only for regular tennis) -->
              <div class="points-score" [class.serving]="isPlayer1Serving" *ngIf="isRegularTennis()">
                <div class="score-label">Points</div>
                <div class="score-value">{{ getPointsDisplay(score.player1Points, score.player2Points, true) }}</div>
              </div>
            </div>

            <div class="score-controls">
              <button mat-raised-button color="primary" 
                      (click)="addPoint('player1')" 
                      [disabled]="currentMatch.status !== 'in-progress' || score.winner">
                <mat-icon>add</mat-icon>
                Point
              </button>
              <button mat-button 
                      (click)="removePoint('player1')" 
                      [disabled]="true"
                      title="Undo functionality temporarily disabled">
                <mat-icon>remove</mat-icon>
                Undo
              </button>
            </div>
          </div>

          <div class="vs-divider">
            <span>VS</span>
          </div>

          <!-- Player 2 -->
          <div class="player-section" [class.winner]="score.winner === 'player2'">
            <div class="player-info">
              <div class="player-name">{{ currentMatch.player2.name }}</div>
              <div class="player-seed" *ngIf="currentMatch.player2.seed">({{ currentMatch.player2.seed }})</div>
            </div>
            
            <div class="score-section">
              <!-- Sets Score (only for regular tennis) -->
              <div class="sets-score" *ngIf="isRegularTennis()">
                <div class="score-label">Sets</div>
                <div class="score-value">{{ score.player2Sets }}</div>
              </div>
              
              <!-- Games Score -->
              <div class="games-score">
                <div class="score-label">{{ getScoreLabel() }}</div>
                <div class="score-value">{{ score.player2Games }}</div>
              </div>
              
              <!-- Current Points (only for regular tennis) -->
              <div class="points-score" [class.serving]="!isPlayer1Serving" *ngIf="isRegularTennis()">
                <div class="score-label">Points</div>
                <div class="score-value">{{ getPointsDisplay(score.player2Points, score.player1Points, false) }}</div>
              </div>
            </div>

            <div class="score-controls">
              <button mat-raised-button color="primary" 
                      (click)="addPoint('player2')" 
                      [disabled]="currentMatch.status !== 'in-progress' || score.winner">
                <mat-icon>add</mat-icon>
                Point
              </button>
              <button mat-button 
                      (click)="removePoint('player2')" 
                      [disabled]="true"
                      title="Undo functionality temporarily disabled">
                <mat-icon>remove</mat-icon>
                Undo
              </button>
            </div>
          </div>
        </div>

        <!-- Match Summary when completed -->
        <div class="match-summary" *ngIf="score.winner">
          <div class="summary-header">
            <mat-icon>emoji_events</mat-icon>
            <h3>Match Complete!</h3>
          </div>
          <div class="winner-info">
            <span class="winner-label">Winner:</span>
            <span class="winner-name">{{ getWinnerName() }}</span>
          </div>
          <div class="final-score">
            <span>Final Score: {{ getFinalScoreDisplay() }}</span>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="closeDialog()">Cancel</button>
        <button mat-button (click)="pauseMatch()" *ngIf="currentMatch.status === 'in-progress' && !score.winner">
          <mat-icon>pause</mat-icon>
          Pause
        </button>
        <button mat-button (click)="resumeMatch()" *ngIf="currentMatch.status === 'suspended'">
          <mat-icon>play_arrow</mat-icon>
          Resume
        </button>
        <button mat-raised-button color="primary" 
                (click)="completeMatch()" 
                [disabled]="!score.winner">
          <mat-icon>check_circle</mat-icon>
          Complete Match
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .live-scoring-dialog {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;

      h2 {
        margin: 0;
        color: var(--text-primary);
      }

      .close-button {
        color: var(--text-secondary);
      }
    }

    .dialog-content {
      flex: 1;
      padding: 24px !important;
      overflow-y: auto;
    }

    .match-info {
      margin-bottom: 24px;

      .match-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;

        .players {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .match-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
        }

        .match-status {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;

          &.status-in-progress {
            background: #fff3e0;
            color: #f57c00;
          }

          &.status-completed {
            background: #e8f5e8;
            color: #388e3c;
          }

          &.status-paused {
            background: #fce4ec;
            color: #c2185b;
          }
        }

        .game-format {
          padding: 2px 8px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 500;
          background: #e3f2fd;
          color: #1976d2;
        }
      }
    }

    .scoreboard {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 24px;
      align-items: center;
      margin-bottom: 24px;
    }

    .player-section {
      &.winner {
        background: #e8f5e8;
        border-radius: 8px;
        padding: 16px;
        border: 2px solid #4caf50;
      }

      .player-info {
        text-align: center;
        margin-bottom: 16px;

        .player-name {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--text-primary);
        }

        .player-seed {
          font-size: 0.9rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
      }

      .score-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;

        .sets-score, .games-score, .points-score {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 6px;

          .score-label {
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-weight: 500;
          }

          .score-value {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--primary-color);
          }
        }

        .points-score.serving {
          background: #e3f2fd;
          border: 1px solid #2196f3;

          .score-value {
            color: #1976d2;
          }
        }
      }

      .score-controls {
        display: flex;
        gap: 8px;
        justify-content: center;

        button {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 100px;
        }
      }
    }

    .vs-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-secondary);
      background: #f5f5f5;
      width: 60px;
      height: 60px;
      border-radius: 50%;
    }

    .match-summary {
      background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      border: 2px solid #4caf50;

      .summary-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-bottom: 16px;

        mat-icon {
          font-size: 2rem;
          width: 2rem;
          height: 2rem;
          color: #4caf50;
        }

        h3 {
          margin: 0;
          color: #2e7d32;
          font-size: 1.5rem;
        }
      }

      .winner-info {
        margin-bottom: 8px;
        font-size: 1.1rem;

        .winner-label {
          color: #388e3c;
          font-weight: 500;
        }

        .winner-name {
          color: #2e7d32;
          font-weight: 700;
          margin-left: 8px;
        }
      }

      .final-score {
        font-size: 1.2rem;
        color: #2e7d32;
        font-weight: 600;
      }
    }

    .dialog-actions {
      padding: 16px 24px !important;
      border-top: 1px solid #e0e0e0;
      gap: 12px;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    @media (max-width: 768px) {
      .scoreboard {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto 1fr;
        text-align: center;
      }

      .vs-divider {
        order: 2;
        margin: 16px auto;
      }
    }
  `]
})
export class LiveScoringDialogComponent implements OnInit {
  currentMatch: MatchDetails;
  score: TennisScore;
  isPlayer1Serving = true;
  pointHistory: Array<{player: 'player1' | 'player2', timestamp: Date}> = [];

  constructor(
    public dialogRef: MatDialogRef<LiveScoringDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private snackBar: MatSnackBar,
    private scoringService: ScoringService
  ) {
    this.currentMatch = { ...data.match };
    this.score = { ...data.match.score };
  }

  ngOnInit(): void {
    // Ensure match is in progress
    if (this.currentMatch.status === 'scheduled') {
      this.currentMatch.status = 'in-progress';
    }

    console.log('🎾 Dialog initialized for match:', this.currentMatch.matchId);
    console.log('🎮 Game format:', this.currentMatch.gameFormat || 'regular');
  }

  addPoint(player: 'player1' | 'player2'): void {
    if (this.score.winner) return;

    console.log(`🎯 Adding point for ${player}`);
    console.log('📊 Score before:', this.score);

    // Add to point history for undo functionality
    this.pointHistory.push({ player, timestamp: new Date() });

    // IMPORTANT: Don't update score locally - let the backend handle tennis scoring
    // Just save to database, which will trigger proper tennis score calculation
    this.saveScoreToDatabase(player);
    
    console.log('📊 Delegated scoring to backend API');
  }

  removePoint(player: 'player1' | 'player2'): void {
    // TODO: Implement undo functionality with backend API
    // For now, undo is disabled since all scoring is handled by the backend
    console.log('⚠️ Undo functionality is currently disabled - all scoring is handled by backend');
    return;
  }

  // NOTE: Game, set, and match win logic is now handled by the backend tennis scoring service
  // The frontend simply displays the scores returned from the backend API

  getPointsDisplay(playerPoints: number, opponentPoints: number, isPlayer1: boolean): string {
    const gameFormat = this.currentMatch.gameFormat || 'regular';
    
    // For tiebreak formats, just show the raw score (games)
    if (gameFormat === 'tiebreak-8' || gameFormat === 'tiebreak-10') {
      return playerPoints.toString();
    }
    
    // Regular tennis format
    // Handle deuce situations first
    if (this.score.isDeuce) {
      return 'Deuce';
    }
    
    // Handle advantage situations
    if (this.score.advantage) {
      if ((this.score.advantage === 'player1' && isPlayer1) || 
          (this.score.advantage === 'player2' && !isPlayer1)) {
        return 'Ad';
      } else {
        return '40';
      }
    }
    
    // Handle regular tennis point values (0, 15, 30, 40)
    switch (playerPoints) {
      case 0: return '0';
      case 15: return '15';
      case 30: return '30';
      case 40: return '40';
      default: return playerPoints.toString();
    }
  }

  getWinnerName(): string {
    if (this.score.winner === 'player1') {
      return this.currentMatch.player1.name;
    } else if (this.score.winner === 'player2') {
      return this.currentMatch.player2.name;
    }
    return 'Unknown';
  }

  getFinalScoreDisplay(): string {
    const sets = this.score.sets.map(set => 
      `${set.player1Games}-${set.player2Games}`
    ).join(', ');
    return `${this.score.player1Sets}-${this.score.player2Sets} (${sets})`;
  }

  pauseMatch(): void {
    this.currentMatch.status = 'suspended';
    this.snackBar.open('Match paused', 'Close', { duration: 2000 });
  }

  resumeMatch(): void {
    this.currentMatch.status = 'in-progress';
    this.snackBar.open('Match resumed', 'Close', { duration: 2000 });
  }

  completeMatch(): void {
    if (!this.score.winner) {
      this.snackBar.open('Match is not yet complete', 'Close', { duration: 3000 });
      return;
    }

    // Update match with final score
    this.currentMatch.score = this.score;
    this.currentMatch.status = 'completed';
    this.currentMatch.endTime = new Date();

    this.snackBar.open('Match completed successfully!', 'Close', { duration: 3000 });
    
    // Close dialog with match results
    this.dialogRef.close({
      completed: true,
      match: this.currentMatch
    });
  }

  closeDialog(): void {
    console.log('🚪 Closing dialog...');
    console.log('📊 Current match when closing:', this.currentMatch);
    console.log('📊 Current score when closing:', this.score);
    
    // Ensure the current match has the latest score
    this.currentMatch.score = this.score;
    
    const result = {
      completed: false,
      match: this.currentMatch
    };
    
    console.log('📤 Returning dialog result:', result);
    
    // Always return the current match state when closing
    this.dialogRef.close(result);
  }

  private updateMatchScore(): void {
    // Update current match score object
    this.currentMatch.score = this.score;
    console.log('🔄 Match score updated successfully');
  }

  private saveScoreToDatabase(pointWinnerPlayer?: 'player1' | 'player2'): void {
    // If this is a test match, don't try to save to database
    if (this.currentMatch.matchId.startsWith('test-match') || this.currentMatch.matchId.startsWith('real-match')) {
      console.log('📝 Skipping database save for test match');
      return;
    }

    console.log('💾 Saving score to database...');
    
    // Determine which player/team won the point (for backend API)
    let pointWinner: 'team1' | 'team2' = 'team1';
    
    if (pointWinnerPlayer) {
      // Use the directly passed parameter
      pointWinner = pointWinnerPlayer === 'player1' ? 'team1' : 'team2';
    } else {
      // Fallback to point history check (for other calls to this method)
      const lastPoint = this.pointHistory[this.pointHistory.length - 1];
      if (lastPoint) {
        pointWinner = lastPoint.player === 'player1' ? 'team1' : 'team2';
      }
    }

    // Use the scoring service to update the score in database
    this.scoringService.updateScore(this.currentMatch.matchId, pointWinner === 'team1' ? 'player1' : 'player2').subscribe({
      next: (response) => {
        console.log('✅ Score saved to database:', response);
        
        // Update local score from backend response to maintain synchronization
        if (response.data && response.data.score && response.data.score.tennisScore) {
          const backendScore = response.data.score.tennisScore;
          
          // Convert backend score format to frontend format
          this.score = {
            player1Points: backendScore.team1Points,
            player2Points: backendScore.team2Points,
            player1Games: backendScore.team1Games,
            player2Games: backendScore.team2Games,
            player1Sets: backendScore.team1Sets,
            player2Sets: backendScore.team2Sets,
            currentSet: backendScore.currentSet,
            sets: backendScore.sets?.map((set: any) => ({
              setNumber: set.setNumber,
              player1Games: set.team1Games,
              player2Games: set.team2Games,
              player1Tiebreak: set.team1Tiebreak,
              player2Tiebreak: set.team2Tiebreak,
              isTiebreak: set.isTiebreak,
              isCompleted: set.isCompleted
            })) || [],
            isDeuce: backendScore.isDeuce,
            advantage: backendScore.advantage === 'team1' ? 'player1' : 
                      backendScore.advantage === 'team2' ? 'player2' : null,
            isMatchPoint: backendScore.isMatchPoint,
            isSetPoint: backendScore.isSetPoint,
            winner: backendScore.winner === 'team1' ? 'player1' : 
                    backendScore.winner === 'team2' ? 'player2' : undefined
          };
          
          // Update current match score
          this.currentMatch.score = this.score;
          
          // Check if match is completed
          if (this.score.winner) {
            this.currentMatch.status = 'completed';
          }
          
          console.log('🔄 Updated local score from backend:', this.score);
          
          // Score updated from backend response
        }
      },
      error: (error) => {
        console.error('❌ Error saving score to database:', error);
        console.log('💡 This might be a test match or database connectivity issue');
      }
    });
  }

  // Game format helper methods
  isRegularTennis(): boolean {
    return (this.currentMatch.gameFormat || 'regular') === 'regular';
  }

  getGameFormatDisplay(): string {
    switch (this.currentMatch.gameFormat || 'regular') {
      case 'tiebreak-8': return '8-Game Tiebreak';
      case 'tiebreak-10': return '10-Game Tiebreak';
      case 'regular':
      default: return 'Regular Tennis';
    }
  }

  getScoreLabel(): string {
    const gameFormat = this.currentMatch.gameFormat || 'regular';
    if (gameFormat === 'tiebreak-8' || gameFormat === 'tiebreak-10') {
      return 'Score';
    }
    return 'Games';
  }
}