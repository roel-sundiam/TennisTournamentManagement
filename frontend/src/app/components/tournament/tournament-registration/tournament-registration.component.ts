import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlayerService } from '../../../services/player.service';
import { TournamentService } from '../../../services/tournament.service';
import { HttpClient } from '@angular/common/http';
import { Player } from '../../../models/player.model';
import { Tournament } from '../../../models/tournament.model';
import { environment } from '../../../../environments/environment';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-tournament-registration',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './tournament-registration.component.html',
  styleUrls: ['./tournament-registration.component.scss']
})
export class TournamentRegistrationComponent implements OnInit {
  registrationForm!: FormGroup;
  players: Player[] = [];
  tournament: Tournament | null = null;
  tournamentId: string | null = null;
  selectedPlayersCount = 0;
  isFormReady = false;
  playerSelections: { [key: string]: boolean } = {};
  existingPlayerIds: Set<string> = new Set();
  existingRegistrations: Map<string, any> = new Map(); // playerId -> registration object
  

  constructor(
    private fb: FormBuilder,
    private playerService: PlayerService,
    private tournamentService: TournamentService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize empty form
    this.registrationForm = this.fb.group({});
    this.isFormReady = false;
  }

  ngOnInit(): void {
    this.tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (this.tournamentId) {
      this.loadTournamentAndPlayers();
    } else {
      this.router.navigate(['/tournaments']);
    }
  }

  loadTournamentAndPlayers(): void {
    if (!this.tournamentId) return;

    console.log('🔄 Starting to load tournament, players, and registrations...');
    
    forkJoin({
      tournament: this.tournamentService.getTournamentById(this.tournamentId),
      players: this.playerService.getAllPlayers(),
      existingRegistrations: this.http.get<{success: boolean, data: any[]}>(`${environment.apiUrl}/api/player-registrations/tournament/${this.tournamentId}`)
    }).subscribe({
      next: ({ tournament, players, existingRegistrations }) => {
        console.log('✅ Data loaded successfully');
        console.log('Tournament:', tournament);
        console.log('Players raw data:', players);
        console.log('Existing registrations:', existingRegistrations);
        
        // Set data
        this.tournament = tournament;
        this.players = Array.isArray(players) ? players : [];
        
        // Store existing registrations for checking which players are already registered
        this.existingPlayerIds = new Set();
        this.existingRegistrations = new Map();
        
        existingRegistrations.data?.forEach((reg: any) => {
          const playerId = reg.player._id || reg.player.id;
          if (playerId) {
            this.existingPlayerIds.add(playerId);
            this.existingRegistrations.set(playerId, reg);
          }
        });
        
        console.log('📋 Final players array:', this.players);
        console.log('📋 Final players count:', this.players.length);
        console.log('📋 Already registered player IDs:', Array.from(this.existingPlayerIds));
        
        // Initialize form only once after data is set
        this.buildForm();
      },
      error: (error) => {
        console.error('❌ Error loading data:', error);
        this.snackBar.open('Error loading tournament data', 'Close', { duration: 3000 });
      }
    });
  }

  buildForm(): void {
    console.log('🏗️ Building form with individual controls...');
    console.log('🏗️ Players to build form for:', this.players.length);
    
    if (!this.players || this.players.length === 0) {
      console.log('❌ No players to build form with');
      return;
    }
    
    // Reset form ready state
    this.isFormReady = false;
    
    // Create individual FormControls for each player
    const formControls: { [key: string]: any } = {};
    
    this.players.forEach((player, index) => {
      const controlName = `player_${index}`;
      const playerId = player._id;
      const isAlreadyRegistered = playerId ? this.existingPlayerIds.has(playerId) : false;
      
      console.log(`🔧 Creating control ${controlName} for: ${player.name} (Already registered: ${isAlreadyRegistered})`);
      
      formControls[controlName] = this.fb.control(isAlreadyRegistered);
      this.playerSelections[playerId || index.toString()] = isAlreadyRegistered;
    });
    
    // Create new form with individual controls
    this.registrationForm = this.fb.group(formControls);
    
    console.log('✅ Form built with individual controls:', Object.keys(formControls).length);
    console.log('✅ Form controls:', Object.keys(this.registrationForm.controls));
    
    // Update selected count to include already registered players
    this.updateSelectedCount();
    
    // Mark as ready
    this.isFormReady = true;
    
    // Trigger change detection with OnPush strategy
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    console.log('✅ Form is ready');
  }

  private isPlayerCurrentlySelected(index: number): boolean {
    // Check if this player is already registered for the tournament
    const player = this.players[index];
    const playerId = player?._id;
    return playerId ? this.existingPlayerIds.has(playerId) : false;
  }

  private updateSelectedCount(): void {
    // Count selected players (including already registered ones)
    this.selectedPlayersCount = 0;
    for (let i = 0; i < this.players.length; i++) {
      const controlName = `player_${i}`;
      const control = this.registrationForm.get(controlName);
      if (control && control.value) {
        this.selectedPlayersCount++;
      }
    }
    console.log('✅ Updated selected players count:', this.selectedPlayersCount);
  }

  isPlayerSelected(index: number): boolean {
    const controlName = `player_${index}`;
    const control = this.registrationForm.get(controlName);
    return control ? control.value : false;
  }

