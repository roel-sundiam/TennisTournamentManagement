import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlayerService } from '../../../services/player.service';
import { Player } from '../../../models/player.model';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule
  ],
  template: `
    <div class="player-list-container">
      <div class="header-section">
        <div class="title-section">
          <h1>Player Management</h1>
          <p class="subtitle">Manage tennis players and registrations</p>
        </div>
        <button mat-raised-button color="primary" class="create-btn" routerLink="/players/add">
          <mat-icon>person_add</mat-icon>
          Add Player
        </button>
      </div>

      <div class="filter-section">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Search Players</mat-label>
          <input matInput [(ngModel)]="searchTerm" (input)="applyFilter()" placeholder="Search by name or email">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Filter by Skill Level</mat-label>
          <mat-select [(value)]="selectedSkillLevel" (selectionChange)="applyFilter()">
            <mat-option value="">All Levels</mat-option>
            <mat-option value="beginner">Beginner</mat-option>
            <mat-option value="intermediate">Intermediate</mat-option>
            <mat-option value="advanced">Advanced</mat-option>
            <mat-option value="professional">Professional</mat-option>
          </mat-select>
        </mat-form-field>
        
        <div class="player-count">
          <span>{{ filteredPlayers.length }} player(s) found</span>
        </div>
      </div>

      <div class="players-content">
        <!-- Card View for Mobile -->
        <div class="players-grid mobile-view">
          <mat-card class="player-card" *ngFor="let player of filteredPlayers">
            <mat-card-header>
              <div class="player-avatar" mat-card-avatar>
                <mat-icon>person</mat-icon>
              </div>
              <mat-card-title>{{ player.name }}</mat-card-title>
              <mat-card-subtitle>{{ player.email }}</mat-card-subtitle>
            </mat-card-header>
            
            <mat-card-content>
              <div class="player-details">
                <div class="detail-item">
                  <mat-icon>phone</mat-icon>
                  <span>{{ player.phone || 'No phone' }}</span>
                </div>
                
                <div class="detail-item">
                  <mat-icon>sports_tennis</mat-icon>
                  <span>{{ player.skillLevel | titlecase }} Level</span>
                </div>
                
                <div class="detail-item" *ngIf="player.ranking">
                  <mat-icon>leaderboard</mat-icon>
                  <span>Ranking: #{{ player.ranking }}</span>
                </div>

                <div class="detail-item" *ngIf="player.seedPosition">
                  <mat-icon>star</mat-icon>
                  <span>Seed: #{{ player.seedPosition }}</span>
                </div>
              </div>

              <div class="player-tags">
                <mat-chip-set>
                  <mat-chip [color]="getSkillLevelColor(player.skillLevel)" selected>
                    {{ player.skillLevel | titlecase }}
                  </mat-chip>
                  <mat-chip *ngIf="player.isRegistered" color="primary" selected>
                    Registered
                  </mat-chip>
                </mat-chip-set>
              </div>
            </mat-card-content>
            
            <mat-card-actions>
              <button mat-button color="primary" [routerLink]="['/players', player._id, 'edit']">
                <mat-icon>edit</mat-icon>
                Edit
              </button>
              <button mat-button color="warn" (click)="deletePlayer(player._id!, player.name)">
                <mat-icon>delete</mat-icon>
                Delete
              </button>
              <button mat-button color="accent" *ngIf="!player.isRegistered" (click)="registerPlayer(player)">
                <mat-icon>how_to_reg</mat-icon>
                Register
              </button>
            </mat-card-actions>
          </mat-card>
        </div>

        <!-- Table View for Desktop -->
        <div class="players-table desktop-view">
          <mat-card>
            <table mat-table [dataSource]="filteredPlayers" matSort class="player-table">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                <td mat-cell *matCellDef="let player">
                  <div class="player-info">
                    <div class="player-name">{{ player.name }}</div>
                    <div class="player-email">{{ player.email }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Skill Level Column -->
              <ng-container matColumnDef="skillLevel">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Skill Level</th>
                <td mat-cell *matCellDef="let player">
                  <mat-chip [color]="getSkillLevelColor(player.skillLevel)" selected>
                    {{ player.skillLevel | titlecase }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Ranking Column -->
              <ng-container matColumnDef="ranking">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Ranking</th>
                <td mat-cell *matCellDef="let player">
                  <span *ngIf="player.ranking">#{{ player.ranking }}</span>
                  <span *ngIf="!player.ranking" class="no-data">-</span>
                </td>
              </ng-container>

              <!-- Seed Column -->
              <ng-container matColumnDef="seed">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Seed</th>
                <td mat-cell *matCellDef="let player">
                  <span *ngIf="player.seedPosition">#{{ player.seedPosition }}</span>
                  <span *ngIf="!player.seedPosition" class="no-data">-</span>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let player">
                  <mat-chip *ngIf="player.isRegistered" color="primary" selected>
                    Registered
                  </mat-chip>
                  <mat-chip *ngIf="!player.isRegistered" color="warn">
                    Not Registered
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let player">
                  <button mat-icon-button color="primary" [routerLink]="['/players', player._id, 'edit']">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deletePlayer(player._id!, player.name)">
                    <mat-icon>delete</mat-icon>
                  </button>
                  <button mat-icon-button color="accent" *ngIf="!player.isRegistered" (click)="registerPlayer(player)">
                    <mat-icon>how_to_reg</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </mat-card>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredPlayers.length === 0">
        <mat-icon class="empty-icon">person</mat-icon>
        <h2>No players found</h2>
        <p>Add your first player to get started!</p>
        <button mat-raised-button color="primary" routerLink="/players/add">
          <mat-icon>person_add</mat-icon>
          Add Player
        </button>
      </div>
    </div>
  `,
  styles: [`
    .player-list-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }
    }

    .title-section h1 {
      margin: 0 0 8px 0;
      font-size: 2rem;
      font-weight: 500;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 1rem;
    }

    .create-btn {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      align-items: center;
      flex-wrap: wrap;
      
      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
    }

    .filter-field {
      min-width: 200px;
      
      @media (max-width: 768px) {
        min-width: 100%;
      }
    }

    .player-count {
      margin-left: auto;
      color: #666;
      font-size: 0.9rem;
      
      @media (max-width: 768px) {
        margin-left: 0;
        text-align: center;
      }
    }

    /* Mobile Card View */
    .mobile-view {
      display: block;
      
      @media (min-width: 768px) {
        display: none;
      }
    }

    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .player-card {
      .player-avatar {
        background-color: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
        
        mat-icon {
          font-size: 24px;
          color: #666;
        }
      }
      
      .player-details {
        margin: 16px 0;
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          
          mat-icon {
            font-size: 18px;
            color: #666;
            width: 18px;
            height: 18px;
          }
          
          span {
            font-size: 0.9rem;
          }
        }
      }
      
      .player-tags {
        margin-bottom: 16px;
      }
      
      mat-card-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        
        button {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
        }
      }
    }

    /* Desktop Table View */
    .desktop-view {
      display: none;
      
      @media (min-width: 768px) {
        display: block;
      }
    }

    .player-table {
      width: 100%;
      
      .player-info {
        .player-name {
          font-weight: 500;
          margin-bottom: 2px;
        }
        
        .player-email {
          font-size: 0.8rem;
          color: #666;
        }
      }
      
      .no-data {
        color: #999;
        font-style: italic;
      }
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      
      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ccc;
        margin-bottom: 16px;
      }
      
      h2 {
        margin: 0 0 8px 0;
        color: #666;
      }
      
      p {
        margin: 0 0 24px 0;
        color: #999;
      }
      
      button {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 auto;
      }
    }
  `]
})
export class PlayerListComponent implements OnInit {
  players: Player[] = [];
  filteredPlayers: Player[] = [];
  searchTerm = '';
  selectedSkillLevel = '';
  
