import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBadgeModule } from '@angular/material/badge';
import { TournamentService } from '../../../services/tournament.service';
import { SchedulingService } from '../../../services/scheduling.service';
import { Tournament } from '../../../models/tournament.model';
import { Component as NgComponent, Inject } from '@angular/core';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatToolbarModule,
    MatBadgeModule
  ],
  templateUrl: './tournament-list.component.html',
  styleUrls: ['./tournament-list.component.scss']
})
export class TournamentListComponent implements OnInit {
  tournaments: Tournament[] = [];
  filteredTournaments: Tournament[] = [];
  selectedFilter = 'all';
  tournamentsWithSchedules: Set<string> = new Set();
  selectedTournament: Tournament | null = null;
  sidebarOpen = false;
  
  statusFilters = [
    { value: 'all', label: 'All Tournaments', icon: 'list' },
    { value: 'in-progress', label: 'In Progress', icon: 'play_circle' },
    { value: 'completed', label: 'Completed', icon: 'check_circle' },
    { value: 'cancelled', label: 'Cancelled', icon: 'cancel' }
  ];

  constructor(
    private tournamentService: TournamentService,
    private schedulingService: SchedulingService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.tournamentService.getAllTournaments().subscribe(tournaments => {
      this.tournaments = tournaments;
      this.checkForExistingSchedules();
      this.applyFilter();
    });
  }

  checkForExistingSchedules(): void {
    this.tournaments.forEach(tournament => {
      this.schedulingService.getTournamentSchedule(tournament._id!).subscribe({
        next: (schedule) => {
          if (schedule && schedule.timeSlots && schedule.timeSlots.length > 0) {
            this.tournamentsWithSchedules.add(tournament._id!);
          }
        },
        error: () => {
          // Schedule doesn't exist, which is fine
        }
      });
    });
  }

  onFilterChange(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.selectedFilter === 'all') {
      this.filteredTournaments = this.tournaments;
    } else {
      this.filteredTournaments = this.tournaments.filter(
        tournament => tournament.status === this.selectedFilter
      );
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'registration-open': return 'primary';
      case 'in-progress': return 'accent';
      case 'completed': return 'warn';
      default: return '';
    }
  }

  getFormatDisplay(format: string): string {
    switch (format) {
      case 'single-elimination': return 'Single Elimination';
      case 'double-elimination': return 'Double Elimination';
      case 'round-robin': return 'Round Robin';
      default: return format;
    }
  }

  getStatusCount(status: string): number {
    if (status === 'all') {
      return this.tournaments.length;
    }
    return this.tournaments.filter(t => t.status === status).length;
  }

  setFilter(status: string): void {
    this.selectedFilter = status;
    this.applyFilter();
  }

  deleteTournament(tournamentId: string, tournamentName: string): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialog, {
      width: '400px',
      data: { tournamentName }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'delete') {
        this.tournamentService.deleteTournament(tournamentId).subscribe({
          next: () => {
            this.snackBar.open('Tournament deleted successfully', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadTournaments();
          },
          error: (error) => {
            this.snackBar.open('Failed to delete tournament', 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
            console.error('Delete error:', error);
          }
        });
      }
    });
  }

  hasSchedule(tournament: Tournament): boolean {
    // Check if this tournament actually has a schedule with time slots
    return this.tournamentsWithSchedules.has(tournament._id!);
  }

  canCreateSchedule(tournament: Tournament): boolean {
    // Allow creating schedules for tournaments that have players and are active
    // More permissive conditions to make the button visible
    return tournament.status !== 'cancelled' && 
           tournament.status !== 'draft' &&
           tournament.currentPlayers > 0;
  }

  openTournamentSidebar(tournament: Tournament): void {
    this.selectedTournament = tournament;
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    this.selectedTournament = null;
  }

  createSchedule(): void {
    if (this.selectedTournament) {
      console.log('🔍 Navigating to schedule builder for tournament:', this.selectedTournament._id);
      this.router.navigate(['/schedule/builder'], {
        queryParams: { tournament: this.selectedTournament._id }
      });
      this.closeSidebar();
    }
  }

  handleActionClick(action: any): void {
    if (action.action === 'createSchedule') {
      this.createSchedule();
    } else if (action.route) {
      this.closeSidebar();
    }
  }

  getSidebarActions() {
    if (!this.selectedTournament) return [];
    
    console.log('🔍 Selected tournament ID:', this.selectedTournament._id);
    
    const actions = [
      {
        icon: 'how_to_reg',
        label: 'Register Players',
        route: `/tournaments/${this.selectedTournament._id}/register`,
        color: 'primary',
        description: 'Add and manage tournament participants',
        available: this.selectedTournament.status === 'registration-open' || this.selectedTournament.status === 'draft'
      },
      {
        icon: 'reorder',
        label: 'Player Seeding',
        route: `/tournaments/${this.selectedTournament._id}/seeding`,
        color: 'accent',
        description: 'Set player rankings and match order',
        available: true
      },
      {
        icon: 'groups',
        label: 'Teams',
        route: `/tournaments/${this.selectedTournament._id}/teams`,
        color: 'primary',
        description: 'Organize players into teams',
        available: true
      },
      {
        icon: 'sports_tennis',
        label: 'Tournament Management',
        route: `/tournaments/${this.selectedTournament._id}/manage`,
        color: 'accent',
        description: 'Complete tournament control center',
        available: true
      },
      {
        icon: 'schedule',
        label: 'Create Schedule',
        route: null,
        action: 'createSchedule',
        color: 'primary',
        description: 'Build match schedules and timelines',
        available: !this.hasSchedule(this.selectedTournament) && this.canCreateSchedule(this.selectedTournament)
      },
      {
        icon: 'edit',
        label: 'Edit Tournament',
        route: `/tournaments/${this.selectedTournament._id}/edit`,
        color: 'warn',
        description: 'Modify tournament settings',
        available: true
      }
    ];
    
    const filteredActions = actions.filter(action => action.available);
    console.log('🔍 Sidebar actions:', filteredActions);
    
    return filteredActions;
  }
}

