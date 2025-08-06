const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log(`Database: ${mongoose.connection.db.databaseName}`);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=== ALL COLLECTIONS ===');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });
    
    // Count documents in key collections
    console.log('\n=== DOCUMENT COUNTS ===');
    const db = mongoose.connection.db;
    
    const tournamentCount = await db.collection('tournaments').countDocuments();
    const teamCount = await db.collection('teams').countDocuments();
    const matchCount = await db.collection('matches').countDocuments();
    const bracketCount = await db.collection('brackets').countDocuments();
    const playerCount = await db.collection('players').countDocuments();
    
    console.log(`Tournaments: ${tournamentCount}`);
    console.log(`Teams: ${teamCount}`);
    console.log(`Matches: ${matchCount}`);
    console.log(`Brackets: ${bracketCount}`);
    console.log(`Players: ${playerCount}`);
    
    // Check if there are teams with different field names
    console.log('\n=== RAW TEAM DATA ===');
    const allTeams = await db.collection('teams').find({}).limit(10).toArray();
    console.log(`Found ${allTeams.length} teams in raw collection:`);
    allTeams.forEach((team, i) => {
      console.log(`  ${i+1}. Name: ${team.name || 'No name'} | Tournament: ${team.tournamentId || team.tournament || 'No tournament'}`);
    });
    
    // Check for recent teams
    console.log('\n=== RECENT TEAMS ===');
    const recentTeams = await db.collection('teams').find({}).sort({ _id: -1 }).limit(5).toArray();
    recentTeams.forEach(team => {
      console.log(`  Team: ${team.name} | Tournament: ${team.tournamentId || 'undefined'} | Created: ${team._id.getTimestamp()}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkCollections();