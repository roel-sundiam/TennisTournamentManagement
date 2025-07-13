import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TournamentService } from '../../../services/tournament.service';
import { Tournament } from '../../../models/tournament.model';

@Component({
  selector: 'app-tournament-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  template: `
    <div class="tournament-form-container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{ isEditMode ? 'edit' : 'add_circle' }}</mat-icon>
            {{ isEditMode ? 'Edit Tournament' : 'Create New Tournament' }}
          </mat-card-title>
          <mat-card-subtitle>{{ isEditMode ? 'Update tournament details' : 'Set up your tennis tournament' }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="tournamentForm" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tournament Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter tournament name">
                <mat-error *ngIf="tournamentForm.get('name')?.hasError('required')">
                  Tournament name is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3" 
                          placeholder="Brief description of the tournament"></textarea>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Start Date</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="startDate">
                <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
                <mat-error *ngIf="tournamentForm.get('startDate')?.hasError('required')">
                  Start date is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>End Date</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="endDate">
                <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
                <mat-error *ngIf="tournamentForm.get('endDate')?.hasError('required')">
                  End date is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Tournament Format</mat-label>
                <mat-select formControlName="format">
                  <mat-option value="single-elimination">Single Elimination</mat-option>
                  <mat-option value="double-elimination" class="unsupported-option">Double Elimination</mat-option>
                  <mat-option value="round-robin" class="unsupported-option">Round Robin</mat-option>
                </mat-select>
                <mat-hint *ngIf="showFormatWarning" class="warning-hint">
                  <mat-icon>warning</mat-icon>
                  This tournament format is not yet available. Please use Single Elimination.
                </mat-hint>
                <mat-error *ngIf="tournamentForm.get('format')?.hasError('required')">
                  Tournament format is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Game Type</mat-label>
                <mat-select formControlName="gameType">
                  <mat-option value="singles">Singles</mat-option>
                  <mat-option value="doubles">Doubles</mat-option>
                </mat-select>
                <mat-error *ngIf="tournamentForm.get('gameType')?.hasError('required')">
                  Game type is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Match Format</mat-label>
                <mat-select formControlName="gameFormat">
                  <mat-option value="regular" class="unsupported-option">
                    <div class="format-option">
                      <div class="format-title">Regular Tennis</div>
                      <div class="format-description">Best of 3 sets with traditional scoring (0-15-30-40)</div>
                    </div>
                  </mat-option>
                  <mat-option value="tiebreak-8">
                    <div class="format-option">
                      <div class="format-title">8-Game Tiebreak</div>
                      <div class="format-description">First to 8 games wins (faster format)</div>
                    </div>
                  </mat-option>
                  <mat-option value="tiebreak-10">
                    <div class="format-option">
                      <div class="format-title">10-Game Tiebreak</div>
                      <div class="format-description">First to 10 games wins (pro set format)</div>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-hint *ngIf="!showGameFormatWarning">This will apply to all matches in the tournament</mat-hint>
                <mat-hint *ngIf="showGameFormatWarning" class="warning-hint">
                  <mat-icon>warning</mat-icon>
                  Regular Tennis is not yet fully supported. We recommend using 8-Game or 10-Game Tiebreak formats.
                </mat-hint>
                <mat-error *ngIf="tournamentForm.get('gameFormat')?.hasError('required')">
                  Match format is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Maximum Players</mat-label>
                <input matInput type="number" formControlName="maxPlayers" min="2" max="128">
                <mat-error *ngIf="tournamentForm.get('maxPlayers')?.hasError('required')">
                  Maximum players is required
                </mat-error>
                <mat-error *ngIf="tournamentForm.get('maxPlayers')?.hasError('min')">
                  Minimum 2 players required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Required Courts</mat-label>
                <input matInput type="number" formControlName="requiredCourts" min="1" max="20">
                <mat-hint>Number of courts needed for optimal tournament scheduling</mat-hint>
                <mat-error *ngIf="tournamentForm.get('requiredCourts')?.hasError('required')">
                  Required courts is required
                </mat-error>
                <mat-error *ngIf="tournamentForm.get('requiredCourts')?.hasError('min')">
                  At least 1 court required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Venue</mat-label>
                <input matInput formControlName="venue" placeholder="Tournament venue">
              </mat-form-field>
            </div>

          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button type="button" (click)="onCancel()">
            <mat-icon>cancel</mat-icon>
            Cancel
          </button>
          <button mat-raised-button color="primary" [disabled]="!isFormValid()" (click)="onSubmit()" 
                  [matTooltip]="hasUnsupportedOptions() ? 'Please select supported tournament and match formats' : ''">
            <mat-icon>save</mat-icon>
            {{ isEditMode ? 'Update Tournament' : 'Create Tournament' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .tournament-form-container {
      max-width: 800px;
      margin: 24px auto;
      padding: 24px;
    }

    .form-card {
      padding: 24px;
    }

    mat-card-header {
      margin-bottom: 24px;
      
      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.8rem;
      }
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 0;
      }
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      flex: 1;
      
      @media (max-width: 768px) {
        width: 100%;
      }
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      padding: 24px;
      
      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .format-option {
      padding: 8px 0;
      
      .format-title {
        font-weight: 500;
        font-size: 14px;
        margin-bottom: 2px;
      }
      
      .format-description {
        font-size: 12px;
        color: #666;
        line-height: 1.3;
      }
    }

    .warning-hint {
      color: #ff9800 !important;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      
      mat-icon {
        font-size: 16px;
        height: 16px;
        width: 16px;
      }
    }

    .unsupported-option {
      color: #999 !important;
      font-style: italic;
      
      .format-option {
        .format-title {
          color: #999 !important;
        }
        
        .format-description {
          color: #bbb !important;
        }
      }
    }
  `]
})
export class TournamentFormComponent implements OnInit {
  tournamentForm!: FormGroup;
  isEditMode = false;
  tournamentId: string | null = null;
  showFormatWarning = false;
  showGameFormatWarning = false;

  constructor(
    private fb: FormBuilder,
    private tournamentService: TournamentService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.tournamentId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.tournamentId;
    this.initializeForm();
    this.setupFormSubscriptions();
    
    if (this.isEditMode && this.tournamentId) {
      this.loadTournament(this.tournamentId);
    }
  }

  initializeForm(): void {
    this.tournamentForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      format: ['', [Validators.required]],
      gameType: ['', [Validators.required]],
      gameFormat: ['tiebreak-10', [Validators.required]],
      maxPlayers: [8, [Validators.required, Validators.min(2)]],
      requiredCourts: [2, [Validators.required, Validators.min(1)]],
      venue: ['']
    });
  }

  setupFormSubscriptions(): void {
    // Check initial values
    const initialFormat = this.tournamentForm.get('format')?.value;
    const initialGameFormat = this.tournamentForm.get('gameFormat')?.value;
    
    this.showFormatWarning = initialFormat === 'double-elimination' || initialFormat === 'round-robin';
    this.showGameFormatWarning = initialGameFormat === 'regular';

    // Watch for tournament format changes
    this.tournamentForm.get('format')?.valueChanges.subscribe(value => {
      this.showFormatWarning = value === 'double-elimination' || value === 'round-robin';
    });

    // Watch for game format changes
    this.tournamentForm.get('gameFormat')?.valueChanges.subscribe(value => {
      this.showGameFormatWarning = value === 'regular';
    });
  }

  hasUnsupportedOptions(): boolean {
    const format = this.tournamentForm.get('format')?.value;
    const gameFormat = this.tournamentForm.get('gameFormat')?.value;
    
    const unsupportedFormat = format === 'double-elimination' || format === 'round-robin';
    const unsupportedGameFormat = gameFormat === 'regular';
    
    return unsupportedFormat || unsupportedGameFormat;
  }

  isFormValid(): boolean {
    return this.tournamentForm.valid && !this.hasUnsupportedOptions();
  }

  loadTournament(id: string): void {
    this.tournamentService.getTournamentById(id).subscribe({
      next: (tournament) => {
        this.tournamentForm.patchValue({
          name: tournament.name,
          description: tournament.description,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          format: tournament.format,
          gameType: tournament.gameType,
          gameFormat: tournament.gameFormat || 'regular',
          maxPlayers: tournament.maxPlayers,
          requiredCourts: tournament.requiredCourts || 2,
          venue: tournament.venue
        });
      },
      error: (error) => {
        this.snackBar.open('Failed to load tournament', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        console.error('Load error:', error);
      }
    });
  }

  onSubmit(): void {
    if (!this.tournamentForm.valid) {
      this.snackBar.open('Please fill in all required fields', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (this.hasUnsupportedOptions()) {
      this.snackBar.open('Please select supported tournament and match formats to continue', 'Close', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    if (this.isFormValid()) {
      const tournamentData = {
        ...this.tournamentForm.value
      };

      if (!this.isEditMode) {
        tournamentData.currentPlayers = 0;
        tournamentData.status = 'registration-open';
      }

      // Debug logging
      console.log('🔍 Form submission debug:');
      console.log('Form value:', this.tournamentForm.value);
      console.log('Tournament data being sent:', tournamentData);
      console.log('Required Courts value:', tournamentData.requiredCourts);

      const operation = this.isEditMode && this.tournamentId
        ? this.tournamentService.updateTournament(this.tournamentId, tournamentData)
        : this.tournamentService.createTournament(tournamentData);

      operation.subscribe({
        next: (tournament) => {
          const message = this.isEditMode ? 'Tournament updated successfully' : 'Tournament created successfully';
          this.snackBar.open(message, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/tournaments']);
        },
        error: (error) => {
          const message = this.isEditMode ? 'Failed to update tournament' : 'Failed to create tournament';
          this.snackBar.open(message, 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          console.error('Operation error:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/tournaments']);
  }
}