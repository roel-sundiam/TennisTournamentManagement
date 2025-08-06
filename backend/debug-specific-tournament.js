const mongoose = require('mongoose');
require('dotenv').config();

async function debugSpecificTournament() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Import models
    const { Tournament, Match, Bracket, Team } = require('./dist/models/index');
    
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== TOURNAMENT DEBUG ===');
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('Tournament not found!');
      return;
    }
    
    console.log(`Tournament: ${tournament.name}`);
    console.log(`Format: ${tournament.gameType} - ${tournament.gameFormat}`);
    
    // Check teams
    const teams = await Team.find({ tournament: tournamentId });
    console.log(`\n=== TEAMS (${teams.length}) ===`);
    teams.forEach((team, i) => {
      console.log(`Team ${i+1}: ${team.name} (${team.player1?.name || 'No player1'} / ${team.player2?.name || 'No player2'})`);
    });
    
    // Specifically look for the mentioned teams
    console.log('\n=== LOOKING FOR SPECIFIC TEAMS ===');
    const dirkLarryTeam = teams.find(t => 
      t.name.includes('Dirk') && t.name.includes('Larry') ||
      (t.player1?.name?.includes('Dirk') || t.player2?.name?.includes('Dirk')) &&
      (t.player1?.name?.includes('Larry') || t.player2?.name?.includes('Larry'))
    );
    
    const rafaelDanTeam = teams.find(t => 
      t.name.includes('Rafael') && t.name.includes('Dan') ||
      (t.player1?.name?.includes('Rafael') || t.player2?.name?.includes('Rafael')) &&
      (t.player1?.name?.includes('Dan') || t.player2?.name?.includes('Dan'))
    );
    
    if (dirkLarryTeam) {
      console.log(`Found Dirk/Larry team: ${dirkLarryTeam.name} (ID: ${dirkLarryTeam._id})`);
    }
    if (rafaelDanTeam) {
      console.log(`Found Rafael/Dan team: ${rafaelDanTeam.name} (ID: ${rafaelDanTeam._id})`);
    }
    
    console.log('\n=== MATCHES BY ROUND ===');
    const matches = await Match.find({ tournament: tournamentId }).sort({ round: 1, matchNumber: 1 });
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
      const status = match.status;
      
      console.log(`Match ${match.matchNumber}: ${team1Name} vs ${team2Name}`);
      console.log(`  Status: ${status} | Winner: ${winnerName}`);
      if (match.score && match.score.finalScore) {
        console.log(`  Score: ${match.score.finalScore}`);
      }
      
      // Check if this is the specific match we're looking for
      if ((team1Name.includes('Dirk') && team1Name.includes('Larry')) || 
          (team2Name.includes('Dirk') && team2Name.includes('Larry')) ||
          (team1Name.includes('Rafael') && team1Name.includes('Dan')) || 
          (team2Name.includes('Rafael') && team2Name.includes('Dan'))) {
        console.log(`  *** THIS IS THE MATCH WE'RE LOOKING FOR ***`);
        console.log(`  Match ID: ${match._id}`);
        console.log(`  Team1 ID: ${match.team1?._id}`);
        console.log(`  Team2 ID: ${match.team2?._id}`);
        console.log(`  Winner ID: ${match.winner?._id}`);
      }
    }
    
    console.log('\n=== WINNER ADVANCEMENT ANALYSIS ===');
    
    // Group matches by round
    const roundMatches = {};
    matches.forEach(match => {
      if (!roundMatches[match.round]) roundMatches[match.round] = [];
      roundMatches[match.round].push(match);
    });
    
    const rounds = Object.keys(roundMatches).map(r => parseInt(r)).sort((a,b) => a-b);
    
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i];
      const nextRound = rounds[i + 1];
      
      console.log(`\n--- Checking advancement from Round ${currentRound} to Round ${nextRound} ---`);
      
      const currentRoundMatches = roundMatches[currentRound];
      const nextRoundMatches = roundMatches[nextRound];
      
      console.log(`Round ${currentRound} completed matches:`);
      const completedMatches = currentRoundMatches.filter(m => m.status === 'completed' && m.winner);
      completedMatches.forEach((match, idx) => {
        console.log(`  Match ${match.matchNumber}: Winner = ${match.winner.name}`);
      });
      
      console.log(`Round ${nextRound} matches:`);
      nextRoundMatches.forEach((match, idx) => {
        console.log(`  Match ${match.matchNumber}: ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'}`);
      });
      
      // Check if winners advanced properly
      const winners = completedMatches.map(m => m.winner.name);
      const nextRoundTeams = [];
      nextRoundMatches.forEach(m => {
        if (m.team1) nextRoundTeams.push(m.team1.name);
        if (m.team2) nextRoundTeams.push(m.team2.name);
      });
      
      console.log(`Winners from Round ${currentRound}: [${winners.join(', ')}]`);
      console.log(`Teams in Round ${nextRound}: [${nextRoundTeams.join(', ')}]`);
      
      const missingWinners = winners.filter(w => !nextRoundTeams.includes(w));
      if (missingWinners.length > 0) {
        console.log(`❌ PROBLEM: These winners didn't advance: [${missingWinners.join(', ')}]`);
      } else {
        console.log(`✅ All winners properly advanced`);
      }
    }
    
    console.log('\n=== BRACKET STRUCTURE ===');
    const bracket = await Bracket.findOne({ tournament: tournamentId });
    if (bracket) {
      console.log(`Bracket rounds: ${bracket.rounds?.length || 0}`);
      console.log(`Total teams: ${bracket.totalTeams}`);
      console.log(`Format: ${bracket.format}`);
    } else {
      console.log('No bracket found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugSpecificTournament();