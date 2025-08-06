const mongoose = require('mongoose');
require('dotenv').config();

async function debugTournament() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Import models
    const { Tournament, Match, Bracket, Team } = require('./dist/models/index');
    
    const tournamentId = '68789d40b3820a4e4f5ce642';
    
    console.log('\n=== TOURNAMENT DEBUG ===');
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('Tournament not found!');
      return;
    }
    
    console.log(`Tournament: ${tournament.name}`);
    console.log(`Teams: ${tournament.teams?.length || 0}`);
    console.log(`Format: ${tournament.gameType} - ${tournament.gameFormat}`);
    
    // Check teams collection separately
    const teams = await Team.find({ tournamentId });
    console.log(`Teams in Teams collection: ${teams.length}`);
    teams.forEach((team, i) => {
      console.log(`  Team ${i+1}: ${team.name} (${team.player1?.name || 'No player1'} / ${team.player2?.name || 'No player2'})`);
    });
    
    console.log('\n=== MATCHES BY ROUND ===');
    const matches = await Match.find({ tournamentId }).sort({ round: 1, matchNumber: 1 });
    console.log(`Total matches: ${matches.length}`);
    
    let currentRound = 0;
    for (const match of matches) {
      if (match.round !== currentRound) {
        console.log(`\n--- Round ${match.round} ---`);
        currentRound = match.round;
      }
      
      const team1Name = match.team1?.name || 'TBD';
      const team2Name = match.team2?.name || 'TBD';
      const winnerName = match.winner?.name || 'No winner';
      
      console.log(`Match ${match.matchNumber}: ${team1Name} vs ${team2Name} | Status: ${match.status} | Winner: ${winnerName}`);
    }
    
    console.log('\n=== BRACKET STRUCTURE ===');
    const bracket = await Bracket.findOne({ tournamentId });
    if (bracket) {
      console.log(`Bracket rounds: ${bracket.rounds?.length || 0}`);
      console.log(`Total teams: ${bracket.totalTeams}`);
      console.log(`Format: ${bracket.format}`);
    } else {
      console.log('No bracket found');
    }
    
    // Check for advancement issues
    console.log('\n=== ADVANCEMENT ANALYSIS ===');
    const roundMatches = {};
    matches.forEach(match => {
      if (!roundMatches[match.round]) roundMatches[match.round] = [];
      roundMatches[match.round].push(match);
    });
    
    Object.keys(roundMatches).forEach(round => {
      console.log(`\nRound ${round} analysis:`);
      const roundMatch = roundMatches[round];
      const completedMatches = roundMatch.filter(m => m.status === 'completed');
      const pendingMatches = roundMatch.filter(m => m.status === 'pending');
      
      console.log(`  - Completed: ${completedMatches.length}/${roundMatch.length}`);
      console.log(`  - Pending: ${pendingMatches.length}`);
      
      if (pendingMatches.length > 0) {
        pendingMatches.forEach(m => {
          console.log(`    - Match ${m.matchNumber}: ${m.team1?.name || 'TBD'} vs ${m.team2?.name || 'TBD'}`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugTournament();