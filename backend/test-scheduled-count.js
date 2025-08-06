const mongoose = require('mongoose');
const Match = require('./dist/models/Match').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function testScheduledCount() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879a0eeca3117be4e088335';
    
    // First query - count all matches
    const totalMatches = await Match.countDocuments({ tournament: tournamentId });
    console.log(`📊 Total matches: ${totalMatches}`);
    
    // Second query - count matches with scheduledDateTime
    const scheduledMatches = await Match.countDocuments({ 
      tournament: tournamentId,
      scheduledDateTime: { $exists: true, $ne: null }
    });
    console.log(`📊 Scheduled matches (via scheduledDateTime): ${scheduledMatches}`);
    
    // Third query - find actual matches and show their fields
    const matches = await Match.find({ tournament: tournamentId }, 'round matchNumber scheduledDateTime scheduledDate status').lean();
    console.log('\n🔍 All matches:');
    matches.forEach((match, index) => {
      console.log(`  Match ${index + 1}: Round ${match.round}, Status: ${match.status}`);
      console.log(`    scheduledDateTime: ${match.scheduledDateTime}`);
      console.log(`    scheduledDate: ${match.scheduledDate}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testScheduledCount();