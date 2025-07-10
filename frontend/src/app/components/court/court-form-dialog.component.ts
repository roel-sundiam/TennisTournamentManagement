import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CourtService, Court } from '../../services/court.service';

@Component({
  selector: 'app-court-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  template: `
    <div class="court-form-dialog">
      <h2 mat-dialog-title>
        <mat-icon>{{ data.mode === 'create' ? 'add' : 'edit' }}</mat-icon>
        {{ data.mode === 'create' ? 'Add New Court' : 'Edit Court' }}
      </h2>

      <form [formGroup]="courtForm" (ngSubmit)="onSubmit()">
        <mat-dialog-content>
          <div class="form-grid">
            <!-- Court Name -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Court Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g., Center Court">
              <mat-icon matSuffix>sports_tennis</mat-icon>
              <mat-error *ngIf="courtForm.get('name')?.hasError('required')">
                Court name is required
              </mat-error>
              <mat-error *ngIf="courtForm.get('name')?.hasError('maxlength')">
                Court name cannot exceed 50 characters
              </mat-error>
            </mat-form-field>

            <!-- Court Type -->
            <mat-form-field appearance="outline">
              <mat-label>Court Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="indoor">
                  <mat-icon>home</mat-icon>
                  Indoor
                </mat-option>
                <mat-option value="outdoor">
                  <mat-icon>wb_sunny</mat-icon>
                  Outdoor
                </mat-option>
              </mat-select>
              <mat-error *ngIf="courtForm.get('type')?.hasError('required')">
                Court type is required
              </mat-error>
            </mat-form-field>

            <!-- Court Status -->
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="available">
                  <mat-icon>check_circle</mat-icon>
                  Available
                </mat-option>
                <mat-option value="maintenance">
                  <mat-icon>build</mat-icon>
                  Maintenance
                </mat-option>
                <mat-option value="reserved">
                  <mat-icon>lock</mat-icon>
                  Reserved
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Location -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Location (Optional)</mat-label>
              <input matInput formControlName="location" placeholder="e.g., North Wing, Building A">
              <mat-icon matSuffix>location_on</mat-icon>
              <mat-error *ngIf="courtForm.get('location')?.hasError('maxlength')">
                Location cannot exceed 100 characters
              </mat-error>
            </mat-form-field>

            <!-- Capacity -->
            <mat-form-field appearance="outline">
              <mat-label>Capacity</mat-label>
              <input matInput type="number" formControlName="capacity" placeholder="4">
              <mat-icon matSuffix>people</mat-icon>
              <mat-error *ngIf="courtForm.get('capacity')?.hasError('min')">
                Capacity must be at least 1
              </mat-error>
              <mat-error *ngIf="courtForm.get('capacity')?.hasError('max')">
                Capacity cannot exceed 100
              </mat-error>
            </mat-form-field>

            <!-- Active Status -->
            <div class="checkbox-field full-width">
              <mat-checkbox formControlName="isActive">
                <span class="checkbox-label">
                  <mat-icon>{{ courtForm.get('isActive')?.value ? 'check_circle' : 'pause_circle' }}</mat-icon>
                  Court is active and available for scheduling
                </span>
              </mat-checkbox>
            </div>

            <!-- Notes -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes (Optional)</mat-label>
              <textarea matInput formControlName="notes" 
                       placeholder="Additional information about the court..."
                       rows="3"></textarea>
              <mat-icon matSuffix>note</mat-icon>
              <mat-error *ngIf="courtForm.get('notes')?.hasError('maxlength')">
                Notes cannot exceed 500 characters
              </mat-error>
            </mat-form-field>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" (click)="onCancel()">
            <mat-icon>close</mat-icon>
            Cancel
          </button>
          <button mat-raised-button color="primary" type="submit" 
                  [disabled]="courtForm.invalid || isSubmitting">
            <mat-icon>{{ isSubmitting ? 'hourglass_empty' : 'save' }}</mat-icon>
            {{ isSubmitting ? 'Saving...' : (data.mode === 'create' ? 'Create Court' : 'Update Court') }}
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .court-form-dialog {
      min-width: 500px;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      color: #333;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      margin-top: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    mat-dialog-content {
      min-height: 300px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      gap: 12px;
    }

    mat-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 600px) {
      .court-form-dialog {
        min-width: unset;
        width: 95vw;
      }
      
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CourtFormDialog implements OnInit {
  courtForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private courtService: CourtService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CourtFormDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit', court?: Court }
  ) {
    this.courtForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.court) {
      this.populateForm(this.data.court);
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      type: ['indoor', Validators.required],
      status: ['available'],
      location: ['', Validators.maxLength(100)],
      capacity: [4, [Validators.min(1), Validators.max(100)]],
      isActive: [true],
      notes: ['', Validators.maxLength(500)]
    });
  }

  populateForm(court: Court): void {
    this.courtForm.patchValue({
      name: court.name,
      type: court.type,
      status: court.status,
      location: court.location || '',
      capacity: court.capacity || 4,
      isActive: court.isActive,
      notes: court.notes || ''
    });
  }

  onSubmit(): void {
    if (this.courtForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const courtData = this.courtForm.value;

      const operation = this.data.mode === 'create' 
        ? this.courtService.createCourt(courtData)
        : this.courtService.updateCourt(this.data.court!._id!, courtData);

      operation.subscribe({
        next: (court) => {
          const action = this.data.mode === 'create' ? 'created' : 'updated';
          this.snackBar.open(`Court ${action} successfully`, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close(court);
        },
        error: (error) => {
          console.error('Error saving court:', error);
          this.snackBar.open('Failed to save court', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}