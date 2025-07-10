import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SchedulingService, TournamentSchedule, TimeSlot } from '../../services/scheduling.service';
import { TournamentService } from '../../services/tournament.service';
import { MatchService, ScheduledMatch } from '../../services/match.service';
import { Tournament } from '../../models/tournament.model';
import { Court } from '../../services/court.service';
import { MatchesViewComponent } from './matches-view.component';

@Component({
  selector: 'app-schedule-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatToolbarModule,
    MatTabsModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatchesViewComponent
  ],
  templateUrl: './schedule-view.component.html',
  styleUrls: ['./schedule-view.component.scss']
})
export class ScheduleViewComponent implements OnInit {
  @Input() tournamentId: string = '';
  tournament: Tournament | null = null;
  scheduleData: TournamentSchedule | null = null;
  matches: ScheduledMatch[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private schedulingService: SchedulingService,
    private tournamentService: TournamentService,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    console.log('🔍 ScheduleViewComponent ngOnInit called');
    console.log('🔍 Input tournamentId:', this.tournamentId);
    console.log('🔍 Current route URL:', window.location.href);
    
    // If tournamentId is provided as input, use it directly
    if (this.tournamentId) {
      console.log('🔍 Using input tournamentId:', this.tournamentId);
      this.loadScheduleData();
    } else {
      // Otherwise, get it from route parameters
      this.route.params.subscribe(params => {
        console.log('🔍 Route params:', params);
        this.tournamentId = params['id'];
        
        // Validate that the tournament ID is a valid MongoDB ObjectId format
        if (this.tournamentId && this.isValidObjectId(this.tournamentId)) {
          console.log('🔍 Valid tournament ID from route, loading data:', this.tournamentId);
          this.loadScheduleData();
        } else {
          console.log('⚠️ Invalid tournament ID format from route:', this.tournamentId);
          this.loading = false;
          // Don't show error message for invalid IDs, just don't load
        }
      });
    }
  }

  private isValidObjectId(id: string): boolean {
    // MongoDB ObjectId is 24 character hex string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  loadScheduleData(): void {
    this.loading = true;
    
    // Load tournament details
    this.tournamentService.getTournamentById(this.tournamentId).subscribe({
      next: (tournament) => {
        this.tournament = tournament;
      },
      error: (error) => {
        console.error('Error loading tournament:', error);
      }
    });

    // Load schedule data
    this.schedulingService.getTournamentSchedule(this.tournamentId).subscribe({
      next: (schedule) => {
        this.scheduleData = schedule;
        this.loading = false;
        console.log('📊 Schedule loaded:', schedule);
        console.log('🎾 Tournament:', schedule.tournamentId);
        console.log('⏰ Time slots count:', schedule.timeSlots?.length || 0);
        console.log('🏟️ Time slots sample:', schedule.timeSlots?.slice(0, 3));
      },
      error: (error) => {
        console.error('Error loading schedule:', error);
        this.loading = false;
        this.snackBar.open('Failed to load schedule', 'Close', { duration: 3000 });
      }
    });


    // Load matches
    this.matchService.getTournamentMatches(this.tournamentId).subscribe({
      next: (response) => {
        this.matches = response.data;
        console.log('🎾 Matches loaded:', this.matches);
      },
      error: (error) => {
        console.error('Error loading matches:', error);
      }
    });
  }


  // Utility Methods
  formatTimeSlot(slot: TimeSlot): string {
    return this.schedulingService.formatTimeSlot(slot);
  }


  getMatchNumber(matchId: string): string {
    // This would need to be implemented to get actual match numbers
    return '1';
  }

  getMatchTeams(matchId: string): string {
    const match = this.matches.find(m => m._id === matchId);
    if (match && match.team1 && match.team2) {
      return `${match.team1.name} vs ${match.team2.name}`;
    }
    return 'Match details unavailable';
  }

  getStatusChipClass(status: string): string {
    return `status-chip ${status}`;
  }

  getConflictIconClass(): string {
    const conflicts = this.scheduleData?.conflicts?.length || 0;
    return conflicts === 0 ? '' : conflicts < 3 ? 'warning' : 'error';
  }

  getConflictValueClass(): string {
    const conflicts = this.scheduleData?.conflicts?.length || 0;
    return conflicts === 0 ? '' : conflicts < 3 ? 'warning' : 'error';
  }

  getConflictCardClass(): string {
    const conflicts = this.scheduleData?.conflicts?.length || 0;
    return conflicts === 0 ? '' : conflicts < 3 ? 'conflict-warning' : 'conflict-error';
  }

  getConflictChipClass(type: string): string {
    return `conflict-${type}`;
  }

  getConflictIcon(type: string): string {
    switch (type) {
      case 'court_overlap': return 'sports_tennis';
      case 'player_double_booking': return 'people';
      case 'time_conflict': return 'schedule';
      default: return 'warning';
    }
  }

  // Action Methods
  editTimeSlot(slot: TimeSlot): void {
    console.log('Edit time slot:', slot);
  }

  moveMatch(slot: TimeSlot): void {
    console.log('Move match:', slot);
  }

  blockTimeSlot(slot: TimeSlot): void {
    this.schedulingService.blockTimeSlot(slot._id!, 'Manual block').subscribe({
      next: () => {
        this.snackBar.open('Time slot blocked', 'Close', { duration: 3000 });
        this.loadScheduleData();
      },
      error: (error) => {
        console.error('Error blocking time slot:', error);
        this.snackBar.open('Failed to block time slot', 'Close', { duration: 3000 });
      }
    });
  }

  manageCourtSchedule(court: Court): void {
    console.log('Manage court schedule:', court);
  }

  viewCourtDetails(court: Court): void {
    console.log('View court details:', court);
  }

  viewFullCourtSchedule(court: Court): void {
    console.log('View full court schedule:', court);
  }

  // Court match management methods
  startCourtMatch(matchId: string): void {
    this.router.navigate(['/scoring/match', matchId]);
  }

  viewCourtMatch(matchId: string): void {
    this.router.navigate(['/scoring/match', matchId]);
  }

  getMatchStatus(matchId: string): string {
    const match = this.matches.find(m => m._id === matchId);
    return match ? match.status : 'unknown';
  }

  // Score display methods
  getMatchScore(matchId: string): string {
    const match = this.matches.find(m => m._id === matchId);
    if (!match || !match.score || !match.score.tennisScore) {
      return '';
    }

    const score = match.score.tennisScore;
    if (match.status === 'completed') {
      return this.getFinalScore(score);
    } else if (match.status === 'in-progress') {
      return this.getLiveScore(score);
    }
    return '';
  }

  private getFinalScore(score: any): string {
    if (!score.sets || score.sets.length === 0) return '';
    
    const setSummary = score.sets
      .filter((set: any) => set.isCompleted)
      .map((set: any) => `${set.team1Games}-${set.team2Games}`)
      .join(', ');
    
    return setSummary;
  }

  private getLiveScore(score: any): string {
    if (!score) return '';
    
    // Current set score
    const currentSetScore = `${score.team1Games || 0}-${score.team2Games || 0}`;
    
    // Current game score
    let gameScore = '';
    if (score.team1Points !== undefined && score.team2Points !== undefined) {
      gameScore = ` (${this.formatGamePoints(score.team1Points)}-${this.formatGamePoints(score.team2Points)})`;
    }
    
    return currentSetScore + gameScore;
  }

  private formatGamePoints(points: number): string {
    switch (points) {
      case 0: return '0';
      case 1: return '15';
      case 2: return '30';
      case 3: return '40';
      default: return points.toString();
    }
  }

  hasMatchScore(matchId: string): boolean {
    const match = this.matches.find(m => m._id === matchId);
    return match && match.score && match.score.tennisScore && 
           (match.status === 'in-progress' || match.status === 'completed');
  }

  navigateToScheduleBuilder(): void {
    console.log('🔍 Navigating to schedule builder with tournamentId:', this.tournamentId);
    console.log('🔍 Tournament ID type:', typeof this.tournamentId);
    console.log('🔍 Tournament ID length:', this.tournamentId?.length);
    
    if (this.tournamentId) {
      // Navigate to schedule builder and let it handle tournament selection
      this.router.navigate(['/schedule/builder']);
    } else {
      console.error('❌ No tournament ID available for navigation');
    }
  }
}