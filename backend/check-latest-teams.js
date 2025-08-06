const mongoose = require('mongoose');
require('dotenv').config();

async function checkLatestTeams() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Team } = require('./dist/models/index');
    
    // Check the most recent teams created
    console.log('\n=== LATEST 10 TEAMS ===');
    const latestTeams = await Team.find({}).sort({ _id: -1 }).limit(10);
    
    latestTeams.forEach((team, i) => {
      const createdTime = team._id.getTimestamp();
      console.log(`${i+1}. ${team.name}`);
      console.log(`   Tournament ID: ${team.tournamentId || 'undefined'}`);
      console.log(`   Created: ${createdTime.toLocaleString()}`);
      console.log('');
    });
    
    // Count total teams
    const totalTeams = await Team.countDocuments();
    console.log(`Total teams in database: ${totalTeams}`);
    
    // Check teams for specific tournament
    const newTournamentTeams = await Team.find({ tournamentId: '6878bffbbad9b144fb3d1c2c' });
    console.log(`\nTeams for tournament 6878bffbbad9b144fb3d1c2c: ${newTournamentTeams.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkLatestTeams();