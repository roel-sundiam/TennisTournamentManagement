import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { PlayerService } from '../../../services/player.service';
import { Player } from '../../../models/player.model';

@Component({
  selector: 'app-player-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="player-form-container">
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{ isEditMode ? 'edit' : 'person_add' }}</mat-icon>
            {{ isEditMode ? 'Edit Player' : 'Add New Player' }}
          </mat-card-title>
          <mat-card-subtitle>{{ isEditMode ? 'Update player information' : 'Register a new player for tournaments' }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="playerForm" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter first name and last name">
                <mat-error *ngIf="playerForm.get('name')?.hasError('required')">
                  Name is required
                </mat-error>
                <mat-error *ngIf="playerForm.get('name')?.hasError('fullNameRequired')">
                  Please enter both first name and last name
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Email (Optional)</mat-label>
                <input matInput type="email" formControlName="email" placeholder="player@email.com">
                <mat-error *ngIf="playerForm.get('email')?.hasError('email')">
                  Please enter a valid email
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Phone Number (Optional)</mat-label>
                <input matInput type="tel" formControlName="phone" placeholder="+1-234-567-8900">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Skill Level</mat-label>
                <mat-select formControlName="skillLevel">
                  <mat-option value="beginner">Beginner</mat-option>
                  <mat-option value="intermediate">Intermediate</mat-option>
                  <mat-option value="advanced">Advanced</mat-option>
                  <mat-option value="professional">Professional</mat-option>
                </mat-select>
                <mat-error *ngIf="playerForm.get('skillLevel')?.hasError('required')">
                  Skill level is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Date of Birth (Optional)</mat-label>
                <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth">
                <mat-datepicker-toggle matSuffix [for]="dobPicker"></mat-datepicker-toggle>
                <mat-datepicker #dobPicker></mat-datepicker>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Current Ranking (Optional)</mat-label>
                <input matInput type="number" formControlName="ranking" min="1" placeholder="Enter current ranking">
              </mat-form-field>
            </div>

          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button type="button" (click)="onCancel()">
            <mat-icon>cancel</mat-icon>
            Cancel
          </button>
          <button mat-raised-button color="primary" [disabled]="playerForm.invalid" (click)="onSubmit()">
            <mat-icon>save</mat-icon>
            {{ isEditMode ? 'Update Player' : 'Add Player' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .player-form-container {
      max-width: 800px;
      margin: 24px auto;
      padding: 24px;
    }

    .form-card {
      padding: 24px;
    }

    mat-card-header {
      margin-bottom: 24px;
      
      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.8rem;
      }
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 0;
      }
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      flex: 1;
      
      @media (max-width: 768px) {
        width: 100%;
      }
    }

    h3 {
      color: var(--text-primary);
      font-size: 1.2rem;
      font-weight: 600;
      margin: 24px 0 16px 0;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      padding: 24px;
      
      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  `]
})
export class PlayerFormComponent implements OnInit {
  playerForm!: FormGroup;
  isEditMode = false;
  playerId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private playerService: PlayerService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.playerId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.playerId;
    this.initializeForm();
    
    if (this.isEditMode && this.playerId) {
      this.loadPlayer(this.playerId);
    }
  }

  initializeForm(): void {
    this.playerForm = this.fb.group({
      name: ['', [Validators.required, this.fullNameValidator]],
      email: ['', [Validators.email]], // Optional but validated if provided
      phone: [''], // Optional
      skillLevel: ['', [Validators.required]],
      dateOfBirth: [''], // Optional
      ranking: [''] // Optional
    });
  }

  // Custom validator to ensure both first and last name are provided
  fullNameValidator(control: any) {
    const value = control.value || '';
    const nameParts = value.trim().split(' ').filter((part: string) => part.length > 0);
    
    if (nameParts.length < 2) {
      return { fullNameRequired: true };
    }
    
    return null;
  }

  loadPlayer(id: string): void {
    this.playerService.getPlayerById(id).subscribe({
      next: (player) => {
        this.playerForm.patchValue({
          name: player.name,
          email: player.email || '',
          phone: player.phone || '',
          skillLevel: player.skillLevel,
          dateOfBirth: player.dateOfBirth || '',
          ranking: player.ranking || ''
        });
      },
      error: (error) => {
        console.error('Error loading player:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.playerForm.valid) {

      const playerData: Partial<Player> = {
        name: this.playerForm.value.name,
        email: this.playerForm.value.email,
        phone: this.playerForm.value.phone,
        skillLevel: this.playerForm.value.skillLevel,
        dateOfBirth: this.playerForm.value.dateOfBirth,
        ranking: this.playerForm.value.ranking
      };

      const operation = this.isEditMode && this.playerId
        ? this.playerService.updatePlayer(this.playerId, playerData)
        : this.playerService.createPlayer(playerData);

      operation.subscribe({
        next: (player) => {
          const message = this.isEditMode ? 'Player updated successfully' : 'Player created successfully';
          console.log(message, player);
          this.router.navigate(['/players']);
        },
        error: (error) => {
          const message = this.isEditMode ? 'Error updating player' : 'Error creating player';
          console.error(message, error);
          
          // Show more detailed error message
          if (error.error && error.error.message) {
            alert(`Error: ${error.error.message}`);
          } else if (error.error && error.error.errors) {
            alert(`Validation Error: ${error.error.errors.join(', ')}`);
          } else {
            alert(`${message}. Please check the console for details.`);
          }
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/players']);
  }
}