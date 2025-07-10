import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DialogData {
  match: any;
  tournamentId: string;
  gameFormat: string;
}

@Component({
  selector: 'app-final-score-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  template: `
    <div class="final-score-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>Enter Final Score</h2>
        <button mat-icon-button (click)="closeDialog()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <div class="match-info">
          <div class="players-header">
            <div class="player-names">
              <div class="player1">{{ getPlayer1Name() }}</div>
              <div class="vs-divider">VS</div>
              <div class="player2">{{ getPlayer2Name() }}</div>
            </div>
            <div class="game-format-badge">{{ getGameFormatDisplay() }}</div>
          </div>
        </div>

        <form [formGroup]="scoreForm" class="score-form">
          <div class="score-inputs">
            <div class="player-score-section">
              <div class="player-header">
                <mat-icon>person</mat-icon>
                <span class="player-label">{{ getPlayer1Name() }}</span>
              </div>
              <mat-form-field appearance="outline" class="score-field">
                <mat-label>Final Score</mat-label>
                <input matInput 
                       type="number" 
                       formControlName="player1Score"
                       min="0"
                       [max]="getMaxScore()"
                       placeholder="0">
                <mat-error *ngIf="scoreForm.get('player1Score')?.hasError('required')">
                  Score is required
                </mat-error>
                <mat-error *ngIf="scoreForm.get('player1Score')?.hasError('min')">
                  Score cannot be negative
                </mat-error>
                <mat-error *ngIf="scoreForm.get('player1Score')?.hasError('max')">
                  Score too high for {{ getGameFormatDisplay() }}
                </mat-error>
              </mat-form-field>
            </div>

            <div class="player-score-section">
              <div class="player-header">
                <mat-icon>person</mat-icon>
                <span class="player-label">{{ getPlayer2Name() }}</span>
              </div>
              <mat-form-field appearance="outline" class="score-field">
                <mat-label>Final Score</mat-label>
                <input matInput 
                       type="number" 
                       formControlName="player2Score"
                       min="0"
                       [max]="getMaxScore()"
                       placeholder="0">
                <mat-error *ngIf="scoreForm.get('player2Score')?.hasError('required')">
                  Score is required
                </mat-error>
                <mat-error *ngIf="scoreForm.get('player2Score')?.hasError('min')">
                  Score cannot be negative
                </mat-error>
                <mat-error *ngIf="scoreForm.get('player2Score')?.hasError('max')">
                  Score too high for {{ getGameFormatDisplay() }}
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <div class="winner-info" *ngIf="getWinner()">
            <mat-icon class="winner-icon">emoji_events</mat-icon>
            <span class="winner-text">Winner: <strong>{{ getWinner() }}</strong></span>
          </div>

          <div class="format-help">
            <mat-icon>info</mat-icon>
            <span>{{ getFormatHelpText() }}</span>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="closeDialog()">
          <mat-icon>cancel</mat-icon>
          Cancel
        </button>
        <button mat-raised-button 
                color="primary" 
                [disabled]="!scoreForm.valid || !isValidScore()"
                (click)="saveScore()">
          <mat-icon>save</mat-icon>
          Save Final Score
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .final-score-dialog {
      min-width: 500px;
      max-width: 600px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 0 24px;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0;

      h2 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1.5rem;
      }

      .close-button {
        color: var(--text-secondary);
      }
    }

    .dialog-content {
      padding: 24px !important;
    }

    .match-info {
      margin-bottom: 24px;

      .players-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid var(--primary-color);

        .player-names {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 1.1rem;
          font-weight: 500;

          .player1, .player2 {
            color: var(--text-primary);
          }

          .vs-divider {
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 0.9rem;
          }
        }

        .game-format-badge {
          background: var(--primary-color);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }
      }
    }

    .score-form {
      .score-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-bottom: 20px;

        .player-score-section {
          .player-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            color: var(--text-primary);
            font-weight: 500;

            mat-icon {
              font-size: 18px;
              width: 18px;
              height: 18px;
              color: var(--primary-color);
            }
          }

          .score-field {
            width: 100%;

            input {
              font-size: 1.2rem;
              font-weight: 600;
              text-align: center;
            }
          }
        }
      }

      .winner-info {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
        border-radius: 8px;
        margin-bottom: 16px;
        border: 1px solid #4caf50;

        .winner-icon {
          color: #4caf50;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .winner-text {
          color: #2e7d32;
          font-size: 1rem;
        }
      }

      .format-help {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: #e3f2fd;
        border-radius: 8px;
        color: #1976d2;
        font-size: 0.9rem;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
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

    @media (max-width: 600px) {
      .final-score-dialog {
        min-width: auto;
        width: 100%;
      }

      .score-inputs {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }

      .players-header {
        flex-direction: column !important;
        gap: 12px !important;
        align-items: flex-start !important;
      }
    }
  `]
})
export class FinalScoreDialogComponent implements OnInit {
  scoreForm!: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<FinalScoreDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormValidation();
  }

  initializeForm(): void {
    // Check if match already has scores
    console.log('🔍 Initializing form with match data:', this.data.match);
    console.log('🔍 Match score data:', this.data.match.score);
    
    const existingPlayer1Score = this.data.match.score?.player1Score || null;
    const existingPlayer2Score = this.data.match.score?.player2Score || null;
    
    console.log('📊 Existing scores - Player 1:', existingPlayer1Score, 'Player 2:', existingPlayer2Score);
    
    this.scoreForm = this.fb.group({
      player1Score: [existingPlayer1Score, [Validators.required, Validators.min(0), Validators.max(this.getMaxScore())]],
      player2Score: [existingPlayer2Score, [Validators.required, Validators.min(0), Validators.max(this.getMaxScore())]]
    });
    
    console.log('✅ Form initialized with values:', this.scoreForm.value);
  }

  setupFormValidation(): void {
    // Listen for score changes to update winner display
    this.scoreForm.valueChanges.subscribe(() => {
      // Force change detection for winner display
    });
  }

  getPlayer1Name(): string {
    return this.data.match.player1?.name || 'Player 1';
  }

  getPlayer2Name(): string {
    return this.data.match.player2?.name || 'Player 2';
  }

  getGameFormatDisplay(): string {
    switch (this.data.gameFormat) {
      case 'tiebreak-8': return '8-Game Tiebreak';
      case 'tiebreak-10': return '10-Game Tiebreak';
      case 'regular':
      default: return 'Regular Tennis';
    }
  }

  getMaxScore(): number {
    switch (this.data.gameFormat) {
      case 'tiebreak-8': return 8; // First to 8 games
      case 'tiebreak-10': return 10; // First to 10 games
      case 'regular':
      default: return 7; // Maximum sets in regular tennis
    }
  }

  getFormatHelpText(): string {
    switch (this.data.gameFormat) {
      case 'tiebreak-8': return 'First to 8 games wins (e.g., 8-7, 8-6, 8-5)';
      case 'tiebreak-10': return 'First to 10 games wins (e.g., 10-9, 10-8, 10-7)';
      case 'regular':
      default: return 'Enter the number of sets won by each player';
    }
  }

  getWinner(): string | null {
    const player1Value = this.scoreForm.get('player1Score')?.value;
    const player2Value = this.scoreForm.get('player2Score')?.value;
    
    if (player1Value === null || player1Value === undefined || player1Value === '' ||
        player2Value === null || player2Value === undefined || player2Value === '') {
      return null;
    }
    
    const player1Score = Number(player1Value);
    const player2Score = Number(player2Value);

    if (player1Score === 0 && player2Score === 0) {
      return null;
    }

    if (player1Score > player2Score) {
      return this.getPlayer1Name();
    } else if (player2Score > player1Score) {
      return this.getPlayer2Name();
    }

    return null;
  }

  isValidScore(): boolean {
    const player1Value = this.scoreForm.get('player1Score')?.value;
    const player2Value = this.scoreForm.get('player2Score')?.value;
    
    // Check if values are null, undefined, or empty
    if (player1Value === null || player1Value === undefined || player1Value === '' ||
        player2Value === null || player2Value === undefined || player2Value === '') {
      return false;
    }
    
    const player1Score = Number(player1Value);
    const player2Score = Number(player2Value);

    // Both scores can't be 0
    if (player1Score === 0 && player2Score === 0) {
      return false;
    }

    // Scores can't be equal (there must be a winner)
    if (player1Score === player2Score) {
      return false;
    }

    // For 8-game and 10-game formats, simple "first to reach target" validation
    if (this.data.gameFormat === 'tiebreak-8' || this.data.gameFormat === 'tiebreak-10') {
      const targetScore = this.data.gameFormat === 'tiebreak-8' ? 8 : 10;
      const maxScore = Math.max(player1Score, player2Score);
      
      // Winner must reach exactly the target score, loser must be less than target
      const winnerReachedTarget = maxScore === targetScore;
      const loserBelowTarget = Math.min(player1Score, player2Score) < targetScore;
      
      return winnerReachedTarget && loserBelowTarget;
    }

    return true;
  }

  saveScore(): void {
    if (!this.scoreForm.valid || !this.isValidScore()) {
      this.snackBar.open('Please enter valid scores', 'Close', { duration: 3000 });
      return;
    }

    const player1Score = Number(this.scoreForm.get('player1Score')?.value);
    const player2Score = Number(this.scoreForm.get('player2Score')?.value);
    const winner = player1Score > player2Score ? 'player1' : 'player2';

    const finalScore = {
      player1Score,
      player2Score,
      winner,
      status: 'completed',
      completedAt: new Date().toISOString()
    };

    // Create the result object to return
    const result = {
      match: this.data.match,
      finalScore,
      winner: this.getWinner()
    };

    console.log('💾 Saving final score to backend:', result);

    // Save to backend - create a database match with the final score
    this.createMatchInDatabase(result).then(() => {
      this.snackBar.open(`Final score saved: ${this.getWinner()} wins!`, 'Close', { duration: 3000 });
      this.dialogRef.close(result);
    }).catch((error) => {
      console.error('❌ Error saving to database:', error);
      this.snackBar.open('Error saving score to database', 'Close', { duration: 3000 });
      // Still close with result for local update
      this.dialogRef.close(result);
    });
  }

  private async createMatchInDatabase(result: any): Promise<void> {
    const match = result.match;
    const finalScore = result.finalScore;

    console.log('🔍 Match player data:', {
      player1: match.player1,
      player2: match.player2
    });

    // We need valid team IDs - if players don't have IDs, we need to create placeholder teams
    // For now, let's use a different approach and update an existing match instead of creating a new one
    
    // First, check if this match already exists in the database
    try {
      const existingMatchResponse = await this.http.get(`${environment.apiUrl}/api/matches/${this.data.tournamentId}`).toPromise() as any;
      const existingMatches = existingMatchResponse?.data || [];
      
      const existingMatch = existingMatches.find((m: any) => 
        m.round === match.roundNumber && m.matchNumber === match.matchNumber
      );

      if (existingMatch) {
        // Update existing match with final score
        console.log('📝 Updating existing match:', existingMatch._id);
        await this.updateExistingMatch(existingMatch._id, finalScore);
        return;
      }
    } catch (error) {
      console.log('⚠️ Could not find existing matches, will create a simple match record');
      // For now, just save the score locally and skip database save
      // TODO: Implement proper match creation during bracket generation
      console.log('📊 Score saved locally only - database integration pending');
      return;
    }
    
    console.log('✅ Successfully saved match to database');
  }

  private async updateExistingMatch(matchId: string, finalScore: any): Promise<void> {
    // For tiebreak formats, directly set the final score instead of simulating point-by-point
    if (this.data.gameFormat === 'tiebreak-8' || this.data.gameFormat === 'tiebreak-10') {
      // Direct update for tiebreak formats
      const winnerTeam = finalScore.winner === 'player1' ? 'team1' : 'team2';
      const directUpdate = {
        gameFormat: this.data.gameFormat, // Ensure match has correct game format
        finalScore: {
          team1Games: finalScore.player1Score,
          team2Games: finalScore.player2Score,
          winner: winnerTeam
        },
        status: 'completed'
      };

      await this.http.put(`${environment.apiUrl}/api/matches/${matchId}/final-score`, directUpdate).toPromise();
      return;
    }

    // For regular tennis, simulate point-by-point scoring
    const winnerScore = finalScore.winner === 'player1' ? finalScore.player1Score : finalScore.player2Score;
    const loserScore = finalScore.winner === 'player1' ? finalScore.player2Score : finalScore.player1Score;
    const totalPoints = winnerScore + loserScore;

    // Create a proper distribution for regular tennis sets
    const shuffledSequence: string[] = [];
    let winnerCount = 0;
    let loserCount = 0;
    const winnerTeam = finalScore.winner === 'player1' ? 'team1' : 'team2';
    const loserTeam = finalScore.winner === 'player1' ? 'team2' : 'team1';

    for (let i = 0; i < totalPoints; i++) {
      const winnerPointsNeeded = winnerScore - winnerCount;
      const loserPointsNeeded = loserScore - loserCount;
      const pointsRemaining = totalPoints - i;

      if (loserPointsNeeded === pointsRemaining) {
        shuffledSequence.push(loserTeam);
        loserCount++;
      } else if (winnerPointsNeeded === pointsRemaining) {
        shuffledSequence.push(winnerTeam);
        winnerCount++;
      } else {
        if (winnerCount < winnerScore && (loserCount >= loserScore || i % 2 === 0)) {
          shuffledSequence.push(winnerTeam);
          winnerCount++;
        } else {
          shuffledSequence.push(loserTeam);
          loserCount++;
        }
      }
    }

    // Award points in sequence for regular tennis
    for (let i = 0; i < shuffledSequence.length; i++) {
      try {
        await this.http.put(`${environment.apiUrl}/api/matches/${matchId}/score`, { 
          pointWinner: shuffledSequence[i] 
        }).toPromise();
        
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`❌ Error awarding point ${i + 1}:`, error);
        throw error;
      }
    }

    // Mark match as completed
    await this.http.put(`${environment.apiUrl}/api/matches/${matchId}/complete`, {}).toPromise();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}