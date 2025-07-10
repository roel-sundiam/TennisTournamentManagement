import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>sports_tennis</mat-icon>
            Sign In
          </mat-card-title>
          <mat-card-subtitle>Welcome back to Tennis Tournament Manager</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="Enter your email">
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
                Email is required
              </mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
                Please enter a valid email
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" placeholder="Enter your password">
              <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                <mat-icon>{{hidePassword ? 'visibility' : 'visibility_off'}}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                Password is required
              </mat-error>
            </mat-form-field>

            <div class="demo-credentials" *ngIf="showDemoCredentials">
              <mat-card class="demo-card">
                <mat-card-content>
                  <h4>Demo Credentials:</h4>
                  <p><strong>Email:</strong> admin@test.com</p>
                  <p><strong>Password:</strong> password</p>
                  <button mat-button color="primary" type="button" (click)="fillDemoCredentials()">
                    Use Demo Credentials
                  </button>
                </mat-card-content>
              </mat-card>
            </div>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button type="button" routerLink="/register">
            Create Account
          </button>
          <button mat-raised-button color="primary" [disabled]="loginForm.invalid || isLoading" (click)="onSubmit()">
            <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
            <mat-icon *ngIf="!isLoading">login</mat-icon>
            {{ isLoading ? 'Signing In...' : 'Sign In' }}
          </button>
        </mat-card-actions>

        <div class="additional-actions">
          <button mat-button color="primary" (click)="showDemoCredentials = !showDemoCredentials">
            <mat-icon>info</mat-icon>
            {{ showDemoCredentials ? 'Hide' : 'Show' }} Demo Credentials
          </button>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 24px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    .login-card {
      max-width: 400px;
      width: 100%;
      padding: 24px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    mat-card-header {
      text-align: center;
      margin-bottom: 24px;
      
      mat-card-title {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 1.8rem;
        margin-bottom: 8px;
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .demo-credentials {
      margin: 16px 0;
    }

    .demo-card {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      
      mat-card-content {
        padding: 16px;
        
        h4 {
          margin: 0 0 8px 0;
          color: #495057;
        }
        
        p {
          margin: 4px 0;
          font-family: monospace;
          font-size: 0.9rem;
        }
      }
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      padding: 24px 0 0 0;
      
      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .additional-actions {
      text-align: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    mat-spinner {
      margin-right: 8px;
    }

    @media (max-width: 480px) {
      .login-container {
        padding: 12px;
      }
      
      .login-card {
        padding: 16px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  showDemoCredentials = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/tournaments']);
    }
  }

  initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  fillDemoCredentials(): void {
    this.loginForm.patchValue({
      email: 'admin@test.com',
      password: 'password'
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.snackBar.open(response.message, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/tournaments']);
        },
        error: (error) => {
          this.isLoading = false;
          this.snackBar.open(error.message || 'Login failed', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }
}