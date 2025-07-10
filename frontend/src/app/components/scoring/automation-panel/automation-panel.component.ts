import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { 
  MatchAutomationService, 
  AutomationRule, 
  MatchAlert, 
  AutoSchedulingConfig 
} from '../../../services/match-automation.service';

@Component({
  selector: 'app-automation-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatTableModule,
    MatChipsModule,
    MatBadgeModule,
    MatExpansionModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule
  ],
  templateUrl: './automation-panel.component.html',
  styleUrls: ['./automation-panel.component.scss']
})
export class AutomationPanelComponent implements OnInit, OnDestroy {
  automationRules: AutomationRule[] = [];
  alerts: MatchAlert[] = [];
  schedulingConfig: AutoSchedulingConfig | null = null;
  
  // UI State
  selectedTab = 0;
  expandedRuleId: string | null = null;
  
  // Table configurations
  rulesColumns: string[] = ['enabled', 'name', 'description', 'triggerCount', 'lastTriggered', 'actions'];
  alertsColumns: string[] = ['priority', 'title', 'message', 'timestamp', 'acknowledged', 'actions'];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private automationService: MatchAutomationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAutomationData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadAutomationData(): void {
    // Load automation rules
    const rulesSubscription = this.automationService.getAutomationRules().subscribe(rules => {
      this.automationRules = rules;
    });

    // Load alerts
    const alertsSubscription = this.automationService.getAlerts().subscribe(alerts => {
      this.alerts = alerts;
    });

    // Load scheduling config
    const configSubscription = this.automationService.schedulingConfig$.subscribe(config => {
      this.schedulingConfig = config;
    });

    this.subscriptions.push(rulesSubscription, alertsSubscription, configSubscription);
  }

  // Automation Rules Management

  toggleRule(rule: AutomationRule): void {
    this.automationService.updateAutomationRule(rule.id, { enabled: !rule.enabled });
    
    const status = rule.enabled ? 'disabled' : 'enabled';
    this.snackBar.open(`Rule "${rule.name}" ${status}`, 'Close', { duration: 3000 });
  }

  editRule(rule: AutomationRule): void {
    // TODO: Open rule editor dialog
    this.snackBar.open(`Editing rule: ${rule.name}`, 'Close', { duration: 2000 });
  }

  deleteRule(rule: AutomationRule): void {
    if (confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      this.automationService.deleteAutomationRule(rule.id);
      this.snackBar.open(`Rule "${rule.name}" deleted`, 'Close', { duration: 3000 });
    }
  }

  addNewRule(): void {
    // TODO: Open rule creation dialog
    this.snackBar.open('Opening rule creator...', 'Close', { duration: 2000 });
  }

  manualTriggerRule(rule: AutomationRule): void {
    // For demo purposes, trigger with a mock match ID
    const mockMatchId = 'test-match-' + Date.now();
    this.automationService.manualTriggerRule(rule.id, mockMatchId);
    this.snackBar.open(`Manually triggered rule: ${rule.name}`, 'Close', { duration: 3000 });
  }

  // Alert Management

  acknowledgeAlert(alert: MatchAlert): void {
    this.automationService.acknowledgeAlert(alert.id);
    this.snackBar.open('Alert acknowledged', 'Close', { duration: 2000 });
  }

  resolveAlert(alert: MatchAlert): void {
    this.automationService.resolveAlert(alert.id);
    this.snackBar.open('Alert resolved', 'Close', { duration: 2000 });
  }

  clearAllAlerts(): void {
    if (confirm('Are you sure you want to clear all alerts?')) {
      this.automationService.clearAllAlerts();
      this.snackBar.open('All alerts cleared', 'Close', { duration: 3000 });
    }
  }

  // Scheduling Configuration

  toggleAutoScheduling(): void {
    if (!this.schedulingConfig) return;
    
    const newEnabled = !this.schedulingConfig.enabled;
    this.automationService.updateSchedulingConfig({ enabled: newEnabled });
    
    const status = newEnabled ? 'enabled' : 'disabled';
    this.snackBar.open(`Auto-scheduling ${status}`, 'Close', { duration: 3000 });
  }

