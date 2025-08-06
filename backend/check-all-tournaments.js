const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllTournaments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Tournament, Team, Match, Bracket } = require('./dist/models/index');
    
    // Check all recent tournaments
    const tournaments = await Tournament.find({}).sort({ createdAt: -1 }).limit(5);
    
    console.log(`\n=== ALL RECENT TOURNAMENTS ===`);
    for (const tournament of tournaments) {
      console.log(`\nTournament: ${tournament.name} (ID: ${tournament._id})`);
      console.log(`  Created: ${tournament.createdAt}`);
      console.log(`  Format: ${tournament.gameType} - ${tournament.gameFormat}`);
      
      // Check teams for this tournament
      const teams = await Team.find({ tournamentId: tournament._id });
      console.log(`  Teams: ${teams.length}`);
      
      if (teams.length > 0) {
        teams.slice(0, 5).forEach((team, i) => {
          console.log(`    ${i+1}. ${team.name}`);
        });
        if (teams.length > 5) console.log(`    ... and ${teams.length - 5} more`);
      }
      
      // Check matches for this tournament
      const matches = await Match.find({ tournamentId: tournament._id });
      console.log(`  Matches: ${matches.length}`);
      
      // Check bracket for this tournament
      const bracket = await Bracket.findOne({ tournamentId: tournament._id });
      console.log(`  Bracket: ${bracket ? 'Yes' : 'No'}`);
      
      // If this looks like our target tournament, show more details
      if (teams.some(t => t.name.includes('Dirk') || t.name.includes('Rafael'))) {
        console.log(`  *** THIS MIGHT BE OUR TARGET TOURNAMENT ***`);
        
        const dirkTeam = teams.find(t => t.name.includes('Dirk'));
        const rafaelTeam = teams.find(t => t.name.includes('Rafael'));
        
        if (dirkTeam) console.log(`    Dirk team: ${dirkTeam.name}`);
        if (rafaelTeam) console.log(`    Rafael team: ${rafaelTeam.name}`);
        
        // Show some matches
        const someMatches = matches.slice(0, 3);
        someMatches.forEach(match => {
          console.log(`    Match ${match.matchNumber}: ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'} (Status: ${match.status})`);
        });
      }
    }
    
    // Also check for any teams with the specific tournament ID
    console.log(`\n=== CHECKING SPECIFIC TOURNAMENT ID ===`);
    const specificTeams = await Team.find({ tournamentId: '6878b2c4bad9b144fb3ceced' });
    const specificMatches = await Match.find({ tournamentId: '6878b2c4bad9b144fb3ceced' });
    const specificBracket = await Bracket.findOne({ tournamentId: '6878b2c4bad9b144fb3ceced' });
    
    console.log(`Tournament 6878b2c4bad9b144fb3ceced:`);
    console.log(`  Teams: ${specificTeams.length}`);
    console.log(`  Matches: ${specificMatches.length}`);
    console.log(`  Bracket: ${specificBracket ? 'Yes' : 'No'}`);
    
    if (specificTeams.length > 0) {
      specificTeams.forEach(team => {
        console.log(`    Team: ${team.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkAllTournaments();