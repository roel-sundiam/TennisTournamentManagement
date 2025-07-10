import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ScoringService } from './scoring.service';
import { WebSocketService } from './websocket.service';
import { LiveMatchSummary } from '../models/scoring.model';

export interface TournamentStatistics {
  totalMatches: number;
  completedMatches: number;
  activeMatches: number;
  scheduledMatches: number;
  totalPlayingTime: number;
  averageMatchDuration: number;
  completionPercentage: number;
  courtsInUse: number;
  peakConcurrentMatches: number;
  matchesPerHour: number;
}

export interface PlayerStatistics {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  winPercentage: number;
  averageMatchDuration: number;
  longestMatch: number;
  shortestMatch: number;
}

export interface CourtUtilization {
  courtId: string;
  courtName: string;
  matchesPlayed: number;
  totalPlayingTime: number;
  utilization: number; // percentage of time court was in use
  currentMatch?: LiveMatchSummary;
}

export interface MatchTrends {
  hourlyMatches: { hour: number; count: number }[];
  dailyCompletion: { date: string; completed: number; scheduled: number }[];
  averageDurationTrend: { date: string; avgDuration: number }[];
  gameFormatDistribution: { format: string; count: number; percentage: number }[];
}

export interface LiveStatisticsData {
  tournament: TournamentStatistics;
  players: PlayerStatistics[];
  courts: CourtUtilization[];
  trends: MatchTrends;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LiveStatisticsService {
  private statisticsSubject = new BehaviorSubject<LiveStatisticsData | null>(null);
  private updateInterval: any;
  private readonly UPDATE_INTERVAL = 30000; // Update every 30 seconds

  public statistics$ = this.statisticsSubject.asObservable();

  constructor(
    private scoringService: ScoringService,
    private websocketService: WebSocketService
  ) {
    this.startStatisticsUpdates();
    this.setupWebSocketListeners();
  }

  private startStatisticsUpdates(): void {
    // Initial load
    this.updateStatistics();
    
    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.updateStatistics();
    }, this.UPDATE_INTERVAL);
  }

  private setupWebSocketListeners(): void {
    // Listen for live score updates to trigger statistics refresh
    this.websocketService.liveScoreUpdates$.subscribe(() => {
      this.updateStatistics();
    });

    // Listen for match events to update statistics
    this.websocketService.matchEvents$.subscribe((event) => {
      if (['match_won', 'match_started', 'set_won'].includes(event.eventType)) {
        this.updateStatistics();
      }
    });
  }

  private async updateStatistics(): Promise<void> {
    try {
      console.log('📊 Updating live statistics...');

      // Get all data sources
      const [liveMatches, completedMatches] = await Promise.all([
        this.scoringService.getLiveMatches().toPromise(),
        this.scoringService.getCompletedMatches().toPromise()
      ]);

      const statistics = this.calculateStatistics(liveMatches || [], completedMatches?.data || []);
      
      this.statisticsSubject.next(statistics);
      console.log('✅ Statistics updated:', statistics);
    } catch (error) {
      console.error('❌ Error updating statistics:', error);
    }
  }

  private calculateStatistics(liveMatches: LiveMatchSummary[], completedMatches: any[]): LiveStatisticsData {
    const allMatches = [...liveMatches, ...completedMatches];
    
    return {
      tournament: this.calculateTournamentStats(liveMatches, completedMatches),
      players: this.calculatePlayerStats(allMatches),
      courts: this.calculateCourtUtilization(liveMatches, completedMatches),
      trends: this.calculateTrends(completedMatches),
      lastUpdated: new Date()
    };
  }

  private calculateTournamentStats(liveMatches: LiveMatchSummary[], completedMatches: any[]): TournamentStatistics {
    const activeMatches = liveMatches.filter(m => m.status === 'in-progress').length;
    const scheduledMatches = liveMatches.filter(m => m.status === 'scheduled').length;
    const totalMatches = liveMatches.length + completedMatches.length;
    
    const totalPlayingTime = completedMatches.reduce((sum, match) => {
      return sum + (match.score?.duration || 0);
    }, 0);

    const averageMatchDuration = completedMatches.length > 0 
      ? totalPlayingTime / completedMatches.length 
      : 0;

    const courtsInUse = new Set(liveMatches
      .filter(m => m.status === 'in-progress' && m.court)
      .map(m => m.court)).size;

    return {
      totalMatches,
      completedMatches: completedMatches.length,
      activeMatches,
      scheduledMatches,
      totalPlayingTime,
      averageMatchDuration,
      completionPercentage: totalMatches > 0 ? (completedMatches.length / totalMatches) * 100 : 0,
      courtsInUse,
      peakConcurrentMatches: this.calculatePeakConcurrentMatches(liveMatches),
      matchesPerHour: this.calculateMatchesPerHour(completedMatches)
    };
  }

  private calculatePlayerStats(matches: any[]): PlayerStatistics[] {
    const playerStatsMap = new Map<string, PlayerStatistics>();

    matches.forEach(match => {
      // Process player1
      this.updatePlayerStats(playerStatsMap, match, 'player1');
      // Process player2
      this.updatePlayerStats(playerStatsMap, match, 'player2');
    });

    return Array.from(playerStatsMap.values())
      .sort((a, b) => b.winPercentage - a.winPercentage);
  }

  private updatePlayerStats(statsMap: Map<string, PlayerStatistics>, match: any, playerKey: 'player1' | 'player2'): void {
    const playerId = match[`${playerKey}Name`] || `${playerKey}_${match.matchId}`;
    const playerName = match[`${playerKey}Name`] || `Player ${playerKey === 'player1' ? '1' : '2'}`;
    
    if (!statsMap.has(playerId)) {
      statsMap.set(playerId, {
        playerId,
        playerName,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        setsWon: 0,
        setsLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        winPercentage: 0,
        averageMatchDuration: 0,
        longestMatch: 0,
        shortestMatch: Infinity
      });
    }

    const stats = statsMap.get(playerId)!;
    stats.matchesPlayed++;

    if (match.score) {
      const isWinner = match.score.winner === playerKey;
      if (isWinner) {
        stats.matchesWon++;
      } else if (match.status === 'completed') {
        stats.matchesLost++;
      }

      // Update game and set stats
      const playerGames = match.score[`${playerKey}Games`] || 0;
      const opponentGames = match.score[`${playerKey === 'player1' ? 'player2' : 'player1'}Games`] || 0;
      const playerSets = match.score[`${playerKey}Sets`] || 0;
      const opponentSets = match.score[`${playerKey === 'player1' ? 'player2' : 'player1'}Sets`] || 0;

      stats.gamesWon += playerGames;
      stats.gamesLost += opponentGames;
      stats.setsWon += playerSets;
      stats.setsLost += opponentSets;
    }

    // Update match duration stats
    if (match.score?.duration) {
      const duration = match.score.duration;
      stats.longestMatch = Math.max(stats.longestMatch, duration);
      stats.shortestMatch = Math.min(stats.shortestMatch, duration);
    }

    // Calculate win percentage
    const totalFinishedMatches = stats.matchesWon + stats.matchesLost;
    stats.winPercentage = totalFinishedMatches > 0 ? (stats.matchesWon / totalFinishedMatches) * 100 : 0;
  }

  private calculateCourtUtilization(liveMatches: LiveMatchSummary[], completedMatches: any[]): CourtUtilization[] {
    const courtStatsMap = new Map<string, CourtUtilization>();

    // Process completed matches
    completedMatches.forEach(match => {
      if (match.court) {
        const courtId = match.court;
        if (!courtStatsMap.has(courtId)) {
          courtStatsMap.set(courtId, {
            courtId,
            courtName: match.court,
            matchesPlayed: 0,
            totalPlayingTime: 0,
            utilization: 0
          });
        }

        const courtStats = courtStatsMap.get(courtId)!;
        courtStats.matchesPlayed++;
        courtStats.totalPlayingTime += match.score?.duration || 0;
      }
    });

    // Process live matches
    liveMatches.forEach(match => {
      if (match.court) {
        const courtId = match.court;
        if (!courtStatsMap.has(courtId)) {
          courtStatsMap.set(courtId, {
            courtId,
            courtName: match.court,
            matchesPlayed: 0,
            totalPlayingTime: 0,
            utilization: 0
          });
        }

        const courtStats = courtStatsMap.get(courtId)!;
        if (match.status === 'in-progress') {
          courtStats.currentMatch = match;
        }
      }
    });

    // Calculate utilization (simplified - in real app would use tournament duration)
    const results = Array.from(courtStatsMap.values());
    const maxPlayingTime = Math.max(...results.map(c => c.totalPlayingTime), 1);
    
    results.forEach(court => {
      court.utilization = (court.totalPlayingTime / maxPlayingTime) * 100;
    });

    return results.sort((a, b) => b.utilization - a.utilization);
  }

  private calculateTrends(completedMatches: any[]): MatchTrends {
    const hourlyMatches = this.calculateHourlyDistribution(completedMatches);
    const dailyCompletion = this.calculateDailyCompletion(completedMatches);
    const averageDurationTrend = this.calculateDurationTrend(completedMatches);
    const gameFormatDistribution = this.calculateGameFormatDistribution(completedMatches);

    return {
      hourlyMatches,
      dailyCompletion,
      averageDurationTrend,
      gameFormatDistribution
    };
  }

  private calculateHourlyDistribution(matches: any[]): { hour: number; count: number }[] {
    const hourCounts = new Array(24).fill(0);
    
    matches.forEach(match => {
      if (match.score?.endTime) {
        const hour = new Date(match.score.endTime).getHours();
        hourCounts[hour]++;
      }
    });

    return hourCounts.map((count, hour) => ({ hour, count }));
  }

  private calculateDailyCompletion(matches: any[]): { date: string; completed: number; scheduled: number }[] {
    const dailyStats = new Map<string, { completed: number; scheduled: number }>();
    
    matches.forEach(match => {
      if (match.score?.endTime) {
        const date = new Date(match.score.endTime).toISOString().split('T')[0];
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { completed: 0, scheduled: 0 });
        }
        dailyStats.get(date)!.completed++;
      }
    });

    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateDurationTrend(matches: any[]): { date: string; avgDuration: number }[] {
    const dailyDurations = new Map<string, number[]>();
    
    matches.forEach(match => {
      if (match.score?.endTime && match.score?.duration) {
        const date = new Date(match.score.endTime).toISOString().split('T')[0];
        if (!dailyDurations.has(date)) {
          dailyDurations.set(date, []);
        }
        dailyDurations.get(date)!.push(match.score.duration);
      }
    });

    return Array.from(dailyDurations.entries())
      .map(([date, durations]) => ({
        date,
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateGameFormatDistribution(matches: any[]): { format: string; count: number; percentage: number }[] {
    const formatCounts = new Map<string, number>();
    
    matches.forEach(match => {
      const format = match.gameFormat || 'regular';
      formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
    });

    const total = matches.length;
    return Array.from(formatCounts.entries())
      .map(([format, count]) => ({
        format,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculatePeakConcurrentMatches(liveMatches: LiveMatchSummary[]): number {
    // Simplified calculation - in real app would track historical data
    return liveMatches.filter(m => m.status === 'in-progress').length;
  }

  private calculateMatchesPerHour(completedMatches: any[]): number {
    if (completedMatches.length === 0) return 0;
    
    // Calculate based on last 24 hours
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentMatches = completedMatches.filter(match => {
      return match.score?.endTime && new Date(match.score.endTime).getTime() > last24Hours;
    });

    return recentMatches.length / 24;
  }

  public getStatistics(): Observable<LiveStatisticsData | null> {
    return this.statistics$;
  }

  public refreshStatistics(): void {
    this.updateStatistics();
  }

  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}