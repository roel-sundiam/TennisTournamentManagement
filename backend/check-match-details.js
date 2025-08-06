const mongoose = require('mongoose');
require('dotenv').config();

async function checkMatchDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Match } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== DETAILED MATCH ANALYSIS ===');
    const matches = await Match.find({ tournament: tournamentId }).sort({ round: 1, matchNumber: 1 });
    
    matches.forEach((match, i) => {
      console.log(`\nMatch ${i + 1} (Round ${match.round}, Match ${match.matchNumber}):`);
      console.log(`  ID: ${match._id}`);
      console.log(`  Status: ${match.status}`);
      console.log(`  Team1: ${match.team1 || 'undefined'}`);
      console.log(`  Team2: ${match.team2 || 'undefined'}`);
      
      // Check if there are any team references but they're not populating
      console.log(`  Raw team1 value: ${match.team1}`);
      console.log(`  Raw team2 value: ${match.team2}`);
      
      // Check for bracket-specific fields
      console.log(`  Bracket: ${match.bracket || 'undefined'}`);
      console.log(`  Bracket Position: Round ${match.bracketPosition?.round}, Position ${match.bracketPosition?.position}`);
    });
    
    // Check if teams exist and try to populate manually
    console.log(`\n=== MANUAL TEAM POPULATION TEST ===`);
    const firstMatch = matches[0];
    if (firstMatch && firstMatch.team1) {
      const { Team } = require('./dist/models/index');
      const team1 = await Team.findById(firstMatch.team1);
      console.log(`Team1 from database: ${team1 ? team1.name : 'Not found'}`);
    }
    
    if (firstMatch && firstMatch.team2) {
      const { Team } = require('./dist/models/index');
      const team2 = await Team.findById(firstMatch.team2);
      console.log(`Team2 from database: ${team2 ? team2.name : 'Not found'}`);
    }
    
    // Try populating matches
    console.log(`\n=== POPULATED MATCHES ===`);
    const populatedMatches = await Match.find({ tournament: tournamentId })
      .populate('team1', 'name seed')
      .populate('team2', 'name seed')
      .sort({ round: 1, matchNumber: 1 });
    
    populatedMatches.slice(0, 3).forEach((match, i) => {
      console.log(`\nPopulated Match ${i + 1}:`);
      console.log(`  Team1: ${match.team1?.name || 'No team1'} (Seed ${match.team1?.seed || 'N/A'})`);
      console.log(`  Team2: ${match.team2?.name || 'No team2'} (Seed ${match.team2?.seed || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkMatchDetails();