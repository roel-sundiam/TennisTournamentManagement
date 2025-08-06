const mongoose = require('mongoose');
require('dotenv').config();

// Import required models
const Tournament = require('./dist/models/Tournament').default;
const Match = require('./dist/models/Match').default;
const TimeSlot = require('./dist/models/TimeSlot').default;
const Schedule = require('./dist/models/Schedule').default;

// Import the function we want to test
const { generateTournamentSchedule } = require('./dist/routes/tournaments');

async function testGenerateScheduleDirect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const tournamentId = '6879c294b64b6d92bcfeeb6e';
    
    // Get tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('✅ Tournament found:', tournament.name);
    console.log('📊 Auto-schedule enabled:', tournament.autoScheduleEnabled);
    
    // Check current state
    const matchCount = await Match.countDocuments({ tournament: tournamentId });
    const timeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    const scheduleExists = await Schedule.findOne({ tournament: tournamentId });
    
    console.log('📊 Before generation:');
    console.log('  - Matches:', matchCount);
    console.log('  - Time slots:', timeSlotCount);
    console.log('  - Schedule exists:', !!scheduleExists);
    
    // Validation checks
    if (!tournament.autoScheduleEnabled) {
      console.log('❌ Auto-scheduling not enabled');
      return;
    }
    
    if (matchCount === 0) {
      console.log('❌ No matches found');
      return;
    }
    
    if (timeSlotCount > 0) {
      console.log('❌ Tournament already scheduled');
      return;
    }
    
    console.log('✅ All validations passed, generating schedule...');
    
    // Call the function
    await generateTournamentSchedule(tournament);
    
    // Check results
    const newTimeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    const scheduledMatchCount = await Match.countDocuments({ 
      tournament: tournamentId,
      scheduledDate: { $exists: true }
    });
    
    console.log('📊 After generation:');
    console.log('  - Time slots:', newTimeSlotCount);
    console.log('  - Scheduled matches:', scheduledMatchCount);
    
    // Show first few time slots
    if (newTimeSlotCount > 0) {
      const timeSlots = await TimeSlot.find({ tournament: tournamentId }).limit(3);
      console.log('📅 Sample time slots:');
      timeSlots.forEach((slot, index) => {
        console.log(`  ${index + 1}. ${slot.court} - ${slot.startTime.toLocaleString()}`);
      });
    }
    
    // Show scheduled matches
    if (scheduledMatchCount > 0) {
      const matches = await Match.find({ 
        tournament: tournamentId,
        scheduledDate: { $exists: true }
      }).limit(3);
      console.log('⚔️ Sample scheduled matches:');
      matches.forEach((match, index) => {
        console.log(`  ${index + 1}. Match ${match.matchNumber} - ${match.scheduledDate} ${match.scheduledTime}`);
      });
    }
    
    console.log('✅ Direct function test completed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGenerateScheduleDirect();