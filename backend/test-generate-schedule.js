const mongoose = require('mongoose');
require('dotenv').config();

async function testGenerateSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const tournamentId = '6879c294b64b6d92bcfeeb6e';
    
    // Check tournament
    const Tournament = mongoose.model('Tournament', new mongoose.Schema({}, {strict: false}));
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('✅ Tournament found:', tournament.name);
    console.log('📊 Auto-schedule enabled:', tournament.autoScheduleEnabled);
    console.log('📅 Daily start time:', tournament.dailyStartTime);
    console.log('📅 Daily end time:', tournament.dailyEndTime);
    console.log('🏟️ Available courts:', tournament.availableCourts);
    console.log('⏱️ Match duration:', tournament.matchDuration);
    
    // Check matches
    const Match = mongoose.model('Match', new mongoose.Schema({}, {strict: false}));
    const matchCount = await Match.countDocuments({ tournament: tournamentId });
    console.log('⚔️ Total matches:', matchCount);
    
    // Check time slots
    const TimeSlot = mongoose.model('TimeSlot', new mongoose.Schema({}, {strict: false}));
    const timeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    console.log('⏰ Time slots:', timeSlotCount);
    
    // Test the validation conditions
    console.log('\n🔍 Validation check:');
    console.log('- Auto-schedule enabled:', tournament.autoScheduleEnabled);
    console.log('- Daily start time exists:', !!tournament.dailyStartTime);
    console.log('- Daily end time exists:', !!tournament.dailyEndTime);
    console.log('- Available courts exist:', !!tournament.availableCourts);
    console.log('- Available courts length:', tournament.availableCourts?.length || 0);
    console.log('- Match count:', matchCount);
    console.log('- Time slot count:', timeSlotCount);
    
    // Simulate the route validation
    if (!tournament.autoScheduleEnabled) {
      console.log('❌ Would fail: Auto-scheduling not enabled');
    } else if (!tournament.dailyStartTime || !tournament.dailyEndTime) {
      console.log('❌ Would fail: Missing time window');
    } else if (!tournament.availableCourts || tournament.availableCourts.length === 0) {
      console.log('❌ Would fail: No available courts');
    } else if (matchCount === 0) {
      console.log('❌ Would fail: No matches found');
    } else if (timeSlotCount > 0) {
      console.log('❌ Would fail: Tournament already scheduled');
    } else {
      console.log('✅ All validations would pass');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testGenerateSchedule();