@NgComponent({
  selector: 'delete-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2>Delete Tournament</h2>
      </div>
      <div class="dialog-message">
        <p>Are you sure you want to delete <strong>"{{ data.tournamentName }}"</strong>?</p>
        <p class="warning-text">This action cannot be undone and will permanently remove all tournament data.</p>
      </div>
      <div class="dialog-actions">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button mat-raised-button color="warn" (click)="onDelete()">
          <mat-icon>delete</mat-icon>
          Delete Tournament
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-content {
      padding: var(--space-6);
      text-align: center;
      border-radius: var(--border-radius-lg);
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    .warning-icon {
      color: var(--error-color);
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      background: rgba(244, 67, 54, 0.1);
      border-radius: 50%;
      padding: var(--space-2);
    }
    h2 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
    }
    .dialog-message {
      margin-bottom: var(--space-6);
    }
    .dialog-message p {
      font-size: var(--font-size-base);
      line-height: var(--line-height-normal);
      margin-bottom: var(--space-2);
    }
    .warning-text {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      margin-top: var(--space-2);
      padding: var(--space-3);
      background: rgba(244, 67, 54, 0.05);
      border-radius: var(--border-radius-md);
      border-left: 4px solid var(--error-color);
    }
    .dialog-actions {
      display: flex;
      gap: var(--space-3);
      justify-content: center;
    }
    .dialog-actions button {
      padding: var(--space-3) var(--space-5);
      border-radius: var(--border-radius-md);
      font-weight: var(--font-weight-medium);
      transition: all var(--duration-normal) var(--ease-out);
    }
    .dialog-actions button:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  `]
})
export class DeleteConfirmationDialog {
  constructor(
    public dialogRef: MatDialogRef<DeleteConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { tournamentName: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onDelete(): void {
    this.dialogRef.close('delete');
  }
}
