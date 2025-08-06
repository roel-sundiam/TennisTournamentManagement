const mongoose = require('mongoose');
const Tournament = require('./dist/models/Tournament').default;
const TimeSlot = require('./dist/models/TimeSlot').default;
const Schedule = require('./dist/models/Schedule').default;
const Match = require('./dist/models/Match').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function checkTournamentSchedule() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879b6b5c1470a4ab4f4a416';
    
    // Check current state
    const tournament = await Tournament.findById(tournamentId);
    const timeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    const scheduleCount = await Schedule.countDocuments({ tournament: tournamentId });
    const totalMatches = await Match.countDocuments({ tournament: tournamentId });
    const scheduledMatches = await Match.countDocuments({ 
      tournament: tournamentId,
      scheduledDateTime: { $exists: true, $ne: null }
    });
    
    console.log('📊 Tournament Schedule State:');
    console.log(`  Tournament: ${tournament?.name || 'Not found'}`);
    console.log(`  Time Slots: ${timeSlotCount}`);
    console.log(`  Schedule Records: ${scheduleCount}`);
    console.log(`  Total Matches: ${totalMatches}`);
    console.log(`  Scheduled Matches: ${scheduledMatches}`);
    
    // Check if there's a schedule record
    const schedule = await Schedule.findOne({ tournament: tournamentId });
    if (schedule) {
      console.log('\n📅 Schedule Details:');
      console.log(`  Name: ${schedule.name}`);
      console.log(`  Courts: ${JSON.stringify(schedule.courts)}`);
      console.log(`  Status: ${schedule.status}`);
      console.log(`  Generated: ${schedule.generatedAt}`);
    } else {
      console.log('\n❌ No schedule record found for this tournament');
    }
    
    // Check sample matches
    const matches = await Match.find({ tournament: tournamentId })
      .sort({ round: 1, matchNumber: 1 })
      .limit(3);
    
    console.log('\n🎾 Sample Matches:');
    matches.forEach((match, index) => {
      console.log(`  Match ${index + 1} (Round ${match.round}):`);;
      console.log(`    Scheduled DateTime: ${match.scheduledDateTime || 'Not set'}`);
      console.log(`    Scheduled Time Slot: ${match.scheduledTimeSlot || 'Not set'}`);
      console.log(`    Status: ${match.status}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkTournamentSchedule();