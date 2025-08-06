const mongoose = require('mongoose');
const Tournament = require('./dist/models/Tournament').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function checkTournamentAutoSchedule() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879b6b5c1470a4ab4f4a416';
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('🏆 Tournament Auto-Schedule Settings:');
    console.log(`  Name: ${tournament.name}`);
    console.log(`  Auto Schedule Enabled: ${tournament.autoScheduleEnabled}`);
    console.log(`  Daily Start Time: ${tournament.dailyStartTime}`);
    console.log(`  Daily End Time: ${tournament.dailyEndTime}`);
    console.log(`  Available Courts: ${JSON.stringify(tournament.availableCourts)}`);
    console.log(`  Match Duration: ${tournament.matchDuration}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkTournamentAutoSchedule();