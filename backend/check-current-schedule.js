const mongoose = require('mongoose');
const Tournament = require('./dist/models/Tournament').default;
const TimeSlot = require('./dist/models/TimeSlot').default;
const Schedule = require('./dist/models/Schedule').default;
const Match = require('./dist/models/Match').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function checkCurrentSchedule() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879a0eeca3117be4e088335';
    
    // Check current state
    const timeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    const scheduleCount = await Schedule.countDocuments({ tournament: tournamentId });
    const totalMatches = await Match.countDocuments({ tournament: tournamentId });
    const scheduledMatches = await Match.countDocuments({ 
      tournament: tournamentId,
      scheduledDate: { $exists: true, $ne: null }
    });
    
    console.log('📊 Current Schedule State:');
    console.log(`  Time Slots: ${timeSlotCount}`);
    console.log(`  Schedule Records: ${scheduleCount}`);
    console.log(`  Total Matches: ${totalMatches}`);
    console.log(`  Scheduled Matches: ${scheduledMatches}`);
    
    // Show sample matches with scheduling data
    const matches = await Match.find({ tournament: tournamentId })
      .populate('scheduledTimeSlot')
      .sort({ round: 1, matchNumber: 1 })
      .limit(5);
    
    console.log('\n🎾 Sample Matches:');
    matches.forEach((match, index) => {
      console.log(`  Match ${index + 1} (Round ${match.round}):`);
      console.log(`    Teams: ${match.team1} vs ${match.team2}`);
      console.log(`    Scheduled Date: ${match.scheduledDate || 'Not set'}`);
      console.log(`    Scheduled Time: ${match.scheduledTime || 'Not set'}`);
      console.log(`    Court: ${match.court || 'Not set'}`);
      console.log(`    Status: ${match.status}`);
      console.log(`    Time Slot: ${match.scheduledTimeSlot ? 'Assigned' : 'Not assigned'}`);
      console.log('');
    });
    
    // Check time slots
    const timeSlots = await TimeSlot.find({ tournament: tournamentId })
      .sort({ startTime: 1 })
      .limit(5);
    
    console.log('⏰ Sample Time Slots:');
    timeSlots.forEach((slot, index) => {
      console.log(`  Slot ${index + 1}:`);
      console.log(`    Court: ${slot.court}`);
      console.log(`    Time: ${new Date(slot.startTime).toLocaleString()} - ${new Date(slot.endTime).toLocaleString()}`);
      console.log(`    Status: ${slot.status}`);
      console.log(`    Match: ${slot.match || 'None'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkCurrentSchedule();