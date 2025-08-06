const mongoose = require('mongoose');
require('dotenv').config();

async function findTeams() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Team, Match, Tournament } = require('./dist/models/index');
    
    console.log('\n=== SEARCHING FOR DIRK/LARRY AND RAFAEL/DAN TEAMS ===');
    
    // Search for teams with these players
    const allTeams = await Team.find({});
    
    const dirkLarryTeams = allTeams.filter(t => 
      (t.name && t.name.includes('Dirk') && t.name.includes('Larry')) ||
      (t.player1?.name?.includes('Dirk') && t.player2?.name?.includes('Larry')) ||
      (t.player1?.name?.includes('Larry') && t.player2?.name?.includes('Dirk'))
    );
    
    const rafaelDanTeams = allTeams.filter(t => 
      (t.name && t.name.includes('Rafael') && t.name.includes('Dan')) ||
      (t.player1?.name?.includes('Rafael') && t.player2?.name?.includes('Dan')) ||
      (t.player1?.name?.includes('Dan') && t.player2?.name?.includes('Rafael'))
    );
    
    console.log(`Found ${dirkLarryTeams.length} Dirk/Larry teams:`);
    dirkLarryTeams.forEach(t => {
      console.log(`  - ${t.name} (Tournament: ${t.tournamentId})`);
    });
    
    console.log(`Found ${rafaelDanTeams.length} Rafael/Dan teams:`);
    rafaelDanTeams.forEach(t => {
      console.log(`  - ${t.name} (Tournament: ${t.tournamentId})`);
    });
    
    // If we found teams, check their tournament matches
    if (dirkLarryTeams.length > 0 || rafaelDanTeams.length > 0) {
      const tournamentIds = [
        ...dirkLarryTeams.map(t => t.tournamentId),
        ...rafaelDanTeams.map(t => t.tournamentId)
      ];
      const uniqueTournamentIds = [...new Set(tournamentIds)];
      
      console.log(`\n=== CHECKING TOURNAMENTS ===`);
      for (const tournamentId of uniqueTournamentIds) {
        console.log(`\nTournament ID: ${tournamentId}`);
        
        const tournament = await Tournament.findById(tournamentId);
        console.log(`  Name: ${tournament?.name || 'Unknown'}`);
        
        const matches = await Match.find({ tournamentId }).sort({ round: 1, matchNumber: 1 });
        console.log(`  Total matches: ${matches.length}`);
        
        // Look for matches involving these teams
        const relevantMatches = matches.filter(m => 
          (m.team1?.name?.includes('Dirk') && m.team1?.name?.includes('Larry')) ||
          (m.team2?.name?.includes('Dirk') && m.team2?.name?.includes('Larry')) ||
          (m.team1?.name?.includes('Rafael') && m.team1?.name?.includes('Dan')) ||
          (m.team2?.name?.includes('Rafael') && m.team2?.name?.includes('Dan'))
        );
        
        if (relevantMatches.length > 0) {
          console.log(`  *** FOUND RELEVANT MATCHES ***`);
          relevantMatches.forEach(match => {
            console.log(`    Match ${match.matchNumber} (Round ${match.round}): ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'}`);
            console.log(`      Status: ${match.status} | Winner: ${match.winner?.name || 'No winner'}`);
            if (match.score?.finalScore) {
              console.log(`      Score: ${match.score.finalScore}`);
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

findTeams();