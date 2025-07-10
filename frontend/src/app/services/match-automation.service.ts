import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { ScoringService } from './scoring.service';
import { WebSocketService } from './websocket.service';
import { LiveMatchSummary } from '../models/scoring.model';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AutomationCondition {
  type: 'match_point' | 'set_point' | 'deuce' | 'match_duration' | 'player_advantage' | 'score_difference';
  value?: any;
  operator?: 'equals' | 'greater_than' | 'less_than' | 'contains';
}

export interface AutomationAction {
  type: 'pause_match' | 'notify_officials' | 'send_alert' | 'log_event' | 'update_schedule' | 'broadcast_announcement';
  parameters?: any;
}

export interface MatchAlert {
  id: string;
  matchId: string;
  type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoResolve: boolean;
  resolutionTime?: Date;
}

export interface AutoSchedulingConfig {
  enabled: boolean;
  courtAssignmentStrategy: 'round_robin' | 'load_balanced' | 'priority_based';
  bufferTimeBetweenMatches: number; // minutes
  maxConcurrentMatches: number;
  courtPreferences: { [playerId: string]: string[] };
  officialAssignments: { [courtId: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class MatchAutomationService {
  private automationRulesSubject = new BehaviorSubject<AutomationRule[]>([]);
  private alertsSubject = new BehaviorSubject<MatchAlert[]>([]);
  private schedulingConfigSubject = new BehaviorSubject<AutoSchedulingConfig>(this.getDefaultSchedulingConfig());
  
  private monitoringSubscription?: Subscription;
  private alertCleanupInterval?: any;
  
  public automationRules$ = this.automationRulesSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();
  public schedulingConfig$ = this.schedulingConfigSubject.asObservable();

  constructor(
    private scoringService: ScoringService,
    private websocketService: WebSocketService
  ) {
    this.initializeDefaultRules();
    this.startMonitoring();
    this.setupAlertCleanup();
  }

  private initializeDefaultRules(): void {
    const defaultRules: AutomationRule[] = [
      {
        id: 'match-point-alert',
        name: 'Match Point Alert',
        description: 'Alert officials when a match reaches match point',
        enabled: true,
        conditions: [{ type: 'match_point' }],
        actions: [
          { type: 'notify_officials', parameters: { urgency: 'high' } },
          { type: 'send_alert', parameters: { type: 'warning', title: 'Match Point Reached' } }
        ],
        triggerCount: 0
      },
      {
        id: 'long-match-warning',
        name: 'Long Match Warning',
        description: 'Alert when a match exceeds 3 hours',
        enabled: true,
        conditions: [{ type: 'match_duration', value: 180, operator: 'greater_than' }],
        actions: [
          { type: 'send_alert', parameters: { type: 'info', title: 'Long Match Duration' } },
          { type: 'log_event', parameters: { event: 'long_match_detected' } }
        ],
        triggerCount: 0
      },
      {
        id: 'deuce-marathon',
        name: 'Extended Deuce Alert',
        description: 'Alert for matches with multiple consecutive deuces',
        enabled: true,
        conditions: [{ type: 'deuce' }],
        actions: [
          { type: 'log_event', parameters: { event: 'extended_deuce' } }
        ],
        triggerCount: 0
      },
      {
        id: 'auto-schedule-next',
        name: 'Auto Schedule Next Match',
        description: 'Automatically schedule the next match when current one completes',
        enabled: false,
        conditions: [{ type: 'match_point' }],
        actions: [
          { type: 'update_schedule', parameters: { action: 'schedule_next' } }
        ],
        triggerCount: 0
      }
    ];

    this.automationRulesSubject.next(defaultRules);
  }

  private startMonitoring(): void {
    // Monitor live matches every 30 seconds
    this.monitoringSubscription = interval(30000).subscribe(() => {
      this.checkAutomationRules();
    });

    // Also monitor WebSocket events for real-time triggers
    this.websocketService.liveScoreUpdates$.subscribe(update => {
      this.checkRulesForMatch(update.matchId);
    });

    this.websocketService.matchEvents$.subscribe(event => {
      this.checkRulesForMatchEvent(event);
    });
  }

  private setupAlertCleanup(): void {
    // Clean up old alerts every 5 minutes
    this.alertCleanupInterval = setInterval(() => {
      this.cleanupOldAlerts();
    }, 5 * 60 * 1000);
  }

  private checkAutomationRules(): void {
    this.scoringService.getLiveMatches().subscribe(matches => {
      matches.forEach(match => {
        this.checkRulesForMatch(match.matchId, match);
      });
    });
  }

  private checkRulesForMatch(matchId: string, match?: LiveMatchSummary): void {
    const rules = this.automationRulesSubject.value.filter(rule => rule.enabled);
    
    // If match data not provided, get it
    if (!match) {
      this.scoringService.getLiveMatches().subscribe(matches => {
        const foundMatch = matches.find(m => m.matchId === matchId);
        if (foundMatch) {
          this.evaluateRulesForMatch(foundMatch, rules);
        }
      });
    } else {
      this.evaluateRulesForMatch(match, rules);
    }
  }

  private checkRulesForMatchEvent(event: any): void {
    const rules = this.automationRulesSubject.value.filter(rule => rule.enabled);
    
    this.scoringService.getLiveMatches().subscribe(matches => {
      const match = matches.find(m => m.matchId === event.matchId);
      if (match) {
        this.evaluateRulesForMatch(match, rules, event);
      }
    });
  }

  private evaluateRulesForMatch(match: LiveMatchSummary, rules: AutomationRule[], event?: any): void {
    rules.forEach(rule => {
      const shouldTrigger = this.evaluateConditions(rule.conditions, match, event);
      
      if (shouldTrigger) {
        this.executeRule(rule, match, event);
      }
    });
  }

  private evaluateConditions(conditions: AutomationCondition[], match: LiveMatchSummary, event?: any): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'match_point':
          return match.score?.isMatchPoint || false;
          
        case 'set_point':
          return match.score?.isSetPoint || false;
          
        case 'deuce':
          return match.score?.isDeuce || false;
          
        case 'match_duration':
          const duration = this.calculateMatchDuration(match);
          return this.compareValues(duration, condition.value, condition.operator || 'greater_than');
          
        case 'player_advantage':
          return match.score?.advantage !== null;
          
        case 'score_difference':
          const diff = Math.abs((match.score?.player1Games || 0) - (match.score?.player2Games || 0));
          return this.compareValues(diff, condition.value, condition.operator || 'greater_than');
          
        default:
          return false;
      }
    });
  }

  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'greater_than': return actual > expected;
      case 'less_than': return actual < expected;
      case 'contains': return String(actual).includes(String(expected));
      default: return false;
    }
  }

  private calculateMatchDuration(match: LiveMatchSummary): number {
    if (!match.elapsedTime) return 0;
    
    const [hours, minutes, seconds] = match.elapsedTime.split(':').map(Number);
    return (hours * 60) + minutes + (seconds / 60);
  }

  private executeRule(rule: AutomationRule, match: LiveMatchSummary, event?: any): void {
    console.log(`🤖 Executing automation rule: ${rule.name} for match ${match.matchId}`);
    
    rule.actions.forEach(action => {
      this.executeAction(action, match, rule, event);
    });

    // Update rule statistics
    rule.lastTriggered = new Date();
    rule.triggerCount++;
    
    const updatedRules = this.automationRulesSubject.value.map(r => 
      r.id === rule.id ? rule : r
    );
    this.automationRulesSubject.next(updatedRules);
  }

  private executeAction(action: AutomationAction, match: LiveMatchSummary, rule: AutomationRule, event?: any): void {
    switch (action.type) {
      case 'send_alert':
        this.createAlert({
          matchId: match.matchId,
          type: action.parameters?.type || 'info',
          title: action.parameters?.title || rule.name,
          message: this.generateAlertMessage(rule, match, action.parameters),
          priority: action.parameters?.priority || 'medium',
          autoResolve: action.parameters?.autoResolve !== false
        });
        break;
        
      case 'notify_officials':
        this.notifyOfficials(match, rule, action.parameters);
        break;
        
      case 'pause_match':
        this.pauseMatch(match, rule.name);
        break;
        
      case 'log_event':
        this.logAutomationEvent(match, rule, action.parameters, event);
        break;
        
      case 'update_schedule':
        this.updateSchedule(match, action.parameters);
        break;
        
      case 'broadcast_announcement':
        this.broadcastAnnouncement(match, rule, action.parameters);
        break;
    }
  }

  private generateAlertMessage(rule: AutomationRule, match: LiveMatchSummary, parameters?: any): string {
    const player1 = match.player1Name;
    const player2 = match.player2Name;
    
    switch (rule.id) {
      case 'match-point-alert':
        return `Match point reached in ${player1} vs ${player2}. Officials should be notified.`;
      case 'long-match-warning':
        return `Match ${player1} vs ${player2} has exceeded 3 hours. Consider scheduling breaks.`;
      case 'deuce-marathon':
        return `Extended deuce situation in ${player1} vs ${player2}.`;
      default:
        return parameters?.message || `Automation rule "${rule.name}" triggered for ${player1} vs ${player2}`;
    }
  }

  private createAlert(alertData: Partial<MatchAlert>): void {
    const alert: MatchAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      matchId: alertData.matchId!,
      type: alertData.type || 'info',
      title: alertData.title!,
      message: alertData.message!,
      timestamp: new Date(),
      acknowledged: false,
      priority: alertData.priority || 'medium',
      autoResolve: alertData.autoResolve !== false
    };

    const currentAlerts = this.alertsSubject.value;
    currentAlerts.unshift(alert);
    this.alertsSubject.next(currentAlerts);

    // Auto-resolve if configured
    if (alert.autoResolve) {
      setTimeout(() => {
        this.resolveAlert(alert.id);
      }, 30000); // Auto-resolve after 30 seconds
    }
  }

  private notifyOfficials(match: LiveMatchSummary, rule: AutomationRule, parameters?: any): void {
    console.log(`📢 Notifying officials for match ${match.matchId}: ${rule.name}`);
    
    // In a real implementation, this would send notifications to officials
    // via email, SMS, push notifications, etc.
    this.websocketService.send({
      type: 'official-notification',
      data: {
        matchId: match.matchId,
        rule: rule.name,
        urgency: parameters?.urgency || 'medium',
        message: `Official attention required for ${match.player1Name} vs ${match.player2Name}`
      }
    });
  }

  private pauseMatch(match: LiveMatchSummary, reason: string): void {
    console.log(`⏸️ Auto-pausing match ${match.matchId}: ${reason}`);
    this.websocketService.pauseMatch(match.matchId);
    
    this.createAlert({
      matchId: match.matchId,
      type: 'warning',
      title: 'Match Auto-Paused',
      message: `Match has been automatically paused: ${reason}`,
      priority: 'high'
    });
  }

  private logAutomationEvent(match: LiveMatchSummary, rule: AutomationRule, parameters?: any, event?: any): void {
    const logEntry = {
      timestamp: new Date(),
      matchId: match.matchId,
      rule: rule.name,
      event: parameters?.event || 'automation_triggered',
      data: { match, rule, event }
    };
    
    console.log('📝 Automation log:', logEntry);
    // In a real implementation, this would be sent to a logging service
  }

  private updateSchedule(match: LiveMatchSummary, parameters?: any): void {
    console.log(`📅 Updating schedule for match ${match.matchId}:`, parameters);
    
    if (parameters?.action === 'schedule_next') {
      // Logic to automatically schedule the next match
      this.autoScheduleNext(match);
    }
  }

  private broadcastAnnouncement(match: LiveMatchSummary, rule: AutomationRule, parameters?: any): void {
    const announcement = {
      type: 'tournament-announcement',
      data: {
        matchId: match.matchId,
        title: parameters?.title || rule.name,
        message: parameters?.message || `Attention: ${match.player1Name} vs ${match.player2Name}`,
        priority: parameters?.priority || 'medium'
      }
    };
    
    this.websocketService.send(announcement);
  }

  private autoScheduleNext(completedMatch: LiveMatchSummary): void {
    const config = this.schedulingConfigSubject.value;
    if (!config.enabled) return;

    // Auto-scheduling logic would go here
    console.log(`🔄 Auto-scheduling next match after ${completedMatch.matchId}`);
    
    // This would integrate with the tournament bracket system
    // to automatically assign the next match to the same court
    // with appropriate buffer time
  }

  private cleanupOldAlerts(): void {
    const currentAlerts = this.alertsSubject.value;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const filteredAlerts = currentAlerts.filter(alert => {
      return alert.timestamp > oneDayAgo && !alert.acknowledged;
    });
    
    if (filteredAlerts.length !== currentAlerts.length) {
      this.alertsSubject.next(filteredAlerts);
    }
  }

  private getDefaultSchedulingConfig(): AutoSchedulingConfig {
    return {
      enabled: false,
      courtAssignmentStrategy: 'load_balanced',
      bufferTimeBetweenMatches: 15,
      maxConcurrentMatches: 8,
      courtPreferences: {},
      officialAssignments: {}
    };
  }

  // Public API methods

  public getAutomationRules(): Observable<AutomationRule[]> {
    return this.automationRules$;
  }

  public getAlerts(): Observable<MatchAlert[]> {
    return this.alerts$;
  }

  public addAutomationRule(rule: Omit<AutomationRule, 'id' | 'triggerCount' | 'lastTriggered'>): void {
    const newRule: AutomationRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      triggerCount: 0
    };

    const currentRules = this.automationRulesSubject.value;
    currentRules.push(newRule);
    this.automationRulesSubject.next(currentRules);
  }

  public updateAutomationRule(ruleId: string, updates: Partial<AutomationRule>): void {
    const currentRules = this.automationRulesSubject.value;
    const updatedRules = currentRules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    this.automationRulesSubject.next(updatedRules);
  }

  public deleteAutomationRule(ruleId: string): void {
    const currentRules = this.automationRulesSubject.value;
    const filteredRules = currentRules.filter(rule => rule.id !== ruleId);
    this.automationRulesSubject.next(filteredRules);
  }

  public acknowledgeAlert(alertId: string): void {
    const currentAlerts = this.alertsSubject.value;
    const updatedAlerts = currentAlerts.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
    this.alertsSubject.next(updatedAlerts);
  }

  public resolveAlert(alertId: string): void {
    const currentAlerts = this.alertsSubject.value;
    const updatedAlerts = currentAlerts.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true, resolutionTime: new Date() } : alert
    );
    this.alertsSubject.next(updatedAlerts);
  }

  public clearAllAlerts(): void {
    this.alertsSubject.next([]);
  }

  public updateSchedulingConfig(config: Partial<AutoSchedulingConfig>): void {
    const currentConfig = this.schedulingConfigSubject.value;
    const updatedConfig = { ...currentConfig, ...config };
    this.schedulingConfigSubject.next(updatedConfig);
  }

  public manualTriggerRule(ruleId: string, matchId: string): void {
    const rule = this.automationRulesSubject.value.find(r => r.id === ruleId);
    if (!rule) return;

    this.scoringService.getLiveMatches().subscribe(matches => {
      const match = matches.find(m => m.matchId === matchId);
      if (match) {
        this.executeRule(rule, match);
      }
    });
  }

  public destroy(): void {
    if (this.monitoringSubscription) {
      this.monitoringSubscription.unsubscribe();
    }
    
    if (this.alertCleanupInterval) {
      clearInterval(this.alertCleanupInterval);
    }
  }
}