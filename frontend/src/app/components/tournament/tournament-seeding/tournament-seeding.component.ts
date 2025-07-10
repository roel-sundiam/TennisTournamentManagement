import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlayerService } from '../../../services/player.service';
import { TournamentService } from '../../../services/tournament.service';
import { Player } from '../../../models/player.model';
import { Tournament } from '../../../models/tournament.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tournament-seeding',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DragDropModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './tournament-seeding.component.html',
  styleUrls: ['./tournament-seeding.component.scss']
})
export class TournamentSeedingComponent implements OnInit {
  tournament: Tournament | null = null;
  players: Player[] = [];
  originalSeeding: Player[] = [];
  hasChanges = false;
  isLoading = false;
  
  recentChanges: Array<{
    playerName: string;
    oldPosition: number;
    newPosition: number;
  }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playerService: PlayerService,
    private tournamentService: TournamentService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.loadTournamentData(tournamentId);
    } else {
      // Load all players for general seeding
      this.loadAllPlayers();
    }
  }

  loadTournamentData(tournamentId: string): void {
    this.isLoading = true;
    
    // Load tournament details
    this.tournamentService.getTournamentById(tournamentId).subscribe({
      next: (tournament) => {
        this.tournament = tournament;
        this.loadTournamentPlayers(tournamentId);
      },
      error: (error) => {
        this.snackBar.open('Failed to load tournament', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  loadTournamentPlayers(tournamentId: string): void {
    this.playerService.getPlayersByTournament(tournamentId).subscribe({
      next: (players) => {
        this.players = [...players].sort((a, b) => (a.seedPosition || 0) - (b.seedPosition || 0));
        this.originalSeeding = [...this.players];
        this.isLoading = false;
      },
      error: (error) => {
        this.snackBar.open('Failed to load players', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  loadAllPlayers(): void {
    this.isLoading = true;
    this.playerService.getAllPlayers().subscribe({
      next: (players) => {
        this.players = [...players].sort((a, b) => (a.ranking || 0) - (b.ranking || 0));
        this.originalSeeding = [...this.players];
        this.isLoading = false;
      },
      error: (error) => {
        this.snackBar.open('Failed to load players', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  drop(event: CdkDragDrop<Player[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      const playerName = this.players[event.previousIndex].name;
      const oldPosition = event.previousIndex + 1;
      const newPosition = event.currentIndex + 1;
      
      // Record the change
      this.recentChanges.unshift({
        playerName,
        oldPosition,
        newPosition
      });
      
      // Keep only last 5 changes
      if (this.recentChanges.length > 5) {
        this.recentChanges = this.recentChanges.slice(0, 5);
      }
      
      // Move the item
      moveItemInArray(this.players, event.previousIndex, event.currentIndex);
      
      // Update seed positions
      this.players.forEach((player, index) => {
        player.seedPosition = index + 1;
      });
      
      this.checkForChanges();
      
      // Show feedback
      this.snackBar.open(`${playerName} moved to seed #${newPosition}`, 'Close', {
        duration: 2000
      });
    }
  }

  checkForChanges(): void {
    this.hasChanges = this.players.some((player, index) => {
      const originalPlayer = this.originalSeeding[index];
      return !originalPlayer || player._id !== originalPlayer._id;
    });
  }

  getChangesCount(): number {
    return this.players.filter((player, index) => {
      const originalPlayer = this.originalSeeding[index];
      return !originalPlayer || player._id !== originalPlayer._id;
    }).length;
  }


  saveSeeding(): void {
    if (!this.tournament?._id) {
      this.snackBar.open('Tournament not found', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    
    // Prepare seeding updates
    const seedingUpdates = this.players.map((player, index) => ({
      playerId: player._id,
      seed: index + 1
    }));
    
    console.log('Saving seeding order:', seedingUpdates);
    
    // Call the API to save seeding
    this.http.put(`${environment.apiUrl}/api/player-registrations/tournament/${this.tournament._id}/seeding`, {
      seedingUpdates
    }).subscribe({
      next: (response: any) => {
        console.log('✅ Seeding saved successfully:', response);
        this.originalSeeding = [...this.players];
        this.hasChanges = false;
        this.recentChanges = [];
        this.isLoading = false;
        
        this.snackBar.open('Seeding saved successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('❌ Error saving seeding:', error);
        this.isLoading = false;
        
        this.snackBar.open(
          error.error?.message || 'Failed to save seeding. Please try again.', 
          'Close', 
          { duration: 5000 }
        );
      }
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
}