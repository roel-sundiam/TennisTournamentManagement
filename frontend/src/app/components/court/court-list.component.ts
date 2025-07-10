import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { CourtService, Court } from '../../services/court.service';
import { CourtFormDialog } from './court-form-dialog.component';

@Component({
  selector: 'app-court-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <div class="court-management-container">
      <!-- Header Section -->
      <mat-toolbar class="header-toolbar">
        <div class="header-content">
          <div class="title-section">
            <mat-icon class="header-icon">sports_tennis</mat-icon>
            <h1>Court Management</h1>
          </div>
          <div class="action-section">
            <button mat-raised-button color="primary" (click)="openCreateDialog()">
              <mat-icon>add</mat-icon>
              Add Court
            </button>
          </div>
        </div>
      </mat-toolbar>

      <!-- Filter Section -->
      <div class="filter-section">
        <mat-form-field appearance="outline">
          <mat-label>Filter by Status</mat-label>
          <mat-select [(value)]="selectedFilter" (selectionChange)="applyFilter()">
            <mat-option value="all">All Courts</mat-option>
            <mat-option value="available">Available</mat-option>
            <mat-option value="maintenance">Maintenance</mat-option>
            <mat-option value="reserved">Reserved</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Filter by Type</mat-label>
          <mat-select [(value)]="typeFilter" (selectionChange)="applyFilter()">
            <mat-option value="all">All Types</mat-option>
            <mat-option value="indoor">Indoor</mat-option>
            <mat-option value="outdoor">Outdoor</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Courts Grid -->
      <div class="courts-grid" *ngIf="filteredCourts.length > 0; else noCourts">
        <mat-card *ngFor="let court of filteredCourts" class="court-card">
          <mat-card-header>
            <div mat-card-avatar class="court-avatar" [ngClass]="getCourtAvatarClass(court)">
              <mat-icon>{{ getCourtIcon(court.type) }}</mat-icon>
            </div>
            <mat-card-title>{{ court.name }}</mat-card-title>
            <mat-card-subtitle>{{ court.type | titlecase }} Court</mat-card-subtitle>
            <div class="card-actions">
              <button mat-icon-button [matMenuTriggerFor]="courtMenu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #courtMenu="matMenu">
                <button mat-menu-item (click)="editCourt(court)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="toggleCourtStatus(court)">
                  <mat-icon>{{ court.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                  <span>{{ court.isActive ? 'Deactivate' : 'Activate' }}</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteCourt(court)" class="delete-action">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </div>
          </mat-card-header>

          <mat-card-content>
            <div class="court-info">
              <div class="info-row">
                <mat-icon class="info-icon">location_on</mat-icon>
                <span>{{ court.location || 'No location specified' }}</span>
              </div>
              <div class="info-row">
                <mat-icon class="info-icon">people</mat-icon>
                <span>Capacity: {{ court.capacity || 4 }} players</span>
              </div>
              <div class="info-row" *ngIf="court.notes">
                <mat-icon class="info-icon">note</mat-icon>
                <span>{{ court.notes }}</span>
              </div>
            </div>

            <div class="court-status-section">
              <mat-chip-set>
                <mat-chip [ngClass]="getStatusChipClass(court.status)">
                  <mat-icon matChipAvatar>{{ getStatusIcon(court.status) }}</mat-icon>
                  {{ court.status | titlecase }}
                </mat-chip>
                <mat-chip [ngClass]="court.isActive ? 'active-chip' : 'inactive-chip'">
                  <mat-icon matChipAvatar>{{ court.isActive ? 'check_circle' : 'pause_circle' }}</mat-icon>
                  {{ court.isActive ? 'Active' : 'Inactive' }}
                </mat-chip>
              </mat-chip-set>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button color="primary" (click)="viewSchedule(court)">
              <mat-icon>schedule</mat-icon>
              View Schedule
            </button>
            <button mat-button (click)="updateStatus(court)">
              <mat-icon>edit</mat-icon>
              Update Status
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- No Courts Message -->
      <ng-template #noCourts>
        <div class="no-courts">
          <mat-icon class="no-courts-icon">sports_tennis</mat-icon>
          <h2>No Courts Found</h2>
          <p>{{ getNoCourtMessage() }}</p>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Add Your First Court
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .court-management-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-toolbar {
      background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
      color: white;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .filter-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .courts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .court-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .court-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    }

    .court-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }

    .court-avatar.indoor {
      background: linear-gradient(135deg, #2196f3, #64b5f6);
      color: white;
    }

    .court-avatar.outdoor {
      background: linear-gradient(135deg, #4caf50, #81c784);
      color: white;
    }

    .card-actions {
      margin-left: auto;
    }

    .court-info {
      margin: 16px 0;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: #666;
    }

    .info-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .court-status-section {
      margin-top: 16px;
    }

    .available-chip {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .maintenance-chip {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .reserved-chip {
      background-color: #fce4ec;
      color: #c2185b;
    }

    .active-chip {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .inactive-chip {
      background-color: #f5f5f5;
      color: #757575;
    }

    .no-courts {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .no-courts-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .delete-action {
      color: #f44336;
    }

    @media (max-width: 768px) {
      .court-management-container {
        padding: 16px;
      }
      
      .courts-grid {
        grid-template-columns: 1fr;
      }
      
      .filter-section {
        flex-direction: column;
      }
    }
  `]
})
export class CourtListComponent implements OnInit {
  courts: Court[] = [];
  filteredCourts: Court[] = [];
  selectedFilter = 'all';
  typeFilter = 'all';

  constructor(
    private courtService: CourtService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCourts();
  }

  loadCourts(): void {
    this.courtService.getAllCourts().subscribe({
      next: (courts) => {
        this.courts = courts;
        this.applyFilter();
      },
      error: (error) => {
        console.error('Error loading courts:', error);
        this.snackBar.open('Failed to load courts', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  applyFilter(): void {
    let filtered = this.courts;

    // Filter by status
    if (this.selectedFilter !== 'all') {
      filtered = filtered.filter(court => court.status === this.selectedFilter);
    }

    // Filter by type
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(court => court.type === this.typeFilter);
    }

    this.filteredCourts = filtered;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CourtFormDialog, {
      width: '500px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCourts();
      }
    });
  }

  editCourt(court: Court): void {
    const dialogRef = this.dialog.open(CourtFormDialog, {
      width: '500px',
      data: { mode: 'edit', court }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCourts();
      }
    });
  }

  viewSchedule(court: Court): void {
    // Navigate to schedule view for this court
    console.log('View schedule for court:', court.name);
    this.snackBar.open(`Opening schedule for ${court.name}`, 'Close', {
      duration: 2000
    });
  }

  updateStatus(court: Court): void {
    const newStatus = this.getNextStatus(court.status);
    this.courtService.updateCourtStatus(court._id!, newStatus).subscribe({
      next: () => {
        this.snackBar.open(`Court status updated to ${newStatus}`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadCourts();
      },
      error: (error) => {
        console.error('Error updating court status:', error);
        this.snackBar.open('Failed to update court status', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  toggleCourtStatus(court: Court): void {
    this.courtService.toggleCourtActive(court._id!).subscribe({
      next: () => {
        const action = court.isActive ? 'deactivated' : 'activated';
        this.snackBar.open(`Court ${action} successfully`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadCourts();
      },
      error: (error) => {
        console.error('Error toggling court status:', error);
        this.snackBar.open('Failed to update court', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  deleteCourt(court: Court): void {
    if (confirm(`Are you sure you want to delete ${court.name}?`)) {
      this.courtService.deleteCourt(court._id!).subscribe({
        next: () => {
          this.snackBar.open('Court deleted successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadCourts();
        },
        error: (error) => {
          console.error('Error deleting court:', error);
          this.snackBar.open('Failed to delete court', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  getCourtAvatarClass(court: Court): string {
    return court.type;
  }

  getCourtIcon(type: string): string {
    return type === 'indoor' ? 'home' : 'wb_sunny';
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'available': return 'check_circle';
      case 'maintenance': return 'build';
      case 'reserved': return 'lock';
      default: return 'help';
    }
  }

  getStatusChipClass(status: string): string {
    return `${status}-chip`;
  }

  getNextStatus(currentStatus: string): 'available' | 'maintenance' | 'reserved' {
    switch (currentStatus) {
      case 'available': return 'maintenance';
      case 'maintenance': return 'reserved';
      case 'reserved': return 'available';
      default: return 'available';
    }
  }

  getNoCourtMessage(): string {
    if (this.selectedFilter !== 'all' || this.typeFilter !== 'all') {
      return 'No courts match the selected filters.';
    }
    return 'Get started by adding your first tennis court.';
  }
}