const mongoose = require('mongoose');
require('dotenv').config();

async function checkTournament() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const tournamentId = '6879c294b64b6d92bcfeeb6e';
    console.log('Checking tournament:', tournamentId);
    
    // Check tournament exists
    const Tournament = mongoose.model('Tournament', new mongoose.Schema({}, {strict: false}));
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      console.log('❌ Tournament not found');
      process.exit(1);
    }
    
    console.log('✅ Tournament found:', tournament.name);
    console.log('📊 Auto-schedule enabled:', tournament.autoScheduleEnabled);
    console.log('📅 Status:', tournament.status);
    
    // Check matches
    const Match = mongoose.model('Match', new mongoose.Schema({}, {strict: false}));
    const matches = await Match.find({ tournament: tournamentId });
    console.log('⚔️ Total matches:', matches.length);
    
    // Check time slots
    const TimeSlot = mongoose.model('TimeSlot', new mongoose.Schema({}, {strict: false}));
    const timeSlots = await TimeSlot.find({ tournament: tournamentId });
    console.log('⏰ Time slots:', timeSlots.length);
    
    // Check schedule
    const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, {strict: false}));
    const schedule = await Schedule.findOne({ tournament: tournamentId });
    console.log('📋 Schedule exists:', !!schedule);
    if (schedule) {
      console.log('📋 Schedule total matches:', schedule.totalMatches);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTournament();