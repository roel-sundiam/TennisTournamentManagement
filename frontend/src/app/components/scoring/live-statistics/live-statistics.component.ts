import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { LiveStatisticsService, LiveStatisticsData, TournamentStatistics, PlayerStatistics, CourtUtilization } from '../../../services/live-statistics.service';

@Component({
  selector: 'app-live-statistics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule
  ],
  templateUrl: './live-statistics.component.html',
  styleUrls: ['./live-statistics.component.scss']
})
export class LiveStatisticsComponent implements OnInit, OnDestroy {
  @Input() tournamentId?: string;
  
  statisticsData: LiveStatisticsData | null = null;
  isLoading = true;
  
  // Chart data
  hourlyChartData: any[] = [];
  gameFormatChartData: any[] = [];
  
  // Table configurations
  playerColumns: string[] = ['rank', 'playerName', 'matchesPlayed', 'winPercentage', 'gamesWon', 'setsWon'];
  courtColumns: string[] = ['courtName', 'matchesPlayed', 'utilization', 'currentMatch', 'totalTime'];
  
  private subscriptions: Subscription[] = [];

  constructor(private statisticsService: LiveStatisticsService) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.statisticsService.destroy();
  }

  private loadStatistics(): void {
    const subscription = this.statisticsService.getStatistics().subscribe(data => {
      if (data) {
        this.statisticsData = data;
        this.isLoading = false;
        this.updateChartData();
        console.log('📊 Statistics loaded:', data);
      }
    });
    
    this.subscriptions.push(subscription);
  }

  private setupAutoRefresh(): void {
    // Refresh statistics every 30 seconds
    const refreshInterval = setInterval(() => {
      this.statisticsService.refreshStatistics();
    }, 30000);

    // Clean up interval on destroy
    this.subscriptions.push({
      unsubscribe: () => clearInterval(refreshInterval)
    } as Subscription);
  }

  private updateChartData(): void {
    if (!this.statisticsData) return;

    // Update hourly distribution chart data
    this.hourlyChartData = this.statisticsData.trends.hourlyMatches.map(item => ({
      name: `${item.hour}:00`,
      value: item.count
    }));

    // Update game format distribution chart data
    this.gameFormatChartData = this.statisticsData.trends.gameFormatDistribution.map(item => ({
      name: this.formatGameFormat(item.format),
      value: item.count,
      percentage: item.percentage
    }));
  }

  refreshStatistics(): void {
    this.isLoading = true;
    this.statisticsService.refreshStatistics();
  }

  getTournamentStats(): TournamentStatistics | null {
    return this.statisticsData?.tournament || null;
  }

  getTopPlayers(): PlayerStatistics[] {
    return this.statisticsData?.players.slice(0, 10) || [];
  }

  getCourtUtilization(): CourtUtilization[] {
    return this.statisticsData?.courts || [];
  }

  formatGameFormat(format: string): string {
    switch (format) {
      case 'regular': return 'Regular Tennis';
      case 'tiebreak-8': return '8-Game Tiebreak';
      case 'tiebreak-10': return '10-Game Tiebreak';
      default: return format;
    }
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  formatPercentage(percentage: number): string {
    return `${Math.round(percentage * 10) / 10}%`;
  }

  getCompletionProgress(): number {
    return this.statisticsData?.tournament.completionPercentage || 0;
  }

  getActiveMatchesCount(): number {
    return this.statisticsData?.tournament.activeMatches || 0;
  }

  getCompletedMatchesCount(): number {
    return this.statisticsData?.tournament.completedMatches || 0;
  }

  getTotalMatchesCount(): number {
    return this.statisticsData?.tournament.totalMatches || 0;
  }

  getAverageMatchDuration(): string {
    const avgDuration = this.statisticsData?.tournament.averageMatchDuration || 0;
    return this.formatDuration(avgDuration);
  }

  getCourtsInUse(): number {
    return this.statisticsData?.tournament.courtsInUse || 0;
  }

  getTotalPlayingTime(): string {
    const totalTime = this.statisticsData?.tournament.totalPlayingTime || 0;
    return this.formatDuration(totalTime);
  }

  getMatchesPerHour(): string {
    const rate = this.statisticsData?.tournament.matchesPerHour || 0;
    return rate.toFixed(1);
  }

  getPlayerWinRate(player: PlayerStatistics): string {
    return this.formatPercentage(player.winPercentage);
  }

  getPlayerRank(index: number): number {
    return index + 1;
  }

  getCourtUtilizationPercentage(court: CourtUtilization): string {
    return this.formatPercentage(court.utilization);
  }

  getCurrentMatchDisplay(court: CourtUtilization): string {
    if (court.currentMatch) {
      return `${court.currentMatch.player1Name} vs ${court.currentMatch.player2Name}`;
    }
    return 'Available';
  }

  isCourtInUse(court: CourtUtilization): boolean {
    return !!court.currentMatch;
  }

  getLastUpdated(): string {
    if (!this.statisticsData?.lastUpdated) return 'Never';
    
    const now = new Date();
    const updated = new Date(this.statisticsData.lastUpdated);
    const diffMs = now.getTime() - updated.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  }

  // Chart methods for future chart integration
  getPeakHour(): string {
    if (!this.statisticsData?.trends.hourlyMatches) return 'N/A';
    
    const peak = this.statisticsData.trends.hourlyMatches.reduce((max, current) => 
      current.count > max.count ? current : max
    );
    
    return `${peak.hour}:00`;
  }

  getMostPopularFormat(): string {
    if (!this.statisticsData?.trends.gameFormatDistribution.length) return 'N/A';
    
    const mostPopular = this.statisticsData.trends.gameFormatDistribution[0];
    return this.formatGameFormat(mostPopular.format);
  }

  exportStatistics(): void {
    if (!this.statisticsData) return;
    
    const data = JSON.stringify(this.statisticsData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament-statistics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}