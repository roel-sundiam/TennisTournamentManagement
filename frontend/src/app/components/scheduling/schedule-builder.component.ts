import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TournamentService } from '../../services/tournament.service';
import { CourtService, Court } from '../../services/court.service';
import { SchedulingService, ScheduleRequest, TournamentSchedule } from '../../services/scheduling.service';
import { Tournament } from '../../models/tournament.model';

@Component({
  selector: 'app-schedule-builder',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatStepperModule,
    MatProgressBarModule,
    MatChipsModule,
    MatToolbarModule
  ],
  template: `
    <div class="schedule-builder-container">
      <!-- Header -->
      <mat-toolbar class="header-toolbar">
        <div class="header-content">
          <div class="title-section">
            <mat-icon class="header-icon">schedule</mat-icon>
            <div class="title-info">
              <h1>Schedule Builder</h1>
              <span class="tournament-name" *ngIf="selectedTournament">{{ selectedTournament.name }}</span>
            </div>
          </div>
          <button mat-icon-button routerLink="/tournaments">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </mat-toolbar>

      <!-- Tournament Info Header -->
      <mat-card *ngIf="selectedTournament" class="tournament-header-card">
        <mat-card-content>
          <div class="tournament-header-content">
            <div class="tournament-details-grid">
              <div class="detail-item">
                <mat-icon>event</mat-icon>
                <span>{{ formatDate(selectedTournament.startDate) }} - {{ formatDate(selectedTournament.endDate) }}</span>
              </div>
              <div class="detail-item">
                <mat-icon>people</mat-icon>
                <span>{{ selectedTournament.currentPlayers }}/{{ selectedTournament.maxPlayers }} Players</span>
              </div>
              <div class="detail-item">
                <mat-icon>category</mat-icon>
                <span>{{ selectedTournament.format | titlecase }}</span>
              </div>
              <div class="detail-item">
                <mat-icon>sports_tennis</mat-icon>
                <span>{{ selectedTournament.gameType | titlecase }}</span>
              </div>
              <div class="detail-item">
                <mat-icon>gavel</mat-icon>
                <span>{{ selectedTournament.requiredCourts || 'TBD' }} Required Courts</span>
              </div>
            </div>
            
            <!-- Optimization Recommendations -->
            <div *ngIf="optimizationData" class="optimization-section">
              <h4>📊 Schedule Recommendations</h4>
              <mat-chip-set>
                <mat-chip>⏱️ {{ optimizationData.estimatedDuration }}h Duration</mat-chip>
                <mat-chip>🏟️ {{ optimizationData.minimumCourts }} Courts Minimum</mat-chip>
                <mat-chip>⏰ {{ optimizationData.recommendedSlotDuration }}min Slots</mat-chip>
              </mat-chip-set>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Stepper -->
      <mat-stepper [linear]="true" #stepper class="schedule-stepper">
        
        <!-- Step 1: Court Selection -->
        <mat-step [stepControl]="courtForm" label="Select Courts">
          <form [formGroup]="courtForm">
            <div class="step-content">
              <h3>Choose Courts for Tournament</h3>
              <p class="step-description">Select which courts will be available for matches.</p>

              <!-- Available Courts -->
              <div class="courts-section">
                <h4>Available Courts</h4>
                <div class="courts-grid" *ngIf="availableCourts.length > 0; else noCourts">
                  <mat-card *ngFor="let court of availableCourts" 
                           class="court-selection-card"
                           [ngClass]="{ 'selected': isCourtSelected(court._id!) }"
                           (click)="toggleCourt(court._id!)">
                    <mat-card-content>
                      <div class="court-header">
                        <div class="court-info">
                          <div class="court-name">{{ court.name }}</div>
                          <div class="court-type">
                            <mat-icon>{{ court.type === 'indoor' ? 'home' : 'wb_sunny' }}</mat-icon>
                            {{ court.type | titlecase }}
                          </div>
                        </div>
                        <mat-checkbox [checked]="isCourtSelected(court._id!)" 
                                     (change)="toggleCourt(court._id!)"
                                     (click)="$event.stopPropagation()"></mat-checkbox>
                      </div>
                      <div class="court-details">
                        <span *ngIf="court.location">📍 {{ court.location }}</span>
                        <span>👥 {{ court.capacity || 4 }} capacity</span>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <ng-template #noCourts>
                  <div class="no-courts-message">
                    <mat-icon>info</mat-icon>
                    <p>No courts available. Please add courts first.</p>
                    <button mat-raised-button color="primary" routerLink="/courts">
                      <mat-icon>add</mat-icon>
                      Add Courts
                    </button>
                  </div>
                </ng-template>
              </div>

              <!-- Court Requirements Status -->
              <div *ngIf="selectedTournament" class="court-requirements-status" [ngClass]="getRequirementStatusClass().replace('status-', '')">
                <div class="requirement-info">
                  <mat-icon [ngClass]="getRequirementStatusClass()">{{ getRequirementStatusIcon() }}</mat-icon>
                  <span>{{ getRequirementStatusText() }}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getCourtProgress()"></div>
                </div>
              </div>

              <!-- Selected Courts Summary -->
              <div *ngIf="selectedCourts.length > 0" class="selected-courts-summary">
                <h4>Selected Courts ({{ selectedCourts.length }}/{{ selectedTournament?.requiredCourts }})</h4>
                <mat-chip-set>
                  <mat-chip *ngFor="let courtId of selectedCourts" (removed)="toggleCourt(courtId)">
                    {{ getCourtName(courtId) }}
                    <mat-icon matChipRemove>cancel</mat-icon>
                  </mat-chip>
                </mat-chip-set>
              </div>

              <div class="step-actions">
                <button mat-raised-button color="primary" matStepperNext 
                        [disabled]="selectedCourts.length === 0">
                  <mat-icon>arrow_forward</mat-icon>
                  Continue to Schedule
                </button>
              </div>
            </div>
          </form>
        </mat-step>

        <!-- Step 2: Schedule Configuration -->
        <mat-step [stepControl]="scheduleForm" label="Configure Schedule">
          <form [formGroup]="scheduleForm">
            <div class="step-content">
              <h3>Schedule Configuration</h3>
              <p class="step-description">Set up timing and preferences for your tournament schedule.</p>

              <div class="schedule-config-grid">
                <!-- Date Range -->
                <mat-form-field appearance="outline">
                  <mat-label>Start Date</mat-label>
                  <input matInput [matDatepicker]="startPicker" formControlName="startDate">
                  <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                  <mat-datepicker #startPicker></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>End Date</mat-label>
                  <input matInput [matDatepicker]="endPicker" formControlName="endDate">
                  <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                  <mat-datepicker #endPicker></mat-datepicker>
                </mat-form-field>

                <!-- Time Settings -->
                <mat-form-field appearance="outline">
                  <mat-label>Start Time</mat-label>
                  <input matInput type="time" formControlName="startTime">
                  <mat-icon matSuffix>schedule</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>End Time</mat-label>
                  <input matInput type="time" formControlName="endTime">
                  <mat-icon matSuffix>schedule</mat-icon>
                </mat-form-field>

                <!-- Duration Settings -->
                <mat-form-field appearance="outline">
                  <mat-label>Time Slot Duration (minutes)</mat-label>
                  <mat-select formControlName="timeSlotDuration">
                    <mat-option value="45">45 minutes (Short matches)</mat-option>
                    <mat-option value="60">60 minutes (Tiebreak matches)</mat-option>
                    <mat-option value="90">90 minutes (Regular matches)</mat-option>
                    <mat-option value="120">120 minutes (Long matches)</mat-option>
                  </mat-select>
                  <mat-hint *ngIf="isFormPrePopulated">
                    Pre-populated from existing schedule: {{prePopulatedValues?.timeSlotDuration}} minutes
                  </mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Break Between Matches (minutes)</mat-label>
                  <mat-select formControlName="breakBetweenMatches">
                    <mat-option value="5">5 minutes</mat-option>
                    <mat-option value="10">10 minutes</mat-option>
                    <mat-option value="15">15 minutes</mat-option>
                    <mat-option value="30">30 minutes</mat-option>
                  </mat-select>
                  <mat-hint *ngIf="isFormPrePopulated">
                    Pre-populated from existing schedule: {{prePopulatedValues?.breakBetweenMatches}} minutes
                  </mat-hint>
                </mat-form-field>
              </div>

              <!-- Schedule Preview -->
              <mat-card class="schedule-preview-card">
                <mat-card-header>
                  <mat-card-title>Schedule Preview</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="preview-stats">
                    <div class="stat-item">
                      <mat-icon>schedule</mat-icon>
                      <span>{{ getDailySlots() }} slots per day</span>
                    </div>
                    <div class="stat-item">
                      <mat-icon>sports_tennis</mat-icon>
                      <span>{{ getTotalSlots() }} total slots</span>
                    </div>
                    <div class="stat-item">
                      <mat-icon>event</mat-icon>
                      <span>{{ getDurationDays() }} tournament days</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <div class="step-actions">
                <button mat-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button mat-raised-button color="primary" (click)="generateSchedule()" 
                        [disabled]="!scheduleForm.valid || isGenerating">
                  <mat-icon>{{ isGenerating ? 'hourglass_empty' : 'build' }}</mat-icon>
                  {{ isGenerating ? 'Generating...' : 'Generate Schedule' }}
                </button>
              </div>
            </div>
          </form>
        </mat-step>

        <!-- Step 3: Review & Complete -->
        <mat-step label="Review & Complete">
          <div class="step-content">
            <h3>Schedule Generated Successfully!</h3>
            <p class="step-description">Your tournament schedule has been created. Review the details below.</p>

            <!-- Generation Progress -->
            <div *ngIf="isGenerating" class="generation-progress">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              <p>Generating optimal schedule...</p>
            </div>

            <!-- Generated Schedule Summary -->
            <div *ngIf="generatedSchedule && !isGenerating" class="schedule-results">
              <mat-card class="results-card">
                <mat-card-header>
                  <mat-card-title>Schedule Summary</mat-card-title>
                  <mat-card-subtitle>{{ selectedTournament?.name }}</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="results-grid">
                    <div class="result-item">
                      <mat-icon>sports_tennis</mat-icon>
                      <div>
                        <span class="result-value">{{ generatedSchedule.totalMatches }}</span>
                        <span class="result-label">Total Matches</span>
                      </div>
                    </div>
                    <div class="result-item">
                      <mat-icon>schedule</mat-icon>
                      <div>
                        <span class="result-value">{{ generatedSchedule.scheduledMatches }}</span>
                        <span class="result-label">Scheduled Matches</span>
                      </div>
                    </div>
                    <div class="result-item">
                      <mat-icon>timer</mat-icon>
                      <div>
                        <span class="result-value">{{ generatedSchedule.estimatedDuration }}h</span>
                        <span class="result-label">Estimated Duration</span>
                      </div>
                    </div>
                  </div>

                  <!-- Conflicts Warning -->
                  <div *ngIf="generatedSchedule.conflicts.length > 0" class="conflicts-section">
                    <h4>⚠️ Scheduling Conflicts</h4>
                    <div *ngFor="let conflict of generatedSchedule.conflicts" class="conflict-item">
                      <mat-icon>warning</mat-icon>
                      <span>{{ conflict.message }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <div class="final-actions">
                <button mat-raised-button color="primary" (click)="viewSchedule()">
                  <mat-icon>visibility</mat-icon>
                  View Schedule
                </button>
                <button mat-raised-button (click)="startOver()">
                  <mat-icon>refresh</mat-icon>
                  Create New Schedule
                </button>
              </div>
            </div>
          </div>
        </mat-step>
      </mat-stepper>
    </div>
  `,
  styles: [`
    .schedule-builder-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: 100vh;
    }

    .header-toolbar {
      background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .title-info h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 500;
      line-height: 1.2;
    }

    .tournament-name {
      font-size: 16px;
      opacity: 0.9;
      font-weight: 400;
    }

    .header-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .tournament-header-card {
      margin-bottom: 24px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .tournament-header-content {
      padding: 16px 0;
    }

    .schedule-stepper {
      background: transparent;
    }

    .step-content {
      padding: 32px 0;
    }

    .step-description {
      color: #666;
      margin-bottom: 24px;
      font-size: 16px;
      line-height: 1.5;
    }

    .full-width {
      width: 100%;
    }

    .tournament-option {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .tournament-name {
      font-weight: 500;
    }

    .tournament-details {
      font-size: 0.8rem;
      color: #666;
    }

    .tournament-info-card {
      margin: 20px 0;
    }

    .tournament-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
    }

    .optimization-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .courts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .court-selection-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      background: white;
    }

    .court-selection-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .court-selection-card.selected {
      border-color: #1976d2;
      background-color: #e3f2fd;
      box-shadow: 0 4px 16px rgba(25, 118, 210, 0.3);
    }

    .court-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .court-name {
      font-weight: 500;
      font-size: 18px;
      color: #333;
    }

    .court-type {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #666;
      font-size: 0.9rem;
    }

    .court-details {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 0.9rem;
      color: #666;
    }

    .court-requirements-status {
      margin: 20px 0;
      padding: 16px;
      border-radius: 8px;
      background: #f5f5f5;
    }

    .court-requirements-status.good {
      background: #e8f5e8;
      border: 1px solid #4caf50;
    }

    .court-requirements-status.warning {
      background: #fff3e0;
      border: 1px solid #ff9800;
    }

    .court-requirements-status.error {
      background: #ffebee;
      border: 1px solid #f44336;
    }

    .requirement-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .progress-bar {
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #1976d2;
      transition: width 0.3s ease;
    }

    .selected-courts-summary {
      margin: 20px 0;
      padding: 16px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .selected-courts-summary h4 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 16px;
    }

    .step-actions {
      display: flex;
      gap: 16px;
      margin-top: 32px;
      justify-content: flex-end;
    }

    .schedule-config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .schedule-config-grid .full-width {
      grid-column: 1 / -1;
    }

    /* Form field improvements */
    mat-form-field {
      width: 100%;
    }

    /* Step content improvements */
    .step-content h3 {
      color: #333;
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    /* No courts message */
    .no-courts-message {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .no-courts-message mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ccc;
      margin-bottom: 16px;
    }

    /* Optimization section improvements */
    .optimization-section h4 {
      color: #333;
      font-size: 16px;
      margin-bottom: 12px;
    }

    /* Progress and loading states */
    .progress-section {
      margin: 20px 0;
      padding: 16px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .final-actions {
      display: flex;
      gap: 16px;
      margin-top: 24px;
      justify-content: center;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .schedule-builder-container {
        padding: 16px;
      }
      
      .header-content {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }
      
      .tournament-details-grid {
        grid-template-columns: 1fr;
      }
      
      .courts-grid {
        grid-template-columns: 1fr;
      }
      
      .schedule-config-grid {
        grid-template-columns: 1fr;
      }
      
      .step-actions {
        flex-direction: column;
      }
      
      .final-actions {
        flex-direction: column;
      }
    }

    .step-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .generation-progress {
      text-align: center;
      padding: 40px;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: center;
    }

    .result-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 600;
      color: #673ab7;
    }

    .result-label {
      display: block;
      font-size: 0.9rem;
      color: #666;
    }

    .conflicts-section {
      margin-top: 20px;
      padding: 16px;
      background: #fff3e0;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
    }

    .conflict-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
    }

    .final-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 24px;
    }

    @media (max-width: 768px) {
      .schedule-builder-container {
        padding: 16px;
      }
      
      .tournament-details-grid,
      .schedule-config-grid {
        grid-template-columns: 1fr;
      }
      
      .courts-grid {
        grid-template-columns: 1fr;
      }
      
      .preview-stats {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class ScheduleBuilderComponent implements OnInit {
  @ViewChild('stepper', { static: false }) stepper!: MatStepper;
  
  tournamentForm: FormGroup;
  courtForm: FormGroup;
  scheduleForm: FormGroup;

  tournaments: Tournament[] = [];
  availableCourts: Court[] = [];
  selectedTournament: Tournament | null = null;
  selectedCourts: string[] = [];
  optimizationData: any = null;
  generatedSchedule: TournamentSchedule | null = null;
  isGenerating = false;
  isPreSelected = false;
  isFormPrePopulated = false;
  prePopulatedValues: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private tournamentService: TournamentService,
    private courtService: CourtService,
    private schedulingService: SchedulingService,
    private cdr: ChangeDetectorRef
  ) {
    this.tournamentForm = this.fb.group({
      tournamentId: ['', Validators.required]
    });

    this.courtForm = this.fb.group({
      selectedCourts: [[], Validators.required]
    });

    this.scheduleForm = this.fb.group({
      startDate: [new Date(), Validators.required],
      endDate: [new Date(), Validators.required],
      startTime: ['09:00', Validators.required],
      endTime: ['18:00', Validators.required],
      timeSlotDuration: [90, Validators.required],
      breakBetweenMatches: [15, Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('🔍 ScheduleBuilderComponent ngOnInit called');
    console.log('🔍 Current route URL:', window.location.href);
    
    // Check for tournament query parameter and auto-select
    this.route.queryParams.subscribe(params => {
      console.log('🔍 Schedule builder query params:', params);
      if (params['tournament']) {
        console.log('🎾 Auto-selecting tournament:', params['tournament']);
        // Load specific tournament by ID using the correct API endpoint
        this.tournamentService.getTournamentById(params['tournament']).subscribe({
          next: (tournament) => {
            console.log('📋 Tournament loaded:', tournament);
            console.log('🔍 Tournament status:', tournament.status);
            
            // Check if tournament is in a valid state for scheduling
            if (tournament.status === 'registration-open' || tournament.status === 'registration-closed' || tournament.status === 'in-progress') {
              this.isPreSelected = true;
              this.selectedTournament = tournament;
              this.tournamentForm.patchValue({ tournamentId: tournament._id });
              
              console.log('✅ Tournament auto-selected:', this.selectedTournament);
              
              // Load courts with the correct limit now that we have the tournament
              this.loadCourts();
              
              // Pre-populate schedule form with tournament dates
              this.scheduleForm.patchValue({
                startDate: new Date(this.selectedTournament.startDate),
                endDate: new Date(this.selectedTournament.endDate)
              });
              
              // Show success message
              this.snackBar.open(`Pre-selected tournament: ${tournament.name}`, 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            } else {
              console.log('❌ Tournament not in valid state for scheduling:', tournament.status);
              this.snackBar.open(`Tournament "${tournament.name}" is not ready for scheduling (status: ${tournament.status})`, 'Close', {
                duration: 5000,
                panelClass: ['error-snackbar']
              });
              // Still load all tournaments for selection
              this.loadTournaments();
            }
          },
          error: (error) => {
            console.error('❌ Error loading tournament:', error);
            this.snackBar.open('Tournament not found or error loading tournament', 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            // Fall back to loading all tournaments
            this.loadTournaments();
          }
        });
      } else {
        // No tournament parameter, load all tournaments normally
        this.loadTournaments();
        // Load courts with no limit since no tournament is selected
        this.loadCourts();
      }
    });
  }

  loadTournaments(): void {
    this.tournamentService.getAllTournaments().subscribe({
      next: (tournaments) => {
        this.tournaments = tournaments.filter(t => 
          t.status === 'registration-open' || t.status === 'registration-closed' || t.status === 'in-progress'
        );
      },
      error: (error) => {
        console.error('Error loading tournaments:', error);
        this.snackBar.open('Failed to load tournaments', 'Close', { duration: 3000 });
      }
    });
  }

  loadCourts(): void {
    // If we have a selected tournament, load only the required number of courts
    const limit = this.selectedTournament?.requiredCourts || undefined;
    
    console.log('🔍 Loading courts with limit:', limit);
    console.log('🔍 Selected tournament:', this.selectedTournament?.name);
    console.log('🔍 Tournament required courts:', this.selectedTournament?.requiredCourts);
    
    this.courtService.getAvailableCourts(limit).subscribe({
      next: (courts) => {
        this.availableCourts = courts;
        console.log('🏟️ Loaded courts:', courts.length);
        
        // Auto-select all courts if we have a tournament with required courts
        if (this.selectedTournament && this.selectedTournament.requiredCourts) {
          this.selectedCourts = courts
            .map(court => court._id)
            .filter((id): id is string => id !== undefined);
          
          // Update the form control to make the stepper valid
          this.courtForm.patchValue({ selectedCourts: this.selectedCourts });
          
          console.log(`🏟️ Auto-selected ${this.selectedCourts.length} courts for tournament requiring ${this.selectedTournament.requiredCourts} courts`);
          console.log('📝 Updated courtForm with selected courts:', this.courtForm.value);
        }
      },
      error: (error) => {
        console.error('Error loading courts:', error);
        this.snackBar.open('Failed to load courts', 'Close', { duration: 3000 });
      }
    });
  }

  onTournamentChange(): void {
    let tournamentId = this.tournamentForm.get('tournamentId')?.value;
    
    // Clean up tournament ID if it contains query parameters (fix for route parsing issue)
    if (tournamentId && tournamentId.includes('?tournament=')) {
      // Extract the actual tournament ID from the query parameter
      const match = tournamentId.match(/\?tournament=([a-fA-F0-9]{24})/);
      if (match) {
        tournamentId = match[1];
        console.log('🔧 Extracted clean tournament ID:', tournamentId);
        // Update the form with the clean ID
        this.tournamentForm.patchValue({ tournamentId: tournamentId });
      }
    }
    
    this.selectedTournament = this.tournaments.find(t => t._id === tournamentId) || null;
    
    // Validate tournament ID before making API calls
    if (!tournamentId || !this.isValidObjectId(tournamentId)) {
      console.log('⚠️ Invalid or missing tournament ID in form:', tournamentId);
      return;
    }
    
    if (this.selectedTournament) {
      this.optimizationData = this.schedulingService.calculateOptimalSchedule({
        totalMatches: this.estimateMatchCount(this.selectedTournament),
        gameFormat: this.selectedTournament.gameFormat
      });

      // Note: Courts are loaded when tournament is auto-selected, so we don't need to reload here

      // Check for existing schedule first, and only set defaults if no existing schedule
      console.log('🔍 About to call getTournamentSchedule with tournamentId:', tournamentId);
      console.log('🔍 tournamentId type:', typeof tournamentId);
      console.log('🔍 selectedTournament._id:', this.selectedTournament._id);
      this.schedulingService.getTournamentSchedule(tournamentId).subscribe({
        next: (existingSchedule) => {
          console.log('📅 API Response for existing schedule:', existingSchedule);
          
          if (existingSchedule && existingSchedule.timeSlots && existingSchedule.timeSlots.length > 0) {
            console.log('✅ Found existing schedule with', existingSchedule.timeSlots.length, 'time slots');
            
            // Show option to view existing schedule
            this.snackBar.open(
              `Schedule already exists for this tournament (${existingSchedule.timeSlots.length} time slots)`, 
              'View Schedule', 
              { 
                duration: 10000,
                panelClass: ['info-snackbar']
              }
            ).onAction().subscribe(() => {
              this.router.navigate(['/tournaments', tournamentId, 'schedule']);
            });
            
            // Pre-populate form with existing schedule data
            if (existingSchedule.schedule) {
              console.log('📝 Pre-populating form with existing schedule data:', existingSchedule.schedule);
              
              // Pre-populate selected courts from existing schedule
              if (existingSchedule.schedule.courts && existingSchedule.schedule.courts.length > 0) {
                this.selectedCourts = [...existingSchedule.schedule.courts];
                this.courtForm.patchValue({ selectedCourts: this.selectedCourts });
                console.log('🏟️ Pre-populated courts from schedule:', this.selectedCourts);
              } else {
                // If no courts in schedule but time slots exist, default to court "1"
                console.log('⚠️ Schedule exists but no courts saved, defaulting to court "1"');
                this.selectedCourts = ['1'];
                this.courtForm.patchValue({ selectedCourts: this.selectedCourts });
                console.log('🏟️ Pre-populated default court:', this.selectedCourts);
              }
              
              console.log('📝 Populating schedule form with:', {
                startDate: new Date(existingSchedule.schedule.startDate),
                endDate: new Date(existingSchedule.schedule.endDate),
                startTime: existingSchedule.schedule.startTime,
                endTime: existingSchedule.schedule.endTime,
                timeSlotDuration: existingSchedule.schedule.timeSlotDuration,
                breakBetweenMatches: existingSchedule.schedule.breakBetweenMatches
              });

              this.scheduleForm.patchValue({
                startDate: new Date(existingSchedule.schedule.startDate),
                endDate: new Date(existingSchedule.schedule.endDate),
                startTime: existingSchedule.schedule.startTime,
                endTime: existingSchedule.schedule.endTime,
                timeSlotDuration: existingSchedule.schedule.timeSlotDuration,
                breakBetweenMatches: existingSchedule.schedule.breakBetweenMatches
              });
              
              // Force update each control individually to ensure they take the new values
              setTimeout(() => {
                // Force recreation of the form with existing values to ensure UI updates
                const currentValues = {
                  startDate: new Date(existingSchedule.schedule!.startDate),
                  endDate: new Date(existingSchedule.schedule!.endDate),
                  startTime: existingSchedule.schedule!.startTime,
                  endTime: existingSchedule.schedule!.endTime,
                  timeSlotDuration: String(existingSchedule.schedule!.timeSlotDuration), // Convert to string to match mat-option values
                  breakBetweenMatches: String(existingSchedule.schedule!.breakBetweenMatches) // Convert to string to match mat-option values
                };
                
                // Recreate the form with the existing values
                this.scheduleForm = this.fb.group({
                  startDate: [currentValues.startDate, Validators.required],
                  endDate: [currentValues.endDate, Validators.required],
                  startTime: [currentValues.startTime, Validators.required],
                  endTime: [currentValues.endTime, Validators.required],
                  timeSlotDuration: [currentValues.timeSlotDuration, Validators.required],
                  breakBetweenMatches: [currentValues.breakBetweenMatches, Validators.required]
                });
                
                // Trigger change detection to update UI
                this.cdr.detectChanges();
                
                console.log('✅ Form recreated with values:', this.scheduleForm.value);
                console.log('🏟️ Courts populated with values:', this.selectedCourts);
                console.log('⏰ Time slot duration control value:', this.scheduleForm.get('timeSlotDuration')?.value);
                console.log('⏸️ Break between matches control value:', this.scheduleForm.get('breakBetweenMatches')?.value);
                
                // Set flags to show pre-populated state
                this.isFormPrePopulated = true;
                this.prePopulatedValues = currentValues;
                
                // Mark all form controls as touched to ensure they display properly
                Object.keys(this.scheduleForm.controls).forEach(key => {
                  this.scheduleForm.get(key)?.markAsTouched();
                  this.scheduleForm.get(key)?.updateValueAndValidity();
                });
              }, 100);
            }
          } else {
            console.log('ℹ️ No existing schedule found, using recommended values');
            
            // Set recommended values only if no existing schedule
            this.scheduleForm.patchValue({
              startDate: new Date(this.selectedTournament!.startDate),
              endDate: new Date(this.selectedTournament!.endDate),
              timeSlotDuration: this.optimizationData.recommendedSlotDuration,
              startTime: this.optimizationData.recommendedStartTime
            });
          }
        },
        error: (error) => {
          console.log('❌ Error checking for existing schedule, using recommended values:', error);
          
          // Set recommended values if API call fails
          this.scheduleForm.patchValue({
            startDate: new Date(this.selectedTournament!.startDate),
            endDate: new Date(this.selectedTournament!.endDate),
            timeSlotDuration: this.optimizationData.recommendedSlotDuration,
            startTime: this.optimizationData.recommendedStartTime
          });
        }
      });
    }
  }


  toggleCourt(courtId: string): void {
    const index = this.selectedCourts.indexOf(courtId);
    if (index > -1) {
      this.selectedCourts.splice(index, 1);
    } else {
      this.selectedCourts.push(courtId);
    }
    this.courtForm.patchValue({ selectedCourts: this.selectedCourts });
  }

  isCourtSelected(courtId: string): boolean {
    return this.selectedCourts.includes(courtId);
  }

  getCourtName(courtId: string): string {
    const court = this.availableCourts.find(c => c._id === courtId);
    return court ? court.name : 'Unknown Court';
  }

  generateSchedule(): void {
    // Debug what's missing
    console.log('🔍 Generate schedule validation:');
    console.log('Selected tournament:', this.selectedTournament);
    console.log('Selected courts:', this.selectedCourts);
    console.log('Schedule form valid:', this.scheduleForm.valid);
    console.log('Schedule form value:', this.scheduleForm.value);
    console.log('Schedule form errors:', this.getFormErrors());

    if (!this.selectedTournament) {
      this.snackBar.open('No tournament selected', 'Close', { duration: 3000 });
      return;
    }

    if (this.selectedCourts.length === 0) {
      this.snackBar.open('Please select at least one court', 'Close', { duration: 3000 });
      return;
    }

    if (!this.scheduleForm.valid) {
      this.snackBar.open('Please fill in all schedule configuration fields', 'Close', { duration: 3000 });
      return;
    }

    this.isGenerating = true;
    
    // Format dates properly for backend
    const startDate = this.scheduleForm.get('startDate')?.value;
    const endDate = this.scheduleForm.get('endDate')?.value;
    
    const request: ScheduleRequest = {
      tournamentId: this.selectedTournament._id!,
      startDate: startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate,
      endDate: endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate,
      courts: this.selectedCourts,
      timeSlotDuration: Number(this.scheduleForm.get('timeSlotDuration')?.value),
      startTime: this.scheduleForm.get('startTime')?.value,
      endTime: this.scheduleForm.get('endTime')?.value,
      breakBetweenMatches: Number(this.scheduleForm.get('breakBetweenMatches')?.value)
    };

    console.log('🔍 Generate schedule request data:', request);
    console.log('📋 Form validity:', this.scheduleForm.valid);
    console.log('📝 Form errors:', this.getFormErrors());

    this.schedulingService.generateSchedule(request).subscribe({
      next: (schedule) => {
        this.generatedSchedule = schedule;
        this.isGenerating = false;
        this.snackBar.open('Schedule generated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Advance to the next step (Step 3: Review & Complete)
        if (this.stepper) {
          this.stepper.next();
        }
      },
      error: (error) => {
        console.error('❌ Error generating schedule:', error);
        console.error('📄 Error details:', error.error);
        console.error('📊 Error status:', error.status);
        console.error('💬 Error message:', error.message);
        
        this.isGenerating = false;
        
        const errorMessage = error.error?.message || error.message || 'Failed to generate schedule';
        this.snackBar.open(`Failed to generate schedule: ${errorMessage}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  viewSchedule(): void {
    if (this.generatedSchedule) {
      this.router.navigate(['/schedule/view', this.generatedSchedule.tournamentId]);
    }
  }

  startOver(): void {
    this.selectedTournament = null;
    this.selectedCourts = [];
    this.generatedSchedule = null;
    this.optimizationData = null;
    this.tournamentForm.reset();
    this.courtForm.reset();
    this.scheduleForm.reset();
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  estimateMatchCount(tournament: Tournament): number {
    // Simplified estimation - would need proper bracket calculation
    const players = tournament.currentPlayers;
    switch (tournament.format) {
      case 'single-elimination': return players - 1;
      case 'double-elimination': return (players - 1) * 2;
      case 'round-robin': return (players * (players - 1)) / 2;
      default: return players;
    }
  }

  getDailySlots(): number {
    const startTime = this.scheduleForm.get('startTime')?.value || '09:00';
    const endTime = this.scheduleForm.get('endTime')?.value || '18:00';
    const slotDuration = this.scheduleForm.get('timeSlotDuration')?.value || 90;
    const breakTime = this.scheduleForm.get('breakBetweenMatches')?.value || 15;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const slotWithBreak = slotDuration + breakTime;
    
    return Math.floor(totalMinutes / slotWithBreak);
  }

  getTotalSlots(): number {
    return this.getDailySlots() * this.selectedCourts.length * this.getDurationDays();
  }

  getDurationDays(): number {
    const startDate = this.scheduleForm.get('startDate')?.value;
    const endDate = this.scheduleForm.get('endDate')?.value;
    
    if (!startDate || !endDate) return 1;
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Court requirement validation methods
  getRequirementStatusClass(): string {
    if (!this.selectedTournament) return '';
    
    const required = this.selectedTournament.requiredCourts || 1;
    const selected = this.selectedCourts.length;
    
    if (selected === required) return 'status-optimal';
    if (selected < required) return 'status-insufficient';
    return 'status-excessive';
  }

  getRequirementStatusIcon(): string {
    if (!this.selectedTournament) return 'info';
    
    const required = this.selectedTournament.requiredCourts || 1;
    const selected = this.selectedCourts.length;
    
    if (selected === required) return 'check_circle';
    if (selected < required) return 'warning';
    return 'info';
  }

  getRequirementStatusText(): string {
    if (!this.selectedTournament) return 'Select courts for this tournament';
    
    const required = this.selectedTournament.requiredCourts || 1;
    const selected = this.selectedCourts.length;
    
    if (selected === 0) {
      return `This tournament requires ${required} court${required > 1 ? 's' : ''}`;
    }
    
    if (selected === required) {
      return `Perfect! You've selected the optimal number of courts`;
    }
    
    if (selected < required) {
      const remaining = required - selected;
      return `${remaining} more court${remaining > 1 ? 's' : ''} needed for optimal scheduling`;
    }
    
    const excess = selected - required;
    return `${excess} extra court${excess > 1 ? 's' : ''} selected (more than required)`;
  }

  getCourtProgress(): number {
    if (!this.selectedTournament) return 0;
    
    const required = this.selectedTournament.requiredCourts || 1;
    const selected = this.selectedCourts.length;
    
    return Math.min((selected / required) * 100, 100);
  }

  // Helper method to debug form errors
  getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.scheduleForm.controls).forEach(key => {
      const control = this.scheduleForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // Helper method to validate MongoDB ObjectId format
  private isValidObjectId(id: string): boolean {
    // MongoDB ObjectId is 24 character hex string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}