const mongoose = require('mongoose');
const Schedule = require('./dist/models/Schedule').default;
const Match = require('./dist/models/Match').default;
const Tournament = require('./dist/models/Tournament').default;
const TimeSlot = require('./dist/models/TimeSlot').default;

async function debugTournament() {
  try {
    await mongoose.connect('mongodb://localhost:27017/TennisTournamentManagement');
    console.log('Connected to MongoDB');
    
    const tournamentId = '6878ade0bad9b144fb3ce12e';
    console.log('=== DEBUGGING TOURNAMENT:', tournamentId, '===');
    
    // 1. Check if tournament exists
    const tournament = await Tournament.findById(tournamentId);
    console.log('1. Tournament found:', tournament ? 'YES' : 'NO');
    if (tournament) {
      console.log('   - Name:', tournament.name);
      console.log('   - Status:', tournament.status);
      console.log('   - Club:', tournament.club);
    }
    
    // 2. Check if schedule exists
    const schedule = await Schedule.findOne({ tournament: tournamentId });
    console.log('2. Schedule found:', schedule ? 'YES' : 'NO');
    if (schedule) {
      console.log('   - Name:', schedule.name);
      console.log('   - Status:', schedule.status);
      console.log('   - Total matches:', schedule.totalMatches);
      console.log('   - Scheduled matches:', schedule.scheduledMatches);
    }
    
    // 3. Check time slots
    const timeSlots = await TimeSlot.find({ tournament: tournamentId });
    console.log('3. Time slots found:', timeSlots.length);
    const availableSlots = timeSlots.filter(slot => slot.status === 'available');
    const bookedSlots = timeSlots.filter(slot => slot.status === 'booked');
    console.log('   - Available:', availableSlots.length);
    console.log('   - Booked:', bookedSlots.length);
    
    // 4. Check matches
    const matches = await Match.find({ tournament: tournamentId });
    console.log('4. Matches found:', matches.length);
    const scheduledMatches = matches.filter(match => match.scheduledDateTime);
    const unscheduledMatches = matches.filter(match => !match.scheduledDateTime);
    console.log('   - Scheduled matches:', scheduledMatches.length);
    console.log('   - Unscheduled matches:', unscheduledMatches.length);
    
    // 5. Sample matches details
    if (matches.length > 0) {
      console.log('5. Sample matches:');
      matches.slice(0, 3).forEach((match, index) => {
        console.log(`   Match ${index + 1}:`);
        console.log('     - ID:', match._id);
        console.log('     - Round:', match.round);
        console.log('     - Status:', match.status);
        console.log('     - Scheduled DateTime:', match.scheduledDateTime);
        console.log('     - Scheduled TimeSlot:', match.scheduledTimeSlot);
        console.log('     - Court:', match.court);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugTournament();