import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatchService, ScheduledMatch, SwapRequest } from '../../services/match.service';
import { SchedulingService, TournamentSchedule, TimeSlot } from '../../services/scheduling.service';
import { RescheduleMatchDialogComponent } from './reschedule-match-dialog.component';

@Component({
  selector: 'app-matches-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTableModule,
    DragDropModule
  ],
  templateUrl: './matches-view.component.html',
  styleUrls: ['./matches-view.component.scss']
})
export class MatchesViewComponent implements OnInit {
  @Input() tournamentId!: string;

  matches: ScheduledMatch[] = [];
  matchesByDay: { date: string; matches: ScheduledMatch[] }[] = [];
  rounds: { number: number; matches: ScheduledMatch[] }[] = [];
  availableTimeSlots: TimeSlot[] = [];
  timeSlotsByDay: { date: string; timeSlots: TimeSlot[] }[] = [];
  connectedDropLists: string[] = [];
  isLoading = false;
  selectedViewIndex = 0;
  isDragDropEnabled = false; // Start with drag & drop disabled

  displayedColumns: string[] = ['match', 'teams', 'schedule', 'court', 'status', 'actions'];

  constructor(
    private matchService: MatchService,
    private schedulingService: SchedulingService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.tournamentId) {
      this.loadMatches();
      this.loadAvailableTimeSlots();
    }
  }

  loadMatches(): void {
    this.isLoading = true;
    console.log('🔍 Loading matches for tournament:', this.tournamentId);
    this.matchService.getTournamentMatches(this.tournamentId).subscribe({
      next: (response) => {
        console.log('📊 Matches response:', response);
        this.matches = response.data;
        console.log('📋 Processed matches:', this.matches);
        this.organizeMatchesByDay();
        this.organizeMatchesByRound();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading matches:', error);
        this.snackBar.open('Failed to load matches', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  organizeMatchesByDay(): void {
    console.log('📅 Organizing matches by day:', this.matches.length, 'matches');
    const dayGroups: { [date: string]: ScheduledMatch[] } = {};
    
    this.matches.forEach(match => {
      console.log('🔍 Processing match:', match);
      if (match.scheduledDateTime) {
        const date = new Date(match.scheduledDateTime).toDateString();
        console.log('📅 Match date:', date);
        if (!dayGroups[date]) {
          dayGroups[date] = [];
        }
        dayGroups[date].push(match);
      } else {
        console.log('⚠️ Match has no scheduledDateTime:', match);
      }
    });

    this.matchesByDay = Object.keys(dayGroups).map(date => ({
      date,
      matches: dayGroups[date].sort((a, b) => 
        new Date(a.scheduledDateTime!).getTime() - new Date(b.scheduledDateTime!).getTime()
      )
    }));
    
    console.log('📊 Final matchesByDay:', this.matchesByDay);
  }

  organizeMatchesByRound(): void {
    const roundGroups: { [round: number]: ScheduledMatch[] } = {};
    
    this.matches.forEach(match => {
      if (!roundGroups[match.round]) {
        roundGroups[match.round] = [];
      }
      roundGroups[match.round].push(match);
    });

    this.rounds = Object.keys(roundGroups).map(round => ({
      number: parseInt(round),
      matches: roundGroups[parseInt(round)].sort((a, b) => a.matchNumber - b.matchNumber)
    })).sort((a, b) => a.number - b.number);
  }

  refreshMatches(): void {
    this.loadMatches();
  }

  loadAvailableTimeSlots(): void {
    this.schedulingService.getTournamentSchedule(this.tournamentId).subscribe({
      next: (schedule) => {
        this.availableTimeSlots = schedule.timeSlots || [];
        this.organizeTimeSlotsByDay();
      },
      error: (error) => {
        console.error('Error loading time slots:', error);
      }
    });
  }

  organizeTimeSlotsByDay(): void {
    const dayGroups: { [date: string]: TimeSlot[] } = {};
    
    this.availableTimeSlots.forEach(slot => {
      const date = new Date(slot.startTime).toDateString();
      if (!dayGroups[date]) {
        dayGroups[date] = [];
      }
      dayGroups[date].push(slot);
    });

    this.timeSlotsByDay = Object.keys(dayGroups).map(date => ({
      date,
      timeSlots: dayGroups[date].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    }));
    
    // Set up connected drop lists for drag & drop
    this.connectedDropLists = this.availableTimeSlots.map(slot => 'drop-' + slot._id!).filter(id => id);
    console.log('🔗 Connected drop lists:', this.connectedDropLists.length);
  }

  // View methods
  getMatchTimeDisplay(match: ScheduledMatch): string {
    if (!match.scheduledDateTime) {
      return 'Not scheduled';
    }
    const date = new Date(match.scheduledDateTime);
    return date.toLocaleString();
  }

  getMatchStatusColor(status: string): string {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in-progress': return 'warn';
      case 'completed': return 'accent';
      default: return 'basic';
    }
  }

  hasScore(match: ScheduledMatch): boolean {
    return match.score && match.score.tennisScore && 
           (match.status === 'in-progress' || match.status === 'completed');
  }

  getMatchScore(match: ScheduledMatch): string {
    if (!match.score || !match.score.tennisScore) {
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

  canRescheduleMatch(match: ScheduledMatch): boolean {
    return match.status === 'scheduled';
  }

  getCourtDisplay(court: any): string {
    if (!court) return '';
    
    // If court is a string, return it directly
    if (typeof court === 'string') {
      return court;
    }
    
    // If court is an object with name property
    if (court.name) {
      return court.name;
    }
    
    // If court is an object with displayName property
    if (court.displayName) {
      return court.displayName;
    }
    
    // Fallback to string representation
    return court.toString();
  }

  getTeamName(team: any): string {
    if (!team) return 'Team';
    
    // If team is a string, return it directly
    if (typeof team === 'string') {
      return team;
    }
    
    // If team is an object with name property
    if (team.name) {
      return team.name;
    }
    
    // If team is an object with displayName property
    if (team.displayName) {
      return team.displayName;
    }
    
    // If team has players array, create a team name from players
    if (team.players && Array.isArray(team.players)) {
      const playerNames = team.players.map((player: any) => 
        player.name || player.displayName || 'Player'
      ).slice(0, 2); // Take first 2 players for doubles
      return playerNames.join(' & ');
    }
    
    // Fallback
    return 'Team';
  }

  // Action methods
  startMatch(match: ScheduledMatch): void {
    this.router.navigate(['/scoring/match', match._id]);
  }

  editScore(match: ScheduledMatch): void {
    this.router.navigate(['/scoring/match', match._id]);
  }

  canEditScore(match: ScheduledMatch): boolean {
    return match.status === 'in-progress' || match.status === 'completed';
  }

  openRescheduleDialog(match: ScheduledMatch): void {
    // Implementation for reschedule dialog
    console.log('Reschedule match:', match);
  }

  goToScheduleBuilder(): void {
    if (this.tournamentId) {
      this.router.navigate(['/schedule/builder'], {
        queryParams: { tournament: this.tournamentId }
      });
    } else {
      this.router.navigate(['/schedule/builder']);
    }
  }

  // Drag & Drop methods
  toggleDragDrop(): void {
    this.isDragDropEnabled = !this.isDragDropEnabled;
    console.log('🔄 Drag & Drop toggled:', this.isDragDropEnabled ? 'ENABLED' : 'DISABLED');
  }

  onDragStarted(event: any): void {
    console.log('🏁 Drag started:', event);
  }

  onDragEnded(event: any): void {
    console.log('🏁 Drag ended:', event);
  }

  onMatchDrop(event: CdkDragDrop<TimeSlot>): void {
    console.log('🔍 Match drop event triggered');
    console.log('🔍 Previous container:', event.previousContainer.data);
    console.log('🔍 Current container:', event.container.data);
    console.log('🔍 Dragged item:', event.item.data);
    
    if (event.previousContainer === event.container) {
      console.log('🔍 Same container - no reschedule needed');
      return;
    }
    
    // Move between different time slots
    const match = event.item.data as ScheduledMatch;
    const targetTimeSlot = event.container.data as TimeSlot;
    
    console.log('🔍 Attempting to reschedule match:', match._id, 'to slot:', targetTimeSlot._id);
    console.log('🔍 Match data:', match);
    console.log('🔍 Target time slot data:', targetTimeSlot);
    
    // Call backend to reschedule the match
    this.schedulingService.rescheduleMatch(match._id, targetTimeSlot._id!).subscribe({
      next: (response) => {
        console.log('✅ Match rescheduled successfully:', response);
        
        // Update local data
        match.scheduledDateTime = new Date(targetTimeSlot.startTime);
        match.scheduledTimeSlot = {
          _id: targetTimeSlot._id!,
          startTime: targetTimeSlot.startTime,
          endTime: targetTimeSlot.endTime,
          court: typeof targetTimeSlot.court === 'string' ? targetTimeSlot.court : targetTimeSlot.court?.name || null,
          status: targetTimeSlot.status
        };
        match.court = typeof targetTimeSlot.court === 'string' ? targetTimeSlot.court : (targetTimeSlot.court?.name || 'Court 1');
        
        // Refresh the views
        this.organizeMatchesByDay();
        this.organizeTimeSlotsByDay();
        
        this.snackBar.open('Match rescheduled successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('❌ Error rescheduling match:', error);
        console.error('❌ Error details:', error.error);
        this.snackBar.open(`Failed to reschedule match: ${error.error?.message || error.message}`, 'Close', { duration: 5000 });
        
        // Revert the drag operation by refreshing data
        this.loadMatches();
        this.loadAvailableTimeSlots();
      }
    });
  }

  getMatchesInTimeSlot(timeSlot: TimeSlot): ScheduledMatch[] {
    if (!timeSlot || !timeSlot._id) {
      return [];
    }
    
    // First try to match by scheduledTimeSlot ID (more accurate)
    const matchesInSlot = this.matches.filter(match => {
      if (!match.scheduledTimeSlot) {
        return false;
      }
      
      // Handle both object and string cases for scheduledTimeSlot
      const matchTimeSlotId = typeof match.scheduledTimeSlot === 'string' 
        ? match.scheduledTimeSlot 
        : match.scheduledTimeSlot._id;
      
      return matchTimeSlotId === timeSlot._id;
    });
    
    // Debug logging to see what's happening
    if (matchesInSlot.length > 0) {
      console.log(`🎾 Found ${matchesInSlot.length} matches in time slot:`, 
        this.getTimeSlotDisplayName(timeSlot));
    }
    
    return matchesInSlot;
  }

  getTimeSlotDisplayName(timeSlot: TimeSlot): string {
    const start = new Date(timeSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(timeSlot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${start} - ${end}`;
  }

  hasUnscheduledMatches(): boolean {
    return this.matches.some(match => !match.scheduledDateTime);
  }

  fixSchedule(): void {
    console.log('🔧 Fixing schedule for tournament:', this.tournamentId);
    
    this.schedulingService.fixSchedule(this.tournamentId).subscribe({
      next: (response) => {
        console.log('✅ Schedule fixed:', response);
        this.snackBar.open(response.message, 'Close', { duration: 5000 });
        
        // Refresh the matches and time slots
        this.loadMatches();
        this.loadAvailableTimeSlots();
      },
      error: (error) => {
        console.error('❌ Error fixing schedule:', error);
        this.snackBar.open('Failed to fix schedule', 'Close', { duration: 3000 });
      }
    });
  }
}