  updateSchedulingStrategy(strategy: string): void {
    this.automationService.updateSchedulingConfig({ 
      courtAssignmentStrategy: strategy as any 
    });
    this.snackBar.open(`Court assignment strategy updated to ${strategy}`, 'Close', { duration: 3000 });
  }

  updateBufferTime(value: string): void {
    const minutes = parseInt(value, 10);
    if (!isNaN(minutes)) {
      this.automationService.updateSchedulingConfig({ bufferTimeBetweenMatches: minutes });
      this.snackBar.open(`Buffer time updated to ${minutes} minutes`, 'Close', { duration: 3000 });
    }
  }

  updateMaxConcurrentMatches(value: string): void {
    const count = parseInt(value, 10);
    if (!isNaN(count)) {
      this.automationService.updateSchedulingConfig({ maxConcurrentMatches: count });
      this.snackBar.open(`Max concurrent matches set to ${count}`, 'Close', { duration: 3000 });
    }
  }

  // Utility Methods

  getRuleStatusIcon(rule: AutomationRule): string {
    return rule.enabled ? 'toggle_on' : 'toggle_off';
  }

  getRuleStatusColor(rule: AutomationRule): string {
    return rule.enabled ? 'primary' : 'warn';
  }

  getAlertIcon(alert: MatchAlert): string {
    switch (alert.type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      case 'info':
      default: return 'info';
    }
  }

  getAlertColor(alert: MatchAlert): string {
    switch (alert.type) {
      case 'error': return 'warn';
      case 'warning': return 'accent';
      case 'success': return 'primary';
      case 'info':
      default: return '';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'critical': return 'priority_high';
      case 'high': return 'keyboard_arrow_up';
      case 'medium': return 'remove';
      case 'low': return 'keyboard_arrow_down';
      default: return 'help';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      case 'low': return '';
      default: return '';
    }
  }

  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleString();
  }

  formatLastTriggered(date?: Date): string {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  getActiveRulesCount(): number {
    return this.automationRules.filter(rule => rule.enabled).length;
  }

  getUnacknowledgedAlertsCount(): number {
    return this.alerts.filter(alert => !alert.acknowledged).length;
  }

  getCriticalAlertsCount(): number {
    return this.alerts.filter(alert => alert.priority === 'critical' && !alert.acknowledged).length;
  }

  getTotalTriggersCount(): number {
    return this.automationRules.reduce((sum, rule) => sum + rule.triggerCount, 0);
  }

  getConditionSummary(rule: AutomationRule): string {
    if (rule.conditions.length === 0) return 'No conditions';
    
    const conditionTexts = rule.conditions.map(condition => {
      switch (condition.type) {
        case 'match_point': return 'Match point reached';
        case 'set_point': return 'Set point reached';
        case 'deuce': return 'Deuce situation';
        case 'match_duration': return `Match duration > ${condition.value} min`;
        case 'player_advantage': return 'Player has advantage';
        case 'score_difference': return `Score difference > ${condition.value}`;
        default: return condition.type;
      }
    });
    
    return conditionTexts.join(', ');
  }

  getActionSummary(rule: AutomationRule): string {
    if (rule.actions.length === 0) return 'No actions';
    
    const actionTexts = rule.actions.map(action => {
      switch (action.type) {
        case 'send_alert': return 'Send alert';
        case 'notify_officials': return 'Notify officials';
        case 'pause_match': return 'Pause match';
        case 'log_event': return 'Log event';
        case 'update_schedule': return 'Update schedule';
        case 'broadcast_announcement': return 'Broadcast announcement';
        default: return action.type;
      }
    });
    
    return actionTexts.join(', ');
  }

  exportAutomationData(): void {
    const data = {
      rules: this.automationRules,
      alerts: this.alerts,
      config: this.schedulingConfig,
      exportedAt: new Date()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Automation data exported', 'Close', { duration: 3000 });
  }

  importAutomationData(): void {
    // TODO: Implement import functionality
    this.snackBar.open('Import feature coming soon...', 'Close', { duration: 2000 });
  }

  // Utility method for title case conversion
  toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
}