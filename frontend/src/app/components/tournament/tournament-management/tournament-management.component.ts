import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBadgeModule } from '@angular/material/badge';
import { ThemePalette } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { BracketViewComponent } from '../../bracket/bracket-view/bracket-view.component';
import { ScheduleViewComponent } from '../../scheduling/schedule-view.component';
import { LiveScoringComponent } from '../../scoring/live-scoring/live-scoring.component';
import { TournamentService } from '../../../services/tournament.service';
import { ScoringService } from '../../../services/scoring.service';
import { WebSocketService } from '../../../services/websocket.service';
import { LiveStatisticsService } from '../../../services/live-statistics.service';
import { Tournament } from '../../../models/tournament.model';
import { LiveMatchSummary } from '../../../models/scoring.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tournament-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatBadgeModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    BracketViewComponent,
    ScheduleViewComponent,
    LiveScoringComponent
  ],
  templateUrl: './tournament-management.component.html',
  styleUrls: ['./tournament-management.component.scss']
})
export class TournamentManagementComponent implements OnInit, OnDestroy {
  tournamentId: string = '';
  tournament?: Tournament;
  selectedTabIndex = 0;
  hasLiveMatches = false;
  isInFinalsStage = false;
  
  // Live data
  liveMatches: LiveMatchSummary[] = [];
  completedMatchesToday = 0;
  tournamentProgress = 0;
  isWebSocketConnected = false;
  
  // Statistics
  totalMatches = 0;
  activeMatches = 0;
  scheduledMatches = 0;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private tournamentService: TournamentService,
    private scoringService: ScoringService,
    private websocketService: WebSocketService,
    private statisticsService: LiveStatisticsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Get tournament ID from route
    this.route.params.subscribe(params => {
      this.tournamentId = params['tournamentId'];
      this.loadTournament();
      this.setupLiveData();
    });

