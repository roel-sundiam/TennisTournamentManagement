import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchService, ScheduledMatch } from '../../services/match.service';
import { SchedulingService, TimeSlot } from '../../services/scheduling.service';

interface RescheduleDialogData {
  match: ScheduledMatch;
  tournamentId: string;
}

interface AvailableTimeSlot extends TimeSlot {
  displayName: string;
  isCurrentSlot: boolean;
}

@Component({
  selector: 'app-reschedule-match-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="reschedule-dialog">
      <h2 mat-dialog-title>
        <mat-icon>event</mat-icon>
        Reschedule Match
      </h2>

      <mat-dialog-content>
        <!-- Match Info -->
        <div class="match-info">
          <h3>{{ data.match.team1.name }} vs {{ data.match.team2.name }}</h3>
          <p class="match-details">
            Round {{ data.match.round }} - Match {{ data.match.matchNumber }}
          </p>
          <p class="current-schedule" *ngIf="data.match.scheduledDateTime">
            <strong>Current Schedule:</strong> {{ getCurrentScheduleDisplay() }}
          </p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
          <p>Loading available time slots...</p>
        </div>

        <!-- Time Slot Selection -->
        <div *ngIf="!isLoading" class="time-slot-selection">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select New Time Slot</mat-label>
            <mat-select [(value)]="selectedTimeSlotId" (selectionChange)="onTimeSlotSelected()">
              <mat-optgroup *ngFor="let group of groupedTimeSlots" [label]="group.date">
                <mat-option 
                  *ngFor="let slot of group.slots" 
                  [value]="slot._id"
                  [disabled]="slot.isCurrentSlot">
                  <div class="time-slot-option">
                    <div class="slot-time">
                      {{ slot.displayName }}
                      <span *ngIf="slot.isCurrentSlot" class="current-badge">(Current)</span>
                    </div>
                    <div class="slot-court" *ngIf="slot.court">
                      Court: {{ slot.court }}
                    </div>
                  </div>
                </mat-option>
              </mat-optgroup>
            </mat-select>
            <mat-hint>Choose an available time slot for this match</mat-hint>
          </mat-form-field>

          <!-- No slots available message -->
          <div *ngIf="availableTimeSlots.length === 0" class="no-slots-message">
            <mat-icon>info</mat-icon>
            <p>No other time slots are available for rescheduling.</p>
          </div>
        </div>

        <!-- Preview -->
        <div *ngIf="selectedTimeSlot" class="reschedule-preview">
          <h4>New Schedule Preview:</h4>
          <div class="preview-card">
            <div class="preview-item">
              <mat-icon>schedule</mat-icon>
              <span>{{ getNewScheduleDisplay() }}</span>
            </div>
            <div class="preview-item" *ngIf="selectedTimeSlot.court">
              <mat-icon>sports_tennis</mat-icon>
              <span>{{ selectedTimeSlot.court }}</span>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button 
          mat-raised-button 
          color="primary"
          [disabled]="!selectedTimeSlotId || isRescheduling"
          (click)="onReschedule()">
          <mat-icon *ngIf="isRescheduling">hourglass_empty</mat-icon>
          <mat-icon *ngIf="!isRescheduling">event</mat-icon>
          {{ isRescheduling ? 'Rescheduling...' : 'Reschedule Match' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .reschedule-dialog {
      min-width: 500px;
      max-width: 600px;
    }

    .match-info {
      margin-bottom: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .match-info h3 {
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .match-details {
      margin: 4px 0;
      color: #666;
      font-size: 14px;
    }

    .current-schedule {
      margin: 8px 0 0 0;
      font-size: 14px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      text-align: center;
    }

    .loading-container p {
      margin-top: 16px;
      color: #666;
    }

    .time-slot-selection {
      margin: 16px 0;
    }

    .full-width {
      width: 100%;
    }

    .time-slot-option {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .slot-time {
      font-weight: 500;
    }

    .current-badge {
      color: #4caf50;
      font-size: 12px;
      font-weight: 400;
    }

    .slot-court {
      font-size: 12px;
      color: #666;
    }

    .no-slots-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      color: #856404;
    }

    .reschedule-preview {
      margin-top: 16px;
      padding: 16px;
      background: #e8f5e8;
      border-radius: 8px;
    }

    .reschedule-preview h4 {
      margin: 0 0 12px 0;
      color: #2e7d32;
    }

    .preview-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .preview-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .preview-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #4caf50;
    }

    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    mat-dialog-actions {
      margin-top: 16px;
    }

    @media (max-width: 600px) {
      .reschedule-dialog {
        min-width: auto;
        width: 90vw;
      }
    }
  `]
})
export class RescheduleMatchDialogComponent implements OnInit {
  availableTimeSlots: AvailableTimeSlot[] = [];
  groupedTimeSlots: { date: string; slots: AvailableTimeSlot[] }[] = [];
  selectedTimeSlotId: string = '';
  selectedTimeSlot: AvailableTimeSlot | null = null;
  isLoading = true;
  isRescheduling = false;

  constructor(
    public dialogRef: MatDialogRef<RescheduleMatchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RescheduleDialogData,
    private matchService: MatchService,
    private schedulingService: SchedulingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAvailableTimeSlots();
  }

  loadAvailableTimeSlots(): void {
    this.isLoading = true;
    
    this.schedulingService.getTournamentSchedule(this.data.tournamentId).subscribe({
      next: (schedule) => {
        // Filter for available time slots and add display information
        this.availableTimeSlots = schedule.timeSlots
          .filter(slot => slot.status === 'available' || slot._id === this.data.match.scheduledTimeSlot?._id)
          .map(slot => ({
            ...slot,
            displayName: this.formatTimeSlotDisplay(slot),
            isCurrentSlot: slot._id === this.data.match.scheduledTimeSlot?._id
          }));

        this.groupTimeSlotsByDate();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading time slots:', error);
        this.snackBar.open('Failed to load available time slots', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  groupTimeSlotsByDate(): void {
    const groups: { [date: string]: AvailableTimeSlot[] } = {};
    
    this.availableTimeSlots.forEach(slot => {
      const date = new Date(slot.startTime).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(slot);
    });

    this.groupedTimeSlots = Object.keys(groups).map(date => ({
      date: this.formatDateDisplay(new Date(date)),
      slots: groups[date].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    })).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  formatTimeSlotDisplay(slot: TimeSlot): string {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    
    return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }

  getCurrentScheduleDisplay(): string {
    if (!this.data.match.scheduledDateTime) return 'Not scheduled';
    
    const date = new Date(this.data.match.scheduledDateTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getNewScheduleDisplay(): string {
    if (!this.selectedTimeSlot) return '';
    
    const date = new Date(this.selectedTimeSlot.startTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  onTimeSlotSelected(): void {
    this.selectedTimeSlot = this.availableTimeSlots.find(
      slot => slot._id === this.selectedTimeSlotId
    ) || null;
  }

  onReschedule(): void {
    if (!this.selectedTimeSlotId || this.selectedTimeSlot?.isCurrentSlot) {
      return;
    }

    this.isRescheduling = true;

    this.matchService.rescheduleMatch(this.data.match._id, {
      newTimeSlotId: this.selectedTimeSlotId
    }).subscribe({
      next: (response) => {
        this.snackBar.open('Match rescheduled successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close({ rescheduled: true });
      },
      error: (error) => {
        console.error('Error rescheduling match:', error);
        this.snackBar.open('Failed to reschedule match', 'Close', { duration: 3000 });
        this.isRescheduling = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close({ rescheduled: false });
  }
}