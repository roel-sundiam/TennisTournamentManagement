import { Routes } from '@angular/router';

export const routes: Routes = [
  // Default redirect
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  
  // Welcome page
  { 
    path: 'welcome', 
    loadComponent: () => import('./components/welcome/welcome.component').then(m => m.WelcomeComponent),
    title: 'Welcome - Tennis Tournament Manager'
  },
  
  // Authentication routes
  { 
    path: 'login', 
    loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Sign In - Tennis Tournament Manager'
  },
  { 
    path: 'register', 
    loadComponent: () => import('./components/auth/register/register.component').then(m => m.RegisterComponent),
    title: 'Create Account - Tennis Tournament Manager'
  },
  
  // Tournament routes
  { 
    path: 'tournaments', 
    loadComponent: () => import('./components/tournament/tournament-list/tournament-list.component').then(m => m.TournamentListComponent),
    title: 'Tournaments - Tennis Tournament Manager'
  },
  { 
    path: 'tournaments/create', 
    loadComponent: () => import('./components/tournament/tournament-form/tournament-form.component').then(m => m.TournamentFormComponent),
    title: 'Create Tournament - Tennis Tournament Manager'
  },
  { 
    path: 'tournaments/:id/edit', 
    loadComponent: () => import('./components/tournament/tournament-form/tournament-form.component').then(m => m.TournamentFormComponent),
    title: 'Edit Tournament - Tennis Tournament Manager'
  },
  { 
    path: 'tournaments/:tournamentId/register', 
    loadComponent: () => import('./components/tournament/tournament-registration/tournament-registration.component').then(m => m.TournamentRegistrationComponent),
    title: 'Tournament Registration - Tennis Tournament Manager'
  },
  
  // Player routes
  { 
    path: 'players', 
    loadComponent: () => import('./components/player/player-list/player-list.component').then(m => m.PlayerListComponent),
    title: 'Players - Tennis Tournament Manager'
  },
  { 
    path: 'players/add', 
    loadComponent: () => import('./components/player/player-form/player-form.component').then(m => m.PlayerFormComponent),
    title: 'Add Player - Tennis Tournament Manager'
  },
  { 
    path: 'players/:id/edit', 
    loadComponent: () => import('./components/player/player-form/player-form.component').then(m => m.PlayerFormComponent),
    title: 'Edit Player - Tennis Tournament Manager'
  },
  
  // Unified Tournament Management (Bracket + Schedule)
  { 
    path: 'tournaments/:tournamentId/manage', 
    loadComponent: () => import('./components/tournament/tournament-management/tournament-management.component').then(m => m.TournamentManagementComponent),
    title: 'Tournament Management - Tennis Tournament Manager'
  },
  
  // Legacy bracket routes (keep for now, will redirect)
  { 
    path: 'brackets', 
    redirectTo: '/tournaments',
    pathMatch: 'full'
  },
  { 
    path: 'brackets/generate', 
    loadComponent: () => import('./components/bracket/bracket-generator/bracket-generator.component').then(m => m.BracketGeneratorComponent),
    title: 'Generate Bracket - Tennis Tournament Manager'
  },
  { 
    path: 'tournaments/:tournamentId/brackets', 
    redirectTo: '/tournaments/:tournamentId/manage',
    pathMatch: 'full'
  },
  { 
    path: 'tournaments/:tournamentId/seeding', 
    loadComponent: () => import('./components/tournament/tournament-seeding/tournament-seeding.component').then(m => m.TournamentSeedingComponent),
    title: 'Tournament Seeding - Tennis Tournament Manager'
  },
  { 
    path: 'seeding', 
    loadComponent: () => import('./components/tournament/tournament-seeding/tournament-seeding.component').then(m => m.TournamentSeedingComponent),
    title: 'Player Seeding - Tennis Tournament Manager'
  },
  
  // Team routes
  { 
    path: 'teams', 
    loadComponent: () => import('./components/team/team-generator/team-generator.component').then(m => m.TeamGeneratorComponent),
    title: 'Team Generation - Tennis Tournament Manager'
  },
  { 
    path: 'tournaments/:tournamentId/teams', 
    loadComponent: () => import('./components/team/team-generator/team-generator.component').then(m => m.TeamGeneratorComponent),
    title: 'Tournament Teams - Tennis Tournament Manager'
  },
  { 
    path: 'tournaments/:id/schedule', 
    loadComponent: () => import('./components/scheduling/schedule-view.component').then(m => m.ScheduleViewComponent),
    title: 'Tournament Schedule - Tennis Tournament Manager'
  },
  
  // Scoring routes
  { 
    path: 'scoring', 
    loadComponent: () => import('./components/scoring/live-scoring/live-scoring.component').then(m => m.LiveScoringComponent),
    title: 'Live Scoring - Tennis Tournament Manager'
  },
  { 
    path: 'scoring/match/:matchId', 
    loadComponent: () => import('./components/scoring/match-scorer/match-scorer.component').then(m => m.MatchScorerComponent),
    title: 'Match Scorer - Tennis Tournament Manager'
  },
  
  // Court management routes
  { 
    path: 'courts', 
    loadComponent: () => import('./components/court/court-list.component').then(m => m.CourtListComponent),
    title: 'Court Management - Tennis Tournament Manager'
  },
  
  // Scheduling routes (ordered from most specific to least specific)
  { 
    path: 'schedule/builder', 
    loadComponent: () => import('./components/scheduling/schedule-builder.component').then(m => m.ScheduleBuilderComponent),
    title: 'Schedule Builder - Tennis Tournament Manager'
  },
  { 
    path: 'schedule/view/:id', 
    loadComponent: () => import('./components/scheduling/schedule-view.component').then(m => m.ScheduleViewComponent),
    title: 'Tournament Schedule - Tennis Tournament Manager'
  },
  
  
  // Catch-all route
  { path: '**', redirectTo: '/welcome' }
];
