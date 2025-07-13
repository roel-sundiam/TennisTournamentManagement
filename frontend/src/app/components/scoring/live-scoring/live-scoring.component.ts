import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ScoringService } from '../../../services/scoring.service';
import { WebSocketService, LiveScoreUpdate, MatchEvent } from '../../../services/websocket.service';
import { LiveMatchSummary, MatchDetails } from '../../../models/scoring.model';
import { LiveScoringDialogComponent } from '../live-scoring-dialog/live-scoring-dialog.component';
import { LiveStatisticsComponent } from '../live-statistics/live-statistics.component';
import { AutomationPanelComponent } from '../automation-panel/automation-panel.component';

interface CompletedMatch {
  _id: string;
  tournament: { name: string };
  team1: { name: string };
  team2: { name: string };
  winner: { name: string };
  score: {
    tennisScore: any;
    endTime: string;
    duration: number;
    sets?: any[];
  };
  gameFormat: 'regular' | 'tiebreak-8' | 'tiebreak-10';
  court?: string;
  round?: string;
  player1Name?: string;
  player2Name?: string;
}

@Component({
  selector: 'app-live-scoring',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressBarModule,
    MatBadgeModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    LiveStatisticsComponent,
    AutomationPanelComponent
  ],
  templateUrl: './live-scoring.component.html',
  styleUrls: ['./live-scoring.component.scss']
})
export class LiveScoringComponent implements OnInit, OnDestroy {
  @Input() tournamentId?: string;
  liveMatches: LiveMatchSummary[] = [];
  completedMatches: CompletedMatch[] = [];
  
  // UI State
  viewMode: 'grid' | 'list' = 'grid';
  statusFilter: 'all' | 'in-progress' | 'scheduled' = 'all';
  autoRefreshEnabled = true;
  enableQuickScoring = true;
  isRefreshing = false;
  isUpdatingScore = false;
  
  // New filters for Final Scores
  formatFilter: 'all' | 'regular' | 'pro-set' | 'match-tiebreak' = 'all';
  sortBy: 'recent' | 'duration' | 'format' = 'recent';
  
  // Dashboard Data
  recentEvents: any[] = [];
  tournamentStartTime = new Date();
  
  private subscriptions: Subscription[] = [];
  private autoRefreshInterval?: any;

  constructor(
    private scoringService: ScoringService,
    private websocketService: WebSocketService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupAutoRefresh();
    // Disable WebSocket for simplified scoring system
    // this.setupWebSocketSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    this.websocketService.disconnect();
  }

  loadData(): void {
    this.loadLiveMatches();
    this.loadCompletedMatches();
  }

  private loadLiveMatches(): void {
    const subscription = this.scoringService.getLiveMatches().subscribe({
      next: (matches) => {
        this.liveMatches = matches;
        console.log('✅ Loaded live matches:', matches.length);
      },
      error: (error) => {
        console.error('❌ Error loading live matches:', error);
      }
    });
    
    this.subscriptions.push(subscription);
  }

  private loadCompletedMatches(): void {
    const subscription = this.scoringService.getCompletedMatches().subscribe({
      next: (response) => {
        this.completedMatches = response.data || [];
        console.log('✅ Loaded completed matches:', this.completedMatches.length);
      },
      error: (error) => {
        console.error('❌ Error loading completed matches:', error);
      }
    });
    
    this.subscriptions.push(subscription);
  }

  refreshData(): void {
    console.log('🔄 Refreshing data...');
    this.loadData();
  }

  addTestMatch(): void {
    const testMatch = this.scoringService.createTestMatch();
    this.liveMatches.push(testMatch);
    console.log('✅ Added test match:', testMatch);
  }