  displayedColumns: string[] = ['name', 'skillLevel', 'ranking', 'seed', 'status', 'actions'];

  constructor(
    private playerService: PlayerService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPlayers();
  }

  loadPlayers(): void {
    this.playerService.getAllPlayers().subscribe(players => {
      this.players = players;
      this.applyFilter();
    });
  }

  applyFilter(): void {
    this.filteredPlayers = this.players.filter(player => {
      const matchesSearch = !this.searchTerm || 
        player.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (player.email && player.email.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchesSkillLevel = !this.selectedSkillLevel || 
        player.skillLevel === this.selectedSkillLevel;
      
      return matchesSearch && matchesSkillLevel;
    });
  }

  getSkillLevelColor(skillLevel: string): string {
    switch (skillLevel) {
      case 'beginner': return 'primary';
      case 'intermediate': return 'accent';
      case 'advanced': return 'warn';
      case 'professional': return '';
      default: return 'primary';
    }
  }

  deletePlayer(playerId: string, playerName: string): void {
    if (confirm(`Are you sure you want to delete "${playerName}"? This action cannot be undone.`)) {
      this.playerService.deletePlayer(playerId).subscribe({
        next: () => {
          this.snackBar.open('Player deleted successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadPlayers();
        },
        error: (error) => {
          this.snackBar.open('Failed to delete player', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          console.error('Delete error:', error);
        }
      });
    }
  }

  registerPlayer(player: Player): void {
    // This will be implemented when we create tournament registration
    this.snackBar.open('Player registration feature coming soon!', 'Close', {
      duration: 3000
    });
  }
}