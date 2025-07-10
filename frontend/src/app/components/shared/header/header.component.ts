import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <mat-toolbar color="primary" class="header-toolbar">
      <div class="header-container">
        <!-- Logo and Brand -->
        <div class="brand-section">
          <mat-icon class="brand-icon">sports_tennis</mat-icon>
          <span class="brand-text" routerLink="/welcome">
            <span class="brand-full">Tennis Tournament Manager</span>
            <span class="brand-short">Tennis Manager</span>
          </span>
        </div>

        <!-- Navigation Menu -->
        <nav class="nav-section">
          <button mat-icon-button routerLink="/welcome" routerLinkActive="active-route" class="nav-btn">
            <mat-icon>home</mat-icon>
          </button>
          <button mat-icon-button routerLink="/tournaments" routerLinkActive="active-route" class="nav-btn">
            <mat-icon>emoji_events</mat-icon>
          </button>
          <button mat-icon-button [matMenuTriggerFor]="moreMenu" class="nav-btn">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #moreMenu="matMenu">
            <button mat-menu-item routerLink="/players">
              <mat-icon>person</mat-icon>
              <span>Players</span>
            </button>
            <button mat-menu-item routerLink="/teams">
              <mat-icon>groups</mat-icon>
              <span>Teams</span>
            </button>
            <button mat-menu-item [matMenuTriggerFor]="scheduleSubMenu">
              <mat-icon>schedule</mat-icon>
              <span>Schedule</span>
            </button>
            <mat-menu #scheduleSubMenu="matMenu">
              <button mat-menu-item routerLink="/courts">
                <mat-icon>sports_tennis</mat-icon>
                <span>Manage Courts</span>
              </button>
              <button mat-menu-item routerLink="/schedule/builder">
                <mat-icon>build</mat-icon>
                <span>Schedule Builder</span>
              </button>
            </mat-menu>
            <button mat-menu-item routerLink="/seeding">
              <mat-icon>reorder</mat-icon>
              <span>Player Seeding</span>
            </button>
            <button mat-menu-item routerLink="/brackets/generate">
              <mat-icon>tournament</mat-icon>
              <span>Generate Brackets</span>
            </button>
            <button mat-menu-item routerLink="/scoring">
              <mat-icon>leaderboard</mat-icon>
              <span>Live Scores</span>
            </button>
          </mat-menu>
        </nav>

        <!-- User Actions -->
        <div class="user-section">
          <!-- Authenticated User -->
          <div *ngIf="isAuthenticated$ | async; else guestActions">
            <span class="user-greeting" *ngIf="currentUser$ | async as user">
              Hello, {{ user.firstName }}!
            </span>
            <button mat-icon-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu">
              <div mat-menu-item class="user-info" *ngIf="currentUser$ | async as user">
                <div class="user-details">
                  <div class="user-name">{{ user.fullName }}</div>
                  <div class="user-role">{{ user.role | titlecase }}</div>
                </div>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item>
                <mat-icon>person</mat-icon>
                <span>Profile</span>
              </button>
              <button mat-menu-item>
                <mat-icon>settings</mat-icon>
                <span>Settings</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          </div>
          
          <!-- Guest Actions -->
          <ng-template #guestActions>
            <button mat-button routerLink="/login">
              <mat-icon>login</mat-icon>
              Sign In
            </button>
            <button mat-raised-button color="accent" routerLink="/register">
              <mat-icon>person_add</mat-icon>
              Sign Up
            </button>
          </ng-template>
        </div>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .header-toolbar {
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
      box-shadow: var(--shadow-md);
      backdrop-filter: blur(8px);
    }

    .header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: var(--container-xl);
      margin: 0 auto;
      padding: 0 var(--space-4);
    }

    .brand-section {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .brand-icon {
      margin-right: var(--space-2);
      font-size: 28px;
      height: 28px;
      width: 28px;
      color: var(--accent-500);
    }

    .brand-text {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-medium);
      text-decoration: none;
      color: inherit;
      transition: color var(--duration-fast) var(--ease-out);
    }

    .brand-text:hover {
      color: var(--accent-500);
    }

    .brand-short {
      display: none;
    }

    .brand-full {
      display: inline;
    }

    .nav-section {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--border-radius-md);
      transition: all var(--duration-fast) var(--ease-out);
      width: 44px;
      height: 44px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .user-section {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .user-greeting {
      margin-right: var(--space-2);
      font-size: var(--font-size-sm);
      color: rgba(255, 255, 255, 0.8);
      font-weight: var(--font-weight-medium);
    }

    .user-info {
      padding: var(--space-2) var(--space-4);
      cursor: default;
      
      .user-details {
        .user-name {
          font-weight: var(--font-weight-medium);
          margin-bottom: var(--space-1);
          font-size: var(--font-size-base);
        }
        
        .user-role {
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
        }
      }
    }

    .active-route {
      background-color: rgba(255, 255, 255, 0.2) !important;
      box-shadow: var(--shadow-sm);
    }

    @media (max-width: 768px) {
      .header-container {
        padding: 0 var(--space-2);
      }
      
      .brand-text {
        font-size: var(--font-size-base);
      }
      
      .brand-full {
        display: none;
      }
      
      .brand-short {
        display: inline;
      }
      
      .brand-icon {
        font-size: 20px;
        height: 20px;
        width: 20px;
        margin-right: var(--space-1);
      }
      
      .nav-section {
        gap: 2px;
      }
      
      .nav-btn {
        width: 36px;
        height: 36px;
        
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      
      .user-greeting {
        display: none;
      }
      
      .user-section button {
        width: 36px;
        height: 36px;
      }
    }
  `]
})
export class HeaderComponent implements OnInit {
  currentUser$: Observable<User | null>;
  isAuthenticated$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  ngOnInit(): void {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/welcome']);
  }
}