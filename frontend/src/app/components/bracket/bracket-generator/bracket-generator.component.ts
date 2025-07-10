import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { BracketService } from '../../../services/bracket.service';
import { PlayerService } from '../../../services/player.service';
import { TournamentService } from '../../../services/tournament.service';
import { TeamService } from '../../../services/team.service';
import { Player } from '../../../models/player.model';
import { Tournament } from '../../../models/tournament.model';
import { Bracket } from '../../../models/bracket.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-bracket-generator',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatStepperModule,
    MatListModule,
    MatChipsModule
  ],
  template: `
    <div class="bracket-generator-container">
      <div class="header-section">
        <div class="header-icon">
          <mat-icon>sports_tennis</mat-icon>
        </div>
        <h1>Generate Tournament Bracket</h1>
        <p class="subtitle">Create professional brackets for your tournament based on player seeding</p>
      </div>

      <mat-card class="generator-card">
        <!-- Show tournament info when coming from tournament management -->
        <div class="tournament-display" *ngIf="isFromTournamentManagement && selectedTournament">
          <h4>Selected Tournament</h4>
          <div class="tournament-name">{{ selectedTournament.name }}</div>
          <div class="tournament-format">{{ selectedTournament.format | titlecase }}</div>
        </div>

        <!-- Show dropdown when not coming from tournament management -->
        <div class="tournament-selection" *ngIf="!isFromTournamentManagement">
          <div class="step-header">
            <div class="step-icon">
              <mat-icon>emoji_events</mat-icon>
            </div>
            <div class="step-content">
              <h3>Choose Tournament</h3>
              <p>Select the tournament for which you want to generate brackets.</p>
            </div>
          </div>
          
          <form [formGroup]="tournamentForm">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tournament</mat-label>
              <mat-select formControlName="tournamentId" (selectionChange)="onTournamentSelect()">
                <mat-option *ngFor="let tournament of tournaments" [value]="tournament._id">
                  {{ tournament.name }} - {{ tournament.format | titlecase }}
                </mat-option>
                <mat-option *ngIf="tournaments.length === 0" disabled>
                  No tournaments available
                </mat-option>
              </mat-select>
              <mat-error *ngIf="tournamentForm.get('tournamentId')?.hasError('required')">
                Please select a tournament
              </mat-error>
            </mat-form-field>

            <div class="no-tournaments" *ngIf="tournaments.length === 0">
              <mat-icon>warning</mat-icon>
              <p>No tournaments found. Create a tournament first.</p>
              <button mat-raised-button color="primary" routerLink="/tournaments/create">
                <mat-icon>add</mat-icon>
                Create Tournament
              </button>
            </div>

            <div class="tournament-info" *ngIf="selectedTournament">
              <h4>Tournament Details</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Format:</span>
                  <span class="value">{{ selectedTournament.format | titlecase }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Game Type:</span>
                  <span class="value">{{ selectedTournament.gameType | titlecase }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Max Players:</span>
                  <span class="value">{{ selectedTournament.maxPlayers }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Current Players:</span>
                  <span class="value">{{ selectedTournament.currentPlayers }}</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div class="content-sections">
          <!-- Players Section -->
          <div class="players-section">
            <div class="section-header">
              <div class="section-icon">
                <mat-icon>groups</mat-icon>
              </div>
              <div class="section-content">
                <h3>Tournament Players</h3>
                <p>Review the registered players and their seeding positions.</p>
              </div>
            </div>

            <div *ngIf="tournamentPlayers.length > 0">
              <div class="players-list">
                <div *ngFor="let player of tournamentPlayers; let i = index" class="player-item">
                  <div class="player-seed">{{ i + 1 }}</div>
                  <div class="player-details">
                    <div class="player-name">{{ player.name }}</div>
                    <div class="player-meta">
                      <mat-chip [color]="getSkillColor(player.skillLevel)" selected>
                        {{ player.skillLevel | titlecase }}
                      </mat-chip>
                      <span class="seed-info">Seed #{{ i + 1 }}</span>
                    </div>
                  </div>
                  <mat-icon class="drag-handle">drag_handle</mat-icon>
                </div>
              </div>

              <div class="player-stats">
                <div class="stat">
                  <span class="stat-label">Total Players:</span>
                  <span class="stat-value">{{ tournamentPlayers.length }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Tournament Capacity:</span>
                  <span class="stat-value">{{ selectedTournament?.maxPlayers }}</span>
                </div>
                <div class="stat" *ngIf="selectedTournament?.format !== 'round-robin'">
                  <span class="stat-label">Estimated Rounds:</span>
                  <span class="stat-value">{{ getEstimatedRounds() }}</span>
                </div>
              </div>
            </div>

            <div class="empty-players" *ngIf="tournamentPlayers.length === 0">
              <mat-icon>groups_off</mat-icon>
              <h4>No Players Registered</h4>
              <p>Add players to the tournament before generating brackets.</p>
              <button mat-raised-button color="primary" routerLink="/players">
                Manage Players
              </button>
            </div>
          </div>

          <!-- Bracket Generation Section -->
          <div class="generation-section" *ngIf="tournamentPlayers.length >= 2">
            <div class="section-header">
              <div class="section-icon">
                <mat-icon>account_tree</mat-icon>
              </div>
              <div class="section-content">
                <h3>Bracket Generation</h3>
                <p>Generate the tournament bracket based on the selected format and player seeding.</p>
              </div>
            </div>

            <div class="generation-options" *ngIf="selectedTournament">
              <h4>Bracket Configuration</h4>
              <div class="config-grid">
                <div class="config-item">
                  <span class="label">Format:</span>
                  <span class="value highlight">{{ selectedTournament.format | titlecase }}</span>
                </div>
                <div class="config-item">
                  <span class="label">Players:</span>
                  <span class="value">{{ tournamentPlayers.length }}</span>
                </div>
                <div class="config-item" *ngIf="selectedTournament.format !== 'round-robin'">
                  <span class="label">Total Rounds:</span>
                  <span class="value">{{ getEstimatedRounds() }}</span>
                </div>
                <div class="config-item" *ngIf="selectedTournament.format === 'round-robin'">
                  <span class="label">Total Matches:</span>
                  <span class="value">{{ getRoundRobinMatches() }}</span>
                </div>
              </div>

              <div class="format-explanation">
                <h5>{{ selectedTournament.format | titlecase }} Format</h5>
                <p *ngIf="selectedTournament.format === 'single-elimination'">
                  Single elimination tournament where players are eliminated after losing one match. 
                  Winners advance to the next round until only one player remains.
                </p>
                <p *ngIf="selectedTournament.format === 'double-elimination'">
                  Double elimination tournament with winners and losers brackets. Players must lose 
                  twice to be eliminated, allowing for a more comprehensive competition.
                </p>
                <p *ngIf="selectedTournament.format === 'round-robin'">
                  Round robin tournament where every player plays against every other player. 
                  Winner is determined by overall record and points.
                </p>
              </div>
            </div>

            <div class="generation-result" *ngIf="generatedBracket">
              <div class="success-message">
                <mat-icon>check_circle</mat-icon>
                <h4>Bracket Generated Successfully!</h4>
                <p>Your tournament bracket has been created and is ready for play.</p>
              </div>

              <div class="bracket-summary">
                <div class="summary-item">
                  <span class="label">Total Matches:</span>
                  <span class="value">{{ getTotalMatches() }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Rounds:</span>
                  <span class="value">{{ generatedBracket.totalRounds }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Status:</span>
                  <span class="value">{{ generatedBracket.status | titlecase }}</span>
                </div>
              </div>
            </div>

            <div class="generation-actions">
              <button mat-raised-button color="primary" (click)="generateBracket()" 
                      [disabled]="isGenerating || !!generatedBracket">
                <mat-icon *ngIf="isGenerating">hourglass_empty</mat-icon>
                <mat-icon *ngIf="!isGenerating">sports_tennis</mat-icon>
                {{ isGenerating ? 'Generating...' : 'Generate Bracket' }}
              </button>
              <button mat-raised-button color="accent" *ngIf="generatedBracket" 
                      (click)="viewBracket()">
                <mat-icon>visibility</mat-icon>
                View Bracket
              </button>
            </div>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .bracket-generator-container {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
      padding: var(--space-6) var(--space-4);
    }

    .header-section {
      text-align: center;
      margin-bottom: var(--space-12);
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 4px;
        background: linear-gradient(90deg, var(--primary-500), var(--accent-500));
        border-radius: var(--border-radius-sm);
      }

      .header-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
        border-radius: 50%;
        margin: 0 auto var(--space-6) auto;
        box-shadow: var(--shadow-xl);
        
        mat-icon {
          font-size: 2.5rem;
          width: 2.5rem;
          height: 2.5rem;
          color: var(--text-on-primary);
        }
      }

      h1 {
        font-size: var(--font-size-4xl);
        font-weight: var(--font-weight-bold);
        color: var(--text-primary);
        margin: 0 0 var(--space-3) 0;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }

      .subtitle {
        color: var(--text-secondary);
        font-size: var(--font-size-lg);
        margin: 0;
        font-weight: var(--font-weight-normal);
        max-width: 600px;
        margin: 0 auto;
        line-height: var(--line-height-relaxed);
      }
    }

    .generator-card {
      background: var(--surface-0);
      border-radius: var(--border-radius-xl);
      box-shadow: var(--shadow-xl);
      padding: var(--space-10);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, var(--primary-500), var(--accent-500));
      }
    }

    .content-sections {
      display: flex;
      flex-direction: column;
      gap: var(--space-10);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
      padding: var(--space-4);
      background: var(--surface-2);
      border-radius: var(--border-radius-lg);
      border: 1px solid rgba(255,255,255,0.1);
      
      .section-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: var(--shadow-md);
        
        mat-icon {
          font-size: 1.5rem;
          width: 1.5rem;
          height: 1.5rem;
          color: var(--text-on-primary);
        }
      }
      
      .section-content {
        flex: 1;
        
        h3 {
          margin: 0 0 var(--space-2) 0;
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--text-primary);
        }
        
        p {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: var(--line-height-normal);
        }
      }
    }

    .generation-section {
      margin-top: var(--space-8);
    }

    .full-width {
      width: 100%;
      margin-bottom: var(--space-4);
    }

    .tournament-display {
      background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
      border-radius: var(--border-radius-lg);
      padding: var(--space-8);
      margin-bottom: var(--space-8);
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 100px;
        height: 100px;
        background: rgba(255,255,255,0.1);
        border-radius: 50%;
        transform: translate(30px, -30px);
      }
      
      h4 {
        margin: 0 0 var(--space-3) 0;
        color: rgba(255,255,255,0.8);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .tournament-name {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        color: var(--text-on-primary);
        margin-bottom: var(--space-2);
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      
      .tournament-format {
        font-size: var(--font-size-xl);
        color: rgba(255,255,255,0.9);
        font-weight: var(--font-weight-medium);
        display: inline-block;
        background: rgba(255,255,255,0.2);
        padding: var(--space-2) var(--space-4);
        border-radius: var(--border-radius-md);
        backdrop-filter: blur(5px);
      }
    }

    .tournament-selection {
      margin-bottom: var(--space-8);
      padding: var(--space-6);
      background: var(--surface-2);
      border-radius: var(--border-radius-lg);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .no-tournaments {
      text-align: center;
      padding: var(--space-10);
      background: linear-gradient(135deg, var(--warning-color), #ffb74d);
      border-radius: var(--border-radius-lg);
      margin-top: var(--space-4);
      color: white;

      mat-icon {
        font-size: 3rem;
        height: 3rem;
        width: 3rem;
        margin-bottom: var(--space-4);
        color: white;
      }

      p {
        margin: 0 0 var(--space-6) 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
      }

      button {
        background: rgba(255,255,255,0.2);
        color: white;
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255,255,255,0.3);
        
        &:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
      }
    }

    .tournament-info {
      margin-top: var(--space-8);
      padding: var(--space-6);
      background: var(--surface-2);
      border-radius: var(--border-radius-lg);
      border: 1px solid rgba(255,255,255,0.1);

      h4 {
        margin: 0 0 var(--space-6) 0;
        color: var(--text-primary);
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-4);
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        padding: var(--space-4);
        background: var(--surface-3);
        border-radius: var(--border-radius-md);
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .label {
          font-weight: var(--font-weight-medium);
          color: var(--text-secondary);
        }

        .value {
          font-weight: var(--font-weight-semibold);
          color: var(--text-primary);
        }
      }
    }

    .players-section {
      .seeding-info {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-4);
        background: linear-gradient(135deg, var(--secondary-500), var(--secondary-600));
        border-radius: var(--border-radius-md);
        margin-bottom: var(--space-6);
        color: var(--text-on-secondary);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .players-list {
        max-height: 600px;
        overflow-y: auto;
        border: 1px solid var(--surface-3);
        border-radius: var(--border-radius-lg);
        margin-bottom: var(--space-6);
        background: var(--surface-1);
        padding: var(--space-2);
        
        // Custom scrollbar
        &::-webkit-scrollbar {
          width: 8px;
        }
        
        &::-webkit-scrollbar-track {
          background: var(--surface-2);
          border-radius: var(--border-radius-md);
        }
        
        &::-webkit-scrollbar-thumb {
          background: var(--primary-500);
          border-radius: var(--border-radius-md);
          
          &:hover {
            background: var(--primary-600);
          }
        }
      }

      .player-item {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-5) var(--space-6);
        margin-bottom: var(--space-2);
        background: var(--surface-2);
        border-radius: var(--border-radius-lg);
        border: 1px solid rgba(255,255,255,0.1);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
        }

        &:hover {
          background: var(--surface-3);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .player-seed {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: var(--text-on-primary);
          border-radius: 50%;
          font-weight: var(--font-weight-bold);
          font-size: var(--font-size-lg);
          box-shadow: var(--shadow-md);
          flex-shrink: 0;
          position: relative;
          
          &::after {
            content: '';
            position: absolute;
            inset: 2px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
          }
        }

        .player-details {
          flex: 1;
          min-width: 0;

          .player-name {
            font-weight: var(--font-weight-semibold);
            margin-bottom: var(--space-2);
            color: var(--text-primary);
            font-size: var(--font-size-lg);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .player-meta {
            display: flex;
            align-items: center;
            gap: var(--space-4);
            flex-wrap: wrap;

            mat-chip {
              font-size: var(--font-size-xs);
              height: 24px;
              font-weight: var(--font-weight-medium);
              
              &[color="primary"] {
                background: var(--primary-500);
                color: var(--text-on-primary);
              }
              
              &[color="accent"] {
                background: var(--accent-500);
                color: white;
              }
              
              &[color="warn"] {
                background: var(--warning-color);
                color: white;
              }
            }

            .seed-info {
              font-size: var(--font-size-sm);
              color: var(--text-secondary);
              font-weight: var(--font-weight-medium);
              background: var(--surface-3);
              padding: var(--space-1) var(--space-3);
              border-radius: var(--border-radius-md);
              white-space: nowrap;
            }
          }
        }

        .drag-handle {
          color: var(--text-hint);
          cursor: grab;
          transition: all 0.2s ease;
          padding: var(--space-2);
          border-radius: var(--border-radius-md);
          flex-shrink: 0;

          &:hover {
            color: var(--text-secondary);
            background: var(--surface-3);
          }
          
          &:active {
            cursor: grabbing;
          }
        }
      }

      .player-stats {
        display: flex;
        gap: var(--space-8);
        padding: var(--space-6);
        background: var(--surface-2);
        border-radius: var(--border-radius-lg);
        border: 1px solid rgba(255,255,255,0.1);

        .stat {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);

          .stat-label {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            font-weight: var(--font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .stat-value {
            font-size: var(--font-size-2xl);
            font-weight: var(--font-weight-bold);
            color: var(--primary-500);
          }
        }
      }
    }

    .empty-players {
      text-align: center;
      padding: var(--space-16) var(--space-8);
      color: var(--text-secondary);

      mat-icon {
        font-size: 4rem;
        height: 4rem;
        width: 4rem;
        margin-bottom: var(--space-6);
        color: var(--text-hint);
      }

      h4 {
        margin: 0 0 var(--space-3) 0;
        color: var(--text-primary);
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
      }

      p {
        margin: 0 0 var(--space-8) 0;
        font-size: var(--font-size-base);
      }
    }

    .generation-options {
      .config-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--space-4);
        margin-bottom: var(--space-8);
      }

      .config-item {
        display: flex;
        justify-content: space-between;
        padding: var(--space-5);
        background: var(--surface-2);
        border-radius: var(--border-radius-md);
        border: 1px solid rgba(255,255,255,0.1);
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .label {
          font-weight: var(--font-weight-medium);
          color: var(--text-secondary);
        }

        .value {
          font-weight: var(--font-weight-semibold);
          color: var(--text-primary);

          &.highlight {
            color: var(--primary-500);
          }
        }
      }

      .format-explanation {
        padding: var(--space-6);
        background: linear-gradient(135deg, var(--secondary-500), var(--secondary-600));
        border-radius: var(--border-radius-lg);
        color: var(--text-on-secondary);
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent-500);
        }

        h5 {
          margin: 0 0 var(--space-3) 0;
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
        }

        p {
          margin: 0;
          line-height: var(--line-height-relaxed);
          font-size: var(--font-size-base);
        }
      }
    }

    .generation-result {
      .success-message {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-6);
        background: linear-gradient(135deg, var(--accent-500), var(--accent-600));
        border-radius: var(--border-radius-lg);
        margin-bottom: var(--space-6);
        color: white;

        mat-icon {
          font-size: 2.5rem;
          height: 2.5rem;
          width: 2.5rem;
        }

        h4 {
          margin: 0 0 var(--space-1) 0;
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-semibold);
        }

        p {
          margin: 0;
          font-size: var(--font-size-base);
        }
      }

      .bracket-summary {
        display: flex;
        gap: var(--space-8);
        padding: var(--space-6);
        background: var(--surface-2);
        border-radius: var(--border-radius-lg);
        border: 1px solid rgba(255,255,255,0.1);

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);

          .label {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            font-weight: var(--font-weight-medium);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .value {
            font-size: var(--font-size-xl);
            font-weight: var(--font-weight-bold);
            color: var(--primary-500);
          }
        }
      }
    }

    .generation-actions {
      display: flex;
      gap: var(--space-4);
      margin-top: var(--space-8);
      justify-content: center;

      button {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-4) var(--space-6);
        border-radius: var(--border-radius-md);
        font-weight: var(--font-weight-medium);
        transition: all 0.2s ease;
        min-width: 160px;
        justify-content: center;

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        &[color="primary"] {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: var(--text-on-primary);
        }

        &[color="accent"] {
          background: linear-gradient(135deg, var(--accent-500), var(--accent-600));
          color: white;
        }
      }
    }

    @media (max-width: 768px) {
      .bracket-generator-container {
        padding: var(--space-4) var(--space-2);
      }

      .generator-card {
        padding: var(--space-6) var(--space-4);
      }

      .generation-options .config-grid,
      .player-stats,
      .generation-result .bracket-summary {
        flex-direction: column;
        gap: var(--space-4);
      }

      .generation-actions {
        flex-direction: column;

        button {
          width: 100%;
          justify-content: center;
        }
      }

      .tournament-display {
        padding: var(--space-6);
        
        .tournament-name {
          font-size: var(--font-size-2xl);
        }
      }
    }


    ::ng-deep .mat-form-field {
      .mat-form-field-outline {
        color: var(--surface-3);
      }
      
      .mat-form-field-outline-thick {
        color: var(--primary-500);
      }
      
      .mat-form-field-label {
        color: var(--text-secondary);
      }
      
      .mat-form-field-required-marker {
        color: var(--error-color);
      }
    }

    ::ng-deep .mat-select-panel {
      background: var(--surface-0);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-xl);
      
      .mat-option {
        color: var(--text-primary);
        
        &:hover {
          background: var(--surface-2);
        }
        
        &.mat-selected {
          background: var(--primary-500);
          color: var(--text-on-primary);
        }
      }
    }
  `]
})
export class BracketGeneratorComponent implements OnInit {
  tournamentForm: FormGroup;
  tournaments: Tournament[] = [];
  selectedTournament?: Tournament;
  preselectedTournamentId: string | null = null;
  tournamentPlayers: Player[] = [];
  generatedBracket?: Bracket;
  isGenerating = false;
  isFromTournamentManagement = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private bracketService: BracketService,
    private playerService: PlayerService,
    private tournamentService: TournamentService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef
  ) {
    this.tournamentForm = this.fb.group({
      tournamentId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTournaments();
    
    // Check for tournamentId in query parameters
    this.route.queryParams.subscribe(params => {
      console.log('🔍 All query params:', params);
      if (params['tournamentId']) {
        console.log('🔍 Found tournamentId in query params:', params['tournamentId']);
        // We'll set the tournament selection after tournaments are loaded
        this.preselectedTournamentId = params['tournamentId'];
        this.isFromTournamentManagement = true;
      } else {
        console.log('❌ No tournamentId found in query params');
        this.isFromTournamentManagement = false;
      }
    });
  }

  loadTournaments(): void {
    console.log('Loading tournaments...');
    this.tournamentService.getAllTournaments().subscribe({
      next: (tournaments) => {
        console.log('Tournaments loaded:', tournaments);
        this.tournaments = tournaments;
        
        // If we have a preselected tournament ID, set it
        if (this.preselectedTournamentId) {
          console.log('🎯 Setting preselected tournament:', this.preselectedTournamentId);
          console.log('🎯 Available tournaments:', this.tournaments.map(t => ({ id: t._id, name: t.name })));
          
          this.tournamentForm.patchValue({
            tournamentId: this.preselectedTournamentId
          });
          
          console.log('🎯 Form value after patch:', this.tournamentForm.value);
          this.onTournamentSelect();
          console.log('🎯 Selected tournament after onTournamentSelect:', this.selectedTournament?.name);
          
          // Force change detection to update the dropdown display
          this.cdr.detectChanges();
          console.log('🎯 Change detection triggered');
        }
      },
      error: (error) => {
        console.error('Error loading tournaments:', error);
        this.tournaments = [];
      }
    });
  }

  onTournamentSelect(): void {
    const tournamentId = this.tournamentForm.value.tournamentId;
    console.log('🎯 onTournamentSelect called with tournamentId:', tournamentId);
    this.selectedTournament = this.tournaments.find(t => t._id === tournamentId);
    console.log('🎯 Found tournament:', this.selectedTournament?.name || 'Not found');
    
    if (this.selectedTournament) {
      this.loadTournamentPlayers();
    }
  }

  loadTournamentPlayers(): void {
    if (!this.selectedTournament?._id) {
      console.log('⚠️ No selected tournament ID, cannot load players');
      return;
    }
    
    console.log('🔍 Loading players for tournament:', this.selectedTournament._id);
    console.log('🔗 API URL:', `${environment.apiUrl}/api/player-registrations/tournament/${this.selectedTournament._id}`);
    
    // Load players registered for the selected tournament
    this.http.get<any>(`${environment.apiUrl}/api/player-registrations/tournament/${this.selectedTournament._id}`).subscribe({
      next: (response) => {
        console.log('📥 Player registrations response:', response);
        if (response && response.data) {
          this.tournamentPlayers = response.data.map((registration: any) => ({
            ...registration.player,
            name: `${registration.player.firstName} ${registration.player.lastName}`,
            seedPosition: registration.seed || 0,
            isRegistered: true
          })).sort((a: any, b: any) => (a.seedPosition || 0) - (b.seedPosition || 0));
          console.log('✅ Loaded tournament players:', this.tournamentPlayers);
          console.log('📊 Total players loaded:', this.tournamentPlayers.length);
        } else {
          console.log('⚠️ No data in response');
          this.tournamentPlayers = [];
        }
      },
      error: (error) => {
        console.error('❌ Error loading players:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        this.tournamentPlayers = [];
      }
    });
  }

  getSkillColor(skillLevel: string): string {
    switch (skillLevel) {
      case 'professional': return 'warn';
      case 'advanced': return 'primary';
      case 'intermediate': return 'accent';
      case 'beginner': return '';
      default: return '';
    }
  }

  getEstimatedRounds(): number {
    if (!this.selectedTournament || this.selectedTournament.format === 'round-robin') {
      return 1;
    }
    return Math.ceil(Math.log2(this.tournamentPlayers.length));
  }

  getRoundRobinMatches(): number {
    const n = this.tournamentPlayers.length;
    return (n * (n - 1)) / 2;
  }

  generateBracket(): void {
    if (!this.selectedTournament) return;

    this.isGenerating = true;
    console.log('Generating bracket for tournament:', this.selectedTournament);
    
    // For doubles tournaments, load teams from database first
    if (this.selectedTournament.gameType === 'doubles') {
      console.log('🎾 Loading teams from database for doubles tournament...');
      
      this.teamService.getTeamsByTournament(this.selectedTournament._id!).subscribe({
        next: (teams) => {
          console.log('✅ Teams loaded from database:', teams);
          
          if (teams.length === 0) {
            console.log('❌ No teams found for this tournament');
            this.isGenerating = false;
            alert('No teams found for this tournament. Please generate teams first.');
            return;
          }

          // Convert teams to participants for bracket generation
          const teamParticipants = teams.map((team, index) => ({
            _id: team._id,
            name: team.name,
            seedPosition: team.seed || index + 1,
            skillLevel: team.averageSkillLevel || 'intermediate',
            isRegistered: true,
            isTeam: true,
            teamData: team
          }));

          console.log('🎯 Using teams as participants:', teamParticipants);
          console.log(`📊 Will create ${teamParticipants.length} team matches for doubles tournament`);
          
          this.proceedWithBracketGeneration(teamParticipants);
        },
        error: (error) => {
          console.error('❌ Error loading teams:', error);
          this.isGenerating = false;
          alert('Failed to load teams from database. Check console for details.');
        }
      });
    } else {
      // For singles tournaments, use individual players
      console.log('👥 Using individual players for singles tournament');
      const participants = this.tournamentPlayers;
      this.proceedWithBracketGeneration(participants);
    }
  }

  private proceedWithBracketGeneration(participants: any[]): void {
    console.log('🚀 Proceeding with bracket generation using participants:', participants);
    
    let bracketObservable;
    switch (this.selectedTournament!.format) {
      case 'single-elimination':
        bracketObservable = this.bracketService.generateSingleEliminationBracket(
          participants, this.selectedTournament!._id!
        );
        break;
      case 'double-elimination':
        bracketObservable = this.bracketService.generateDoubleEliminationBracket(
          participants, this.selectedTournament!._id!
        );
        break;
      case 'round-robin':
        bracketObservable = this.bracketService.generateRoundRobinBracket(
          participants, this.selectedTournament!._id!
        );
        break;
      default:
        bracketObservable = this.bracketService.generateSingleEliminationBracket(
          participants, this.selectedTournament!._id!
        );
        break;
    }

    bracketObservable.subscribe({
      next: (bracket) => {
        console.log('✅ Bracket generated successfully:', bracket);
        this.generatedBracket = bracket;
        this.isGenerating = false;
      },
      error: (error) => {
        console.error('❌ Error generating bracket:', error);
        this.isGenerating = false;
        alert('Failed to generate bracket. Check console for details.');
      }
    });
  }

  private getParticipants(): Player[] {
    console.log('🔍 Getting participants for tournament:', this.selectedTournament?.name);
    console.log('🔍 Game type:', this.selectedTournament?.gameType);
    
    // For doubles tournaments, load teams from database instead of localStorage
    if (this.selectedTournament?.gameType === 'doubles') {
      console.log('🎾 This is a doubles tournament, loading teams from database...');
      
      // Return empty array for now - will be loaded asynchronously
      // This method needs to be refactored to handle async operations
      console.log('⚠️ Need to refactor this method to handle async team loading');
      return [];
    }
    
    // For singles tournaments, use individual players
    console.log('👥 Using individual players:', this.tournamentPlayers);
    console.log(`📊 Will create ${Math.ceil(this.tournamentPlayers.length / 2)} matches for ${this.tournamentPlayers.length} players`);
    return this.tournamentPlayers;
  }

  getTotalMatches(): number {
    if (!this.generatedBracket) return 0;
    
    // Handle different bracket structures from database
    if (this.generatedBracket.rounds && Array.isArray(this.generatedBracket.rounds)) {
      return this.generatedBracket.rounds.reduce((total: number, round: any) => total + (round.matches?.length || 0), 0);
    }
    
    // If bracketData contains the original structure
    if (this.generatedBracket.bracketData && this.generatedBracket.bracketData.rounds) {
      return this.generatedBracket.bracketData.rounds.reduce((total: number, round: any) => total + (round.matches?.length || 0), 0);
    }
    
    // Fallback calculation based on teams
    if (this.generatedBracket.teams && this.generatedBracket.format) {
      const teamCount = Array.isArray(this.generatedBracket.teams) ? this.generatedBracket.teams.length : 0;
      if (this.generatedBracket.format === 'round-robin') {
        return (teamCount * (teamCount - 1)) / 2;
      } else {
        return Math.max(0, teamCount - 1); // Single/Double elimination: n-1 matches
      }
    }
    
    return 0;
  }

  viewBracket(): void {
    if (this.generatedBracket && this.selectedTournament) {
      // Navigate to bracket view using the tournament-specific route
      this.router.navigate(['/tournaments', this.selectedTournament._id, 'manage']);
    }
  }
}