import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PlayerService } from '../../../services/player.service';
import { TournamentService } from '../../../services/tournament.service';
import { TeamService } from '../../../services/team.service';
import { Player } from '../../../models/player.model';
import { Tournament } from '../../../models/tournament.model';
import { environment } from '../../../../environments/environment';
import { Component as NgComponent, Inject } from '@angular/core';

interface Team {
  id: string;
  name: string;
  players: Player[];
  averageSkillLevel: number;
  totalRanking: number;
}

interface TeamGenerationOptions {
  pairingMethod: 'random' | 'seeded' | 'manual';
  teamSize: 1 | 2;
  allowSameSkillLevel: boolean;
  balanceTeams: boolean;
}

@Component({
  selector: 'app-team-generator',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './team-generator.component.html',
  styleUrls: ['./team-generator.component.scss']
})
export class TeamGeneratorComponent implements OnInit {
  tournament: Tournament | null = null;
  availablePlayers: Player[] = [];
  teams: Team[] = [];
  selectedPlayers: Player[] = [];
  isGenerating = false;
  
  options: TeamGenerationOptions = {
    pairingMethod: 'random',
    teamSize: 1,
    allowSameSkillLevel: true,
    balanceTeams: true
  };

  skillLevelValues = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3,
    'professional': 4
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private playerService: PlayerService,
    private tournamentService: TournamentService,
    private teamService: TeamService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const tournamentId = this.route.snapshot.paramMap.get('tournamentId');
    if (tournamentId) {
      this.loadTournamentData(tournamentId);
    } else {
      this.loadAllPlayers();
    }
  }

  loadTournamentData(tournamentId: string): void {
    this.tournamentService.getTournamentById(tournamentId).subscribe({
      next: (tournament) => {
        this.tournament = tournament;
        this.options.teamSize = tournament.gameType === 'doubles' ? 2 : 1;
        
        // Load the saved pairing method if it exists
        if (tournament.pairingMethod) {
          this.options.pairingMethod = tournament.pairingMethod as 'random' | 'seeded' | 'manual';
          console.log('🔄 Loaded pairing method from tournament:', tournament.pairingMethod);
        }
        
        this.loadTournamentPlayers(tournamentId);
      },
      error: (error) => {
        this.snackBar.open('Failed to load tournament', 'Close', { duration: 3000 });
      }
    });
  }

  loadExistingTeams(tournamentId: string): void {
    this.teamService.getTeamsByTournament(tournamentId).subscribe({
      next: (teams) => {
        if (teams.length > 0) {
          console.log('✅ Found existing teams:', teams);
          // Convert database teams to local team format
          this.teams = teams.map((team, index) => ({
            id: team._id,
            name: team.name,
            players: team.players.map((p: any) => {
              // Find the seed position from availablePlayers if available
              const availablePlayer = this.availablePlayers.find(ap => ap._id === p._id);
              return {
                _id: p._id,
                name: `${p.firstName} ${p.lastName}`,
                skillLevel: p.skillLevel,
                ranking: p.ranking,
                seedPosition: availablePlayer?.seedPosition || 0,
                isRegistered: true
              };
            }),
            averageSkillLevel: this.calculateAverageSkillLevelFromTeam(team.players),
            totalRanking: team.players.reduce((sum: number, p: any) => sum + (p.ranking || 0), 0)
          }));
          this.snackBar.open(`${teams.length} existing teams loaded`, 'Close', { duration: 2000 });
        }
      },
      error: (error) => {
        console.log('No existing teams found or error loading teams:', error);
      }
    });
  }

  private calculateAverageSkillLevelFromTeam(players: any[]): number {
    const total = players.reduce((sum, p) => sum + this.skillLevelValues[p.skillLevel as keyof typeof this.skillLevelValues], 0);
    return Math.round((total / players.length) * 10) / 10;
  }

  loadTournamentPlayers(tournamentId: string): void {
    this.http.get<any>(`${environment.apiUrl}/api/player-registrations/tournament/${tournamentId}`).subscribe({
      next: (response) => {
        this.availablePlayers = response.data.map((registration: any) => ({
          ...registration.player,
          name: `${(registration.player as any).firstName} ${(registration.player as any).lastName}`,
          seedPosition: registration.seed || 0,
          isRegistered: true
        }));
        this.assignSeedPositions();
        
        // Load existing teams after players are loaded so seed positions are available
        this.loadExistingTeams(tournamentId);
      },
      error: (error) => {
        this.snackBar.open('Failed to load players', 'Close', { duration: 3000 });
      }
    });
  }

  loadAllPlayers(): void {
    this.playerService.getAllPlayers().subscribe({
      next: (players) => {
        // For backwards compatibility, assume all players are registered when loading all
        this.availablePlayers = players.map(p => ({ 
          ...p, 
          name: `${(p as any).firstName} ${(p as any).lastName}`,
          isRegistered: true 
        }));
        this.assignSeedPositions();
      },
      error: (error) => {
        this.snackBar.open('Failed to load players', 'Close', { duration: 3000 });
      }
    });
  }

  onOptionsChange(): void {
    this.selectedPlayers = [];
    if (this.teams.length > 0) {
      this.generateTeams();
    }
  }

  getPossibleTeamsCount(): number {
    return Math.floor(this.availablePlayers.length / this.options.teamSize);
  }

  getUnusedPlayersCount(): number {
    const usedPlayers = this.teams.reduce((count, team) => count + team.players.length, 0);
    return this.availablePlayers.length - usedPlayers;
  }

  getUsedPlayersCount(): number {
    return this.teams.reduce((count, team) => count + team.players.length, 0);
  }

  generateTeams(): void {
    this.isGenerating = true;
    this.teams = [];
    
    setTimeout(() => {
      const shuffledPlayers = [...this.availablePlayers];
      
      switch (this.options.pairingMethod) {
        case 'random':
          this.generateRandomTeams(shuffledPlayers);
          break;
        case 'seeded':
          this.generateSeededTeams(shuffledPlayers);
          break;
        case 'manual':
          // Manual teams are created individually
          break;
      }
      
      this.isGenerating = false;
      this.snackBar.open(`Generated ${this.teams.length} teams`, 'Close', { duration: 2000 });
    }, 1000);
  }

  private generateRandomTeams(players: Player[]): void {
    this.shuffleArray(players);
    this.createTeamsFromPlayers(players);
  }

  private generateSeededTeams(players: Player[]): void {
    const sortedPlayers = players.sort((a, b) => (a.seedPosition || a.ranking || 0) - (b.seedPosition || b.ranking || 0));
    
    if (this.options.teamSize === 2) {
      // Pair highest with lowest seeded players
      const teams: Player[][] = [];
      let low = 0;
      let high = sortedPlayers.length - 1;
      
      while (low < high) {
        teams.push([sortedPlayers[low], sortedPlayers[high]]);
        low++;
        high--;
      }
      
      // Handle odd player
      if (low === high) {
        if (teams.length > 0) {
          teams[teams.length - 1].push(sortedPlayers[low]);
        } else {
          teams.push([sortedPlayers[low]]);
        }
      }
      
      this.teams = teams.map((teamPlayers, index) => this.createTeam(teamPlayers, index));
    } else {
      this.createTeamsFromPlayers(sortedPlayers);
    }
  }


  private createTeamsFromPlayers(players: Player[]): void {
    const teams: Player[][] = [];
    
    for (let i = 0; i < players.length; i += this.options.teamSize) {
      const teamPlayers = players.slice(i, i + this.options.teamSize);
      if (teamPlayers.length === this.options.teamSize) {
        teams.push(teamPlayers);
      }
    }
    
    this.teams = teams.map((teamPlayers, index) => this.createTeam(teamPlayers, index));
  }

  private createTeam(players: Player[], index: number): Team {
    const teamName = this.generateTeamName(players, index);
    
    return {
      id: `team-${index + 1}`,
      name: teamName,
      players: players,
      averageSkillLevel: this.calculateAverageSkillLevel(players),
      totalRanking: players.reduce((sum, p) => sum + (p.ranking || 0), 0)
    };
  }

  private generateTeamName(players: Player[], index: number): string {
    if (this.options.teamSize === 1) {
      // Singles: Use player name with seed position
      const player = players[0];
      const seedPosition = player.seedPosition ? `(${player.seedPosition})` : '';
      return `${player.name} ${seedPosition}`.trim();
    } else if (this.options.teamSize === 2 && players.length >= 2) {
      // Doubles: Player 1 Name (seed)/Player 2 Name (seed)
      const player1 = players[0];
      const player2 = players[1];
      const seed1 = player1.seedPosition ? `(${player1.seedPosition})` : '';
      const seed2 = player2.seedPosition ? `(${player2.seedPosition})` : '';
      return `${player1.name} ${seed1}/${player2.name} ${seed2}`.trim();
    } else {
      // Fallback for other cases
      return `Team ${index + 1}`;
    }
  }

  private calculateAverageSkillLevel(players: Player[]): number {
    if (!players || players.length === 0) return 0;
    
    const total = players.reduce((sum, p) => {
      const skillValue = this.skillLevelValues[p.skillLevel as keyof typeof this.skillLevelValues] || 1;
      return sum + skillValue;
    }, 0);
    
    return Math.round((total / players.length) * 10) / 10;
  }

  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  shuffleTeams(): void {
    this.shuffleArray(this.teams);
    this.snackBar.open('Teams shuffled', 'Close', { duration: 2000 });
  }

  clearTeams(): void {
    const dialogRef = this.dialog.open(ClearTeamsConfirmationDialog, {
      width: '400px',
      data: { teamCount: this.teams.length }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'clear') {
        this.performClearTeams();
      }
    });
  }

  private performClearTeams(): void {
    const tournamentId = this.tournament?._id;
    
    if (tournamentId) {
      // Delete teams from database
      this.teamService.deleteTeamsByTournament(tournamentId).subscribe({
        next: () => {
          this.teams = [];
          this.selectedPlayers = [];
          this.snackBar.open('Teams cleared and deleted from database', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting teams:', error);
          // Still clear locally even if database delete fails
          this.teams = [];
          this.selectedPlayers = [];
          this.snackBar.open('Teams cleared locally (database delete failed)', 'Close', { duration: 3000 });
        }
      });
    } else {
      // Just clear locally if no tournament ID
      this.teams = [];
      this.selectedPlayers = [];
      this.snackBar.open('Teams cleared', 'Close', { duration: 2000 });
    }
  }

  saveTeams(): void {
    if (this.teams.length === 0) {
      this.snackBar.open('No teams to save', 'Close', { duration: 3000 });
      return;
    }

    if (!this.tournament?._id) {
      this.snackBar.open('Tournament ID is required', 'Close', { duration: 3000 });
      return;
    }

    console.log('💾 Saving teams to database...');

    // Prepare teams data for backend
    const teamsData = this.teams.map(team => ({
      name: team.name,
      players: team.players.map(p => ({ 
        _id: p._id,
        seedPosition: p.seedPosition || 0
      })),
      averageSkillLevel: this.mapNumericToStringSkillLevel(team.averageSkillLevel)
    }));

    // Also save the pairing method to the tournament
    this.tournamentService.updateTournament(this.tournament._id, {
      pairingMethod: this.options.pairingMethod
    }).subscribe({
      next: () => {
        console.log('✅ Pairing method saved to tournament');
      },
      error: (error) => {
        console.error('❌ Error saving pairing method:', error);
      }
    });

    this.teamService.createTeamsBulk(this.tournament._id, teamsData).subscribe({
      next: (savedTeams) => {
        console.log('✅ Teams saved to database:', savedTeams);
        
        if (!savedTeams || savedTeams.length === 0) {
          console.warn('⚠️ No teams returned from server');
          this.snackBar.open('Teams may not have been saved correctly', 'Close', {
            duration: 3000,
            panelClass: ['warning-snackbar']
          });
          return;
        }

        this.snackBar.open(`${savedTeams.length} teams saved successfully!`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Update local teams with database IDs
        this.teams = savedTeams
          .filter(team => team && team.players) // Filter out invalid teams first
          .map(team => ({
            id: team._id,
            name: team.name,
            players: team.players.map((p: any) => {
              // Find the seed position from availablePlayers to maintain seed info
              const availablePlayer = this.availablePlayers.find(ap => ap._id === p._id);
              return {
                _id: p._id,
                name: `${p.firstName} ${p.lastName}`,
                skillLevel: p.skillLevel,
                ranking: p.ranking,
                seedPosition: availablePlayer?.seedPosition || 0,
                isRegistered: true
              };
            }),
            averageSkillLevel: this.calculateAverageSkillLevelFromTeam(team.players),
            totalRanking: team.players.reduce((sum: number, p: any) => sum + (p.ranking || 0), 0)
          }));
      },
      error: (error) => {
        console.error('❌ Error saving teams:', error);
        console.error('❌ Error details:', error.error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Full error object:', JSON.stringify(error.error, null, 2));
        this.snackBar.open('Failed to save teams: ' + (error.error?.message || error.message), 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private mapNumericToStringSkillLevel(averageLevel: number): string {
    if (averageLevel <= 1.5) return 'beginner';
    if (averageLevel <= 2.5) return 'intermediate';
    if (averageLevel <= 3.5) return 'advanced';
    return 'professional';
  }

  removeTeam(index: number): void {
    this.teams.splice(index, 1);
    this.snackBar.open('Team removed', 'Close', { duration: 2000 });
  }

  // Manual team creation methods
  isPlayerSelected(player: Player): boolean {
    return this.selectedPlayers.includes(player);
  }

  isPlayerAlreadyOnTeam(player: Player): boolean {
    return this.teams.some(team => 
      team.players.some(teamPlayer => teamPlayer._id === player._id)
    );
  }

  togglePlayerSelection(player: Player): void {
    if (this.isPlayerSelected(player)) {
      this.removePlayerFromSelection(player);
    } else if (this.selectedPlayers.length < this.options.teamSize) {
      this.selectedPlayers.push(player);
    }
  }

  removePlayerFromSelection(player: Player): void {
    const index = this.selectedPlayers.indexOf(player);
    if (index > -1) {
      this.selectedPlayers.splice(index, 1);
    }
  }

  createTeamFromSelection(): void {
    if (this.selectedPlayers.length === this.options.teamSize) {
      const newTeam = this.createTeam([...this.selectedPlayers], this.teams.length);
      this.teams.push(newTeam);
      this.selectedPlayers = [];
      this.snackBar.open('Team created', 'Close', { duration: 2000 });
    }
  }

  // Display helper methods
  getSkillLevelColor(skillLevel: string): string {
    switch (skillLevel) {
      case 'beginner': return 'primary';
      case 'intermediate': return 'accent';
      case 'advanced': return 'warn';
      case 'professional': return '';
      default: return 'primary';
    }
  }

  getPairingMethodDisplay(): string {
    switch (this.options.pairingMethod) {
      case 'random': return 'Random';
      case 'seeded': return 'Seeded (High + Low)';
      case 'manual': return 'Manual Selection';
      default: return 'Unknown';
    }
  }

  getTeamAverageSkill(team: Team): string {
    if (!team || typeof team.averageSkillLevel !== 'number' || isNaN(team.averageSkillLevel)) {
      return '0.0';
    }
    return team.averageSkillLevel.toFixed(1);
  }

  getTeamCombinedRanking(team: Team): string {
    if (!team || typeof team.totalRanking !== 'number' || isNaN(team.totalRanking)) {
      return '0';
    }
    return team.totalRanking.toString();
  }


  getPlayerDisplayNameWithSeed(player: Player): string {
    if (!player?.name) return '';
    
    // Display name with seed number after the name
    if (player.seedPosition) {
      return `${player.name} (${player.seedPosition})`;
    }
    
    return player.name;
  }

  private assignSeedPositions(): void {
    // Sort players by existing seed position or ranking, then assign sequential seeds
    this.availablePlayers.sort((a, b) => (a.seedPosition || a.ranking || 0) - (b.seedPosition || b.ranking || 0));
    
    // Assign seed positions if they don't exist (1, 2, 3, etc.)
    this.availablePlayers.forEach((player, index) => {
      if (!player.seedPosition || player.seedPosition === 0) {
        player.seedPosition = index + 1;
      }
    });
  }
}

@NgComponent({
  selector: 'clear-teams-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2>Clear All Teams</h2>
      </div>
      <div class="dialog-message">
        <p>Are you sure you want to clear all <strong>{{ data.teamCount }} teams</strong>?</p>
        <p class="warning-text">This action will permanently delete all teams from the database and cannot be undone.</p>
      </div>
      <div class="dialog-actions">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button mat-raised-button color="warn" (click)="onClear()">
          <mat-icon>clear_all</mat-icon>
          Clear Teams
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-content {
      padding: 20px;
      text-align: center;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .warning-icon {
      color: #f44336;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    h2 {
      margin: 0;
      color: #333;
    }
    .dialog-message {
      margin-bottom: 24px;
    }
    .warning-text {
      color: #666;
      font-size: 0.9rem;
      margin-top: 8px;
    }
    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  `]
})
export class ClearTeamsConfirmationDialog {
  constructor(
    public dialogRef: MatDialogRef<ClearTeamsConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { teamCount: number }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onClear(): void {
    this.dialogRef.close('clear');
  }
}