  onPlayerSelectionChange(): void {
    console.log('🔄 Player selection changed');
    
    if (!this.registrationForm) {
      console.log('❌ No form available');
      this.selectedPlayersCount = 0;
      return;
    }
    
    // Count selected players
    this.selectedPlayersCount = 0;
    for (let i = 0; i < this.players.length; i++) {
      const controlName = `player_${i}`;
      const control = this.registrationForm.get(controlName);
      if (control && control.value) {
        this.selectedPlayersCount++;
      }
    }
    
    console.log('✅ Selected players count:', this.selectedPlayersCount);
    
    // Update disabled state based on tournament capacity
    this.updateControlsDisabledState();
  }

  private updateControlsDisabledState(): void {
    if (!this.tournament || !this.registrationForm) return;
    
    const isAtCapacity = this.selectedPlayersCount >= this.tournament.maxPlayers;
    
    for (let i = 0; i < this.players.length; i++) {
      const controlName = `player_${i}`;
      const control = this.registrationForm.get(controlName);
      if (control) {
        if (control.value) {
          // Always enable selected controls so they can be unselected
          control.enable();
        } else if (isAtCapacity) {
          // Disable unselected controls when at capacity
          control.disable();
        } else {
          // Enable unselected controls when under capacity
          control.enable();
        }
      }
    }
  }

  getSkillLevelColor(skillLevel: string): string {
    switch (skillLevel) {
      case 'professional': return 'warn';
      case 'advanced': return 'accent';
      case 'intermediate': return 'primary';
      default: return '';
    }
  }

  onRegisterPlayers(): void {
    const selectedPlayerIds = this.players
      .filter((_, index) => this.isPlayerSelected(index))
      .map(player => player._id)
      .filter((id): id is string => id !== undefined); // Remove any undefined IDs

    // Determine which players to register and which to unregister
    const playersToRegister = selectedPlayerIds.filter(id => !this.existingPlayerIds.has(id));
    const playersToUnregister: string[] = [];
    
    // Check for players that were previously registered but are now unselected
    this.existingPlayerIds.forEach(registeredPlayerId => {
      if (!selectedPlayerIds.includes(registeredPlayerId)) {
        playersToUnregister.push(registeredPlayerId);
      }
    });

    console.log('🎾 Registration Summary:');
    console.log('Players to REGISTER:', playersToRegister);
    console.log('Players to UNREGISTER:', playersToUnregister);

    if (playersToRegister.length === 0 && playersToUnregister.length === 0) {
      this.snackBar.open('No changes to make', 'Close', { duration: 3000 });
      return;
    }

    // Process registrations and unregistrations
    this.processRegistrationChanges(playersToRegister, playersToUnregister);
  }

  private processRegistrationChanges(playersToRegister: string[], playersToUnregister: string[]): void {
    const operations: Promise<any>[] = [];

    // Add registration operations
    if (playersToRegister.length > 0) {
      const registrationData = { playerIds: playersToRegister };
      console.log('🔗 Registering players:', registrationData);
      console.log('🔗 Registration URL:', `${environment.apiUrl}/api/player-registrations/tournament/${this.tournamentId}/register`);
      operations.push(
        this.http.post(`${environment.apiUrl}/api/player-registrations/tournament/${this.tournamentId}/register`, registrationData).toPromise()
      );
    }

    // Add unregistration operations
    playersToUnregister.forEach(playerId => {
      const registration = this.existingRegistrations.get(playerId);
      console.log('🗑️ Unregistering player:', playerId, 'Registration:', registration);
      if (registration?._id) {
        console.log('🔗 Unregistration URL:', `${environment.apiUrl}/api/player-registrations/${registration._id}`);
        operations.push(
          this.http.delete(`${environment.apiUrl}/api/player-registrations/${registration._id}`).toPromise()
        );
      } else {
        console.warn('⚠️ No registration found for player:', playerId);
      }
    });

    // Execute all operations
    Promise.all(operations)
      .then((results) => {
        console.log('✅ All registration changes successful:', results);
        
        const registeredCount = playersToRegister.length;
        const unregisteredCount = playersToUnregister.length;
        
        let message = '';
        if (registeredCount > 0 && unregisteredCount > 0) {
          message = `Registered ${registeredCount} and unregistered ${unregisteredCount} player(s)`;
        } else if (registeredCount > 0) {
          message = `Successfully registered ${registeredCount} player(s)`;
        } else if (unregisteredCount > 0) {
          message = `Successfully unregistered ${unregisteredCount} player(s)`;
        }
        
        this.snackBar.open(message, 'Close', { duration: 5000 });
        
        // Navigate back to tournament list
        setTimeout(() => {
          this.router.navigate(['/tournaments']);
        }, 2000);
      })
      .catch((error) => {
        console.error('❌ Registration changes failed:', error);
        console.error('❌ Error details:', error.error);
        console.error('❌ Full error:', JSON.stringify(error, null, 2));
        this.snackBar.open('Registration failed: ' + (error.error?.message || error.message || 'Unknown error'), 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      });
  }

  getFormControlsCount(): number {
    return this.registrationForm ? Object.keys(this.registrationForm.controls).length : 0;
  }

  onCancel(): void {
    this.router.navigate(['/tournaments']);
  }

  trackByPlayerId(index: number, player: Player): string {
    return player._id || index.toString();
  }


  rebuildForm(): void {
    console.log('🔄 Manual form rebuild triggered');
    this.buildForm();
  }

}