    // Check URL fragment or query param for initial tab
    this.route.fragment.subscribe(fragment => {
      switch (fragment) {
        case 'schedule': this.selectedTabIndex = 1; break;
        case 'live': this.selectedTabIndex = 2; break;
        default: this.selectedTabIndex = 0; break;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadTournament(): void {
    if (!this.tournamentId) return;

    this.tournamentService.getTournamentById(this.tournamentId).subscribe({
      next: (tournament) => {
        this.tournament = tournament;
        console.log('🏆 Loaded tournament:', tournament);
        this.checkFinalsStage();
      },
      error: (error) => {
        console.error('❌ Error loading tournament:', error);
      }
    });
  }

  checkFinalsStage(): void {
    if (!this.tournamentId) return;

    // Check if we're in the finals stage by looking at remaining matches
    this.http.get(`${environment.apiUrl}/api/matches/${this.tournamentId}`).subscribe({
      next: (response: any) => {
        const matches = response.data || [];
        console.log('🔍 Checking finals stage with matches:', matches);
        
        // Find the highest round number that has scheduled or in-progress matches
        const activeMatches = matches.filter((m: any) => 
          m.status === 'scheduled' || m.status === 'in-progress'
        );
        
        // Check if only final round matches remain active
        if (activeMatches.length > 0) {
          const maxRound = Math.max(...matches.map((m: any) => m.round));
          const finalRoundMatches = activeMatches.filter((m: any) => m.round === maxRound);
          
          // If all active matches are in the final round, we're in finals stage
          this.isInFinalsStage = finalRoundMatches.length === activeMatches.length && maxRound >= 3;
          
          console.log('🏁 Finals stage check:', {
            isInFinalsStage: this.isInFinalsStage,
            maxRound,
            activeMatches: activeMatches.length,
            finalRoundMatches: finalRoundMatches.length
          });
        }
      },
      error: (error) => {
        console.error('❌ Error checking finals stage:', error);
      }
    });
  }

  onTabChange(event: any): void {
    const fragments = ['bracket', 'schedule', 'live'];
    const fragment = fragments[event.index];
    
    // Update URL fragment without navigation
    this.router.navigate([], {
      fragment: fragment,
      replaceUrl: true
    });
  }

  formatGameFormat(gameFormat: string): string {
    switch (gameFormat) {
      case 'tiebreak-8':
        return '8-Game Tiebreak';
      case 'tiebreak-10':
        return '10-Game Tiebreak';
      case 'regular':
      default:
        return 'Regular Scoring';
    }
  }

  formatTournamentStatus(status: string): string {
    switch (status) {
      case 'registration-open':
        return 'Active'; // Replace with something more appropriate
      case 'registration-closed':
        return 'Ready';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'draft':
        return 'Draft';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  private setupLiveData(): void {
    // Subscribe to live matches
    const liveMatchesSub = this.scoringService.getLiveMatches().subscribe(matches => {
      this.liveMatches = matches;
      this.hasLiveMatches = matches.length > 0;
      this.activeMatches = matches.filter(m => m.status === 'in-progress').length;
      this.scheduledMatches = matches.filter(m => m.status === 'scheduled').length;
    });

    // Subscribe to WebSocket connection status
    const websocketSub = this.websocketService.connectionStatus$.subscribe(connected => {
      this.isWebSocketConnected = connected;
    });

    // Subscribe to tournament statistics
    const statsSub = this.statisticsService.getStatistics().subscribe(stats => {
      if (stats) {
        this.completedMatchesToday = stats.tournament.completedMatches;
        this.tournamentProgress = stats.tournament.completionPercentage;
        this.totalMatches = stats.tournament.totalMatches;
      }
    });

    // Subscribe to live score updates for notifications
    const scoreUpdateSub = this.websocketService.liveScoreUpdates$.subscribe(update => {
      if (update.score?.isMatchPoint) {
        this.showMatchPointNotification(update.matchId);
      }
    });

    // Subscribe to match events
    const matchEventSub = this.websocketService.matchEvents$.subscribe(event => {
      if (event.eventType === 'match_won') {
        this.showMatchCompletedNotification(event.matchId);
      }
    });

    this.subscriptions.push(liveMatchesSub, websocketSub, statsSub, scoreUpdateSub, matchEventSub);
  }

  private showMatchPointNotification(matchId: string): void {
    const match = this.liveMatches.find(m => m.matchId === matchId);
    if (match) {
      this.snackBar.open(
        `🎾 Match Point! ${match.player1Name} vs ${match.player2Name}`,
        'View',
        { duration: 8000 }
      ).onAction().subscribe(() => {
        this.selectedTabIndex = 2; // Switch to live tab
      });
    }
  }

  private showMatchCompletedNotification(matchId: string): void {
    const match = this.liveMatches.find(m => m.matchId === matchId);
    if (match) {
      this.snackBar.open(
        `🏆 Match Completed! ${match.player1Name} vs ${match.player2Name}`,
        'View Results',
        { duration: 10000 }
      ).onAction().subscribe(() => {
        this.selectedTabIndex = 2; // Switch to live tab
      });
    }
  }

  // Enhanced utility methods
  getTournamentProgressColor(): ThemePalette {
    if (this.tournamentProgress >= 80) return 'primary';
    if (this.tournamentProgress >= 50) return 'accent';
    return 'warn';
  }

  getConnectionStatusIcon(): string {
    return this.isWebSocketConnected ? 'wifi' : 'wifi_off';
  }

  getConnectionStatusText(): string {
    return this.isWebSocketConnected ? 'Live Connected' : 'Offline Mode';
  }

  getConnectionStatusColor(): string {
    return this.isWebSocketConnected ? 'primary' : 'warn';
  }

  refreshTournamentData(): void {
    this.loadTournament();
    this.statisticsService.refreshStatistics();
    this.snackBar.open('Tournament data refreshed', 'Close', { duration: 2000 });
  }

  getStatusBadgeClass(status: string): string {
    return `status-${status}`;
  }

  getActiveMatchesBadgeColor(): ThemePalette {
    if (this.activeMatches === 0) return undefined;
    if (this.activeMatches >= 5) return 'warn';
    return 'primary';
  }

  // Quick action methods
  quickStartMatch(): void {
    this.selectedTabIndex = 2; // Switch to live tab
    this.snackBar.open('Navigate to Live Matches to start a match', 'Close', { duration: 3000 });
  }

  viewBracket(): void {
    this.selectedTabIndex = 0; // Switch to bracket tab
  }

  viewSchedule(): void {
    this.selectedTabIndex = 1; // Switch to schedule tab
  }

  viewLiveMatches(): void {
    this.selectedTabIndex = 2; // Switch to live tab
  }
}