  openScoringDialog(match: LiveMatchSummary): void {
    const matchDetails: MatchDetails = {
      tournamentId: 'tournament-1',
      bracketId: 'bracket-1',
      matchId: match.matchId,
      player1: { id: '1', name: match.player1Name },
      player2: { id: '2', name: match.player2Name },
      status: match.status as any,
      score: match.score,
      court: match.court,
      matchFormat: 'best-of-3',
      gameFormat: match.gameFormat || 'regular'
    };

    const dialogRef = this.dialog.open(LiveScoringDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      height: '80vh',
      data: { match: matchDetails }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('🔄 Dialog closed, refreshing data');
        this.refreshData();
      }
    });
  }

  getGameFormatDisplay(format?: string): string {
    switch (format) {
      case 'tiebreak-8': return '8-Game Tiebreak';
      case 'tiebreak-10': return '10-Game Tiebreak';
      case 'regular':
      default: return 'Regular Tennis';
    }
  }

  getGameScore(match: LiveMatchSummary, player: 'player1' | 'player2'): string {
    if (!match.score) return '0';
    
    const games = player === 'player1' ? match.score.player1Games : match.score.player2Games;
    return (games || 0).toString();
  }

  formatPoints(points: number, score: any, player: 'player1' | 'player2'): string {
    if (!score) return points.toString();
    
    if (score.isDeuce) return 'Deuce';
    if (score.advantage) {
      return score.advantage === player ? 'Ad' : '40';
    }
    
    switch (points) {
      case 0: return '0';
      case 15: return '15';
      case 30: return '30';
      case 40: return '40';
      default: return points.toString();
    }
  }

  getAdvantagePlayer(match: LiveMatchSummary): string {
    if (!match.score?.advantage) return '';
    
    return match.score.advantage === 'player1' ? match.player1Name : match.player2Name;
  }

  getFinalScore(match: CompletedMatch, team: 'team1' | 'team2'): string {
    const tennisScore = match.score.tennisScore;
    
    switch (match.gameFormat) {
      case 'tiebreak-8':
      case 'tiebreak-10':
        return team === 'team1' ? 
          tennisScore.team1Games.toString() : 
          tennisScore.team2Games.toString();
      
      case 'regular':
      default:
        const sets = tennisScore.sets?.map((set: any) => 
          team === 'team1' ? set.team1Games : set.team2Games
        ).join(', ') || '0';
        return sets;
    }
  }

  formatCompletionTime(endTime?: string): string {
    if (!endTime) return 'Unknown';
    const date = new Date(endTime);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }

  formatDuration(minutes?: number): string {
    if (!minutes) return 'Unknown';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  // New Enhanced Methods

  setupAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.autoRefreshInterval = setInterval(() => {
        this.refreshData();
      }, 30000); // Refresh every 30 seconds
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      this.setupAutoRefresh();
      this.snackBar.open('Auto refresh enabled', 'Close', { duration: 2000 });
    } else {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
      }
      this.snackBar.open('Auto refresh disabled', 'Close', { duration: 2000 });
    }
  }

  getTotalPlayingTime(): string {
    if (this.liveMatches.length === 0) return '0h 0m';
    
    const totalMinutes = this.liveMatches
      .filter(match => match.elapsedTime)
      .reduce((total, match) => {
        const time = match.elapsedTime!;
        const parts = time.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return total + (hours * 60) + minutes;
      }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  }

  getFilteredMatches(): LiveMatchSummary[] {
    if (this.statusFilter === 'all') {
      return this.liveMatches;
    }
    return this.liveMatches.filter(match => match.status === this.statusFilter);
  }

  trackByMatchId(index: number, match: LiveMatchSummary): string {
    return match.matchId;
  }

  trackByCompletedMatchId(index: number, match: CompletedMatch): string {
    return match._id;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'in-progress': return 'play_circle';
      case 'scheduled': return 'schedule';
      case 'suspended': return 'pause_circle';
      case 'completed': return 'check_circle';
      default: return 'help';
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  getShortName(fullName: string): string {
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return fullName;
  }

  isPlayerServing(match: LiveMatchSummary, player: 'player1' | 'player2'): boolean {
    // Mock serving logic - in real app this would come from match data
    const gameSum = (match.score.player1Games || 0) + (match.score.player2Games || 0);
    return player === 'player1' ? gameSum % 2 === 0 : gameSum % 2 === 1;
  }

  getQuickScoreDisplay(match: LiveMatchSummary): string {
    const p1 = this.formatPoints(match.score.player1Points || 0, match.score, 'player1');
    const p2 = this.formatPoints(match.score.player2Points || 0, match.score, 'player2');
    return `${p1} - ${p2}`;
  }

  // Enhanced Action Methods

  showMatchHistory(match: LiveMatchSummary): void {
    // Implementation for showing match history
    this.snackBar.open('Opening match history...', 'Close', { duration: 2000 });
  }

  // Missing methods referenced in template

  getActiveMatchesCount(): number {
    return this.liveMatches.filter(match => match.status === 'in-progress').length;
  }

  getScheduledMatchesCount(): number {
    return this.liveMatches.filter(match => match.status === 'scheduled').length;
  }

  getTournamentProgress(): number {
    const total = this.liveMatches.length + this.completedMatches.length;
    if (total === 0) return 0;
    return Math.round((this.completedMatches.length / total) * 100);
  }

  getTournamentDuration(): string {
    const now = new Date();
    const diffMs = now.getTime() - this.tournamentStartTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  getAverageMatchTime(): string {
    if (this.completedMatches.length === 0) return '0m';
    const totalMinutes = this.completedMatches.reduce((sum, match) => sum + (match.score.duration || 0), 0);
    const average = Math.round(totalMinutes / this.completedMatches.length);
    return this.formatDuration(average);
  }

  getEstimatedCompletion(): string {
    const remainingMatches = this.getActiveMatchesCount() + this.getScheduledMatchesCount();
    if (remainingMatches === 0) return 'Completed';
    
    const avgDuration = this.completedMatches.length > 0 
      ? this.completedMatches.reduce((sum, match) => sum + (match.score.duration || 90), 0) / this.completedMatches.length
      : 90; // Default 90 minutes per match
    
    const estimatedMinutes = remainingMatches * avgDuration;
    const completionTime = new Date(Date.now() + estimatedMinutes * 60000);
    
    return completionTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }

  isCriticalMatch(match: LiveMatchSummary): boolean {
    return match.score?.isMatchPoint || match.score?.isSetPoint || false;
  }

  openFullScreenView(match: LiveMatchSummary): void {
    this.openScoringDialog(match);
  }

  viewMatchStats(match: LiveMatchSummary): void {
    this.snackBar.open('Opening match statistics...', 'Close', { duration: 2000 });
  }

  getMatchStatusDisplay(match: LiveMatchSummary): string {
    switch (match.status) {
      case 'in-progress': return 'LIVE';
      case 'scheduled': return 'SCHEDULED';
      case 'suspended': return 'SUSPENDED';
      case 'completed': return 'COMPLETED';
      default: return match.status.toUpperCase();
    }
  }

  hasSpecialConditions(match: LiveMatchSummary): boolean {
    return !!(match.score?.isMatchPoint || match.score?.isSetPoint || 
              match.score?.isDeuce || match.score?.advantage);
  }

  // WebSocket Integration

  private setupWebSocketSubscriptions(): void {
    console.log('🔌 Setting up WebSocket subscriptions for live scoring');

    // Subscribe to connection status
    const connectionSub = this.websocketService.connectionStatus$.subscribe(connected => {
      if (connected) {
        console.log('✅ WebSocket connected - subscribing to live updates');
        this.snackBar.open('Live updates connected', 'Close', { duration: 3000 });
        
        // Subscribe to tournament if specified
        if (this.tournamentId) {
          this.websocketService.subscribeToTournament(this.tournamentId);
        }
        
        // Subscribe to all current live matches
        this.liveMatches.forEach(match => {
          this.websocketService.subscribeToMatch(match.matchId);
        });
      } else {
        console.log('❌ WebSocket disconnected');
        this.snackBar.open('Live updates disconnected', 'Retry', { 
          duration: 5000
        }).onAction().subscribe(() => {
          this.websocketService.reconnect();
        });
      }
    });

    // Subscribe to live score updates
    const scoreUpdateSub = this.websocketService.liveScoreUpdates$.subscribe((update: LiveScoreUpdate) => {
      console.log('📊 Received live score update:', update);
      this.handleLiveScoreUpdate(update);
    });

    // Subscribe to match events
    const matchEventSub = this.websocketService.matchEvents$.subscribe((event: MatchEvent) => {
      console.log('🎾 Received match event:', event);
      this.handleMatchEvent(event);
    });

    this.subscriptions.push(connectionSub, scoreUpdateSub, matchEventSub);
  }

  private handleLiveScoreUpdate(update: LiveScoreUpdate): void {
    const matchIndex = this.liveMatches.findIndex(m => m.matchId === update.matchId);
    
    if (matchIndex >= 0) {
      // Update existing match
      this.liveMatches[matchIndex] = {
        ...this.liveMatches[matchIndex],
        score: update.score,
        status: update.status,
        lastUpdate: update.lastUpdate
      };
      
      console.log('✅ Updated live match:', this.liveMatches[matchIndex]);
      
      // Show notification for significant events
      if (update.score?.isMatchPoint) {
        this.snackBar.open(`Match Point! ${this.liveMatches[matchIndex].player1Name} vs ${this.liveMatches[matchIndex].player2Name}`, 'View', {
          duration: 5000
        }).onAction().subscribe(() => {
          this.openScoringDialog(this.liveMatches[matchIndex]);
        });
      }
    } else {
      console.log('⚠️ Received update for unknown match:', update.matchId);
    }
  }

  private handleMatchEvent(event: MatchEvent): void {
    // Add to recent events
    this.recentEvents.unshift({
      timestamp: event.timestamp,
      description: this.formatEventDescription(event),
      type: event.eventType,
      matchId: event.matchId
    });

    // Keep only last 10 events
    this.recentEvents = this.recentEvents.slice(0, 10);

    // Show notification for important events
    if (['match_won', 'set_won'].includes(event.eventType)) {
      this.snackBar.open(this.formatEventDescription(event), 'Close', { duration: 4000 });
    }
  }

  private formatEventDescription(event: MatchEvent): string {
    const match = this.liveMatches.find(m => m.matchId === event.matchId);
    const playerName = event.player === 'player1' 
      ? match?.player1Name || 'Player 1'
      : match?.player2Name || 'Player 2';

    switch (event.eventType) {
      case 'point_scored':
        return `Point scored by ${playerName}`;
      case 'game_won':
        return `Game won by ${playerName}`;
      case 'set_won':
        return `Set won by ${playerName}`;
      case 'match_won':
        return `Match won by ${playerName}`;
      case 'match_started':
        return `Match started: ${match?.player1Name} vs ${match?.player2Name}`;
      case 'match_paused':
        return `Match paused: ${match?.player1Name} vs ${match?.player2Name}`;
      case 'match_resumed':
        return `Match resumed: ${match?.player1Name} vs ${match?.player2Name}`;
      default:
        return `${String(event.eventType).replace('_', ' ')} - ${playerName}`;
    }
  }

  // Enhanced Quick Scoring with WebSocket

  quickScore(match: LiveMatchSummary, player: 'player1' | 'player2'): void {
    if (this.websocketService.isConnected()) {
      // Use WebSocket for real-time updates
      this.websocketService.updateScore(match.matchId, player);
      this.snackBar.open(`Point scored for ${player === 'player1' ? match.player1Name : match.player2Name} (Live)`, 'Close', { duration: 2000 });
    } else {
      // Fallback to HTTP
      this.scoringService.updateScore(match.matchId, player).subscribe({
        next: (response) => {
          this.snackBar.open(`Point scored for ${player === 'player1' ? match.player1Name : match.player2Name}`, 'Close', { duration: 2000 });
          this.refreshData();
        },
        error: (error) => {
          console.error('Error updating score:', error);
          this.snackBar.open('Failed to update score', 'Close', { duration: 3000 });
        }
      });
    }
  }

  // Enhanced Match Controls with WebSocket

  pauseMatch(match: LiveMatchSummary): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.pauseMatch(match.matchId);
    }
    this.snackBar.open(`Match ${match.matchId} paused`, 'Close', { duration: 2000 });
  }

  resumeMatch(match: LiveMatchSummary): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.resumeMatch(match.matchId);
    }
    this.snackBar.open(`Match ${match.matchId} resumed`, 'Close', { duration: 2000 });
  }

  endMatch(match: LiveMatchSummary): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.endMatch(match.matchId);
    }
    this.snackBar.open(`Match ${match.matchId} ended`, 'Close', { duration: 2000 });
  }

  // Missing methods for the Enhanced Final Scores section

  getTotalCompletedTime(): string {
    if (this.completedMatches.length === 0) return '0h 0m';
    
    const totalMinutes = this.completedMatches.reduce((sum, match) => sum + (match.score.duration || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  }

  refreshCompletedMatches(): void {
    this.isRefreshing = true;
    this.loadCompletedMatches();
    setTimeout(() => {
      this.isRefreshing = false;
    }, 1000);
  }

  exportResults(): void {
    // Implementation for exporting all results
    const data = this.getFilteredCompletedMatches();
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tournament_results_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Results exported successfully', 'Close', { duration: 2000 });
  }

  getFilteredCompletedMatches(): CompletedMatch[] {
    let filtered = [...this.completedMatches];

    // Filter by format
    if (this.formatFilter !== 'all') {
      const formatMap: { [key: string]: string } = {
        'regular': 'regular',
        'pro-set': 'tiebreak-10',
        'match-tiebreak': 'tiebreak-8'
      };
      filtered = filtered.filter(match => match.gameFormat === formatMap[this.formatFilter]);
    }

    // Sort matches
    switch (this.sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.score.endTime).getTime() - new Date(a.score.endTime).getTime());
        break;
      case 'duration':
        filtered.sort((a, b) => (b.score.duration || 0) - (a.score.duration || 0));
        break;
      case 'format':
        filtered.sort((a, b) => a.gameFormat.localeCompare(b.gameFormat));
        break;
    }

    return filtered;
  }

  isWinner(match: CompletedMatch, player: 'player1' | 'player2'): boolean {
    if (!match.winner) return false;
    
    const playerName = player === 'player1' 
      ? this.getPlayer1Name(match)
      : this.getPlayer2Name(match);
    
    return match.winner.name === playerName;
  }

  shareResult(match: CompletedMatch): void {
    const resultText = `🎾 Match Result: ${match.team1?.name || 'Player 1'} vs ${match.team2?.name || 'Player 2'}\n` +
                      `Winner: ${match.winner?.name || 'Unknown'}\n` +
                      `Duration: ${this.formatDuration(match.score?.duration)}\n` +
                      `Format: ${this.getGameFormatDisplay(match.gameFormat)}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Tennis Match Result',
        text: resultText
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(resultText).then(() => {
        this.snackBar.open('Result copied to clipboard', 'Close', { duration: 2000 });
      });
    }
  }

  viewStatistics(match: CompletedMatch): void {
    // Implementation for viewing detailed match statistics
    this.snackBar.open('Opening detailed statistics...', 'Close', { duration: 2000 });
  }

  // Override getFinalScore to work with both team1/team2 and player1/player2
  getFinalScoreForPlayer(match: CompletedMatch, player: 'player1' | 'player2'): string {
    const tennisScore = match.score.tennisScore;
    
    switch (match.gameFormat) {
      case 'tiebreak-8':
      case 'tiebreak-10':
        return player === 'player1' ? 
          (tennisScore.team1Games || tennisScore.player1Games || 0).toString() : 
          (tennisScore.team2Games || tennisScore.player2Games || 0).toString();
      
      case 'regular':
      default:
        const sets = tennisScore.sets?.map((set: any) => 
          player === 'player1' ? (set.team1Games || set.player1Games || 0) : (set.team2Games || set.player2Games || 0)
        ).join(', ') || '0';
        return sets;
    }
  }

  // Add player1Name and player2Name properties to CompletedMatch interface
  getPlayer1Name(match: CompletedMatch): string {
    return (match as any).player1Name || match.team1?.name || 'Player 1';
  }

  getPlayer2Name(match: CompletedMatch): string {
    return (match as any).player2Name || match.team2?.name || 'Player 2';
  }

  // Methods for CompletedMatch that were expecting LiveMatchSummary
  viewMatchDetails(match: CompletedMatch | LiveMatchSummary): void {
    if ('matchId' in match) {
      // This is a LiveMatchSummary
      this.snackBar.open('Opening live match view...', 'Close', { duration: 2000 });
    } else {
      // This is a CompletedMatch
      this.snackBar.open('Opening completed match details...', 'Close', { duration: 2000 });
    }
  }

  exportMatchData(match: CompletedMatch | LiveMatchSummary): void {
    let data: any;
    let filename: string;
    
    if ('matchId' in match) {
      // This is a LiveMatchSummary
      data = match;
      filename = `live_match_${match.matchId}_${new Date().toISOString().split('T')[0]}.json`;
    } else {
      // This is a CompletedMatch
      data = match;
      filename = `completed_match_${match._id}_${new Date().toISOString().split('T')[0]}.json`;
    }
    
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Match data exported successfully', 'Close', { duration: 2000 });
  }
}