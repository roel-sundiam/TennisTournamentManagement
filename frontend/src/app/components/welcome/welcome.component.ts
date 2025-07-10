import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent {
  features = [
    {
      icon: 'emoji_events',
      title: 'Tournament Management',
      description: 'Create and manage tennis tournaments with multiple formats including single elimination, double elimination, and round-robin.',
      action: 'Manage Tournaments',
      route: '/tournaments'
    },
    {
      icon: 'groups',
      title: 'Player & Team Management',
      description: 'Register players, create teams, and manage seedings with drag-and-drop functionality.',
      action: 'Manage Players',
      route: '/players'
    },
    {
      icon: 'account_tree',
      title: 'Bracket Generation',
      description: 'Automatically generate tournament brackets and track match progression in real-time.',
      action: 'View Tournaments',
      route: '/tournaments'
    },
    {
      icon: 'schedule',
      title: 'Match Scheduling',
      description: 'Schedule matches, assign courts, and manage tournament timelines efficiently.',
      action: 'View Schedule',
      route: '/schedule'
    },
    {
      icon: 'leaderboard',
      title: 'Live Scoring',
      description: 'Update match scores in real-time and provide live tournament updates to participants.',
      action: 'Live Scores',
      route: '/scoring'
    },
    {
      icon: 'analytics',
      title: 'Tournament Analytics',
      description: 'Track tournament statistics, player performance, and generate comprehensive reports.',
      action: 'View Analytics',
      route: '/analytics'
    }
  ];
}
