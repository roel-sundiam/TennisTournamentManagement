const mongoose = require('mongoose');
require('dotenv').config();

async function checkFieldMismatch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Get a recent team and check its actual structure
    console.log('\n=== RAW TEAM DOCUMENT STRUCTURE ===');
    const recentTeam = await db.collection('teams').findOne({}, { sort: { _id: -1 } });
    
    if (recentTeam) {
      console.log('Recent team document fields:');
      Object.keys(recentTeam).forEach(key => {
        console.log(`  ${key}: ${recentTeam[key]}`);
      });
      
      console.log('\n=== TOURNAMENT FIELD CHECK ===');
      console.log('Has "tournament" field:', 'tournament' in recentTeam);
      console.log('Has "tournamentId" field:', 'tournamentId' in recentTeam);
      
      console.log('\nField values:');
      console.log('tournament:', recentTeam.tournament);
      console.log('tournamentId:', recentTeam.tournamentId);
    }
    
    // Check using Mongoose model
    console.log('\n=== MONGOOSE MODEL CHECK ===');
    const { Team } = require('./dist/models/index');
    
    const modelTeam = await Team.findOne({}).sort({ _id: -1 });
    if (modelTeam) {
      console.log('Mongoose model team:');
      console.log('  tournament:', modelTeam.tournament);
      console.log('  tournamentId:', modelTeam.tournamentId);
      console.log('  name:', modelTeam.name);
    }
    
    // Check query patterns
    console.log('\n=== QUERY PATTERN CHECK ===');
    
    // Query with tournament field
    const tournamentCount = await Team.countDocuments({ tournament: '6878bffbbad9b144fb3d1c2c' });
    console.log('Count with tournament field:', tournamentCount);
    
    // Query with tournamentId field
    const tournamentIdCount = await Team.countDocuments({ tournamentId: '6878bffbbad9b144fb3d1c2c' });
    console.log('Count with tournamentId field:', tournamentIdCount);
    
    // Check for any teams with either field
    const anyCount = await Team.countDocuments({
      $or: [
        { tournament: '6878bffbbad9b144fb3d1c2c' },
        { tournamentId: '6878bffbbad9b144fb3d1c2c' }
      ]
    });
    console.log('Count with either field:', anyCount);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkFieldMismatch();