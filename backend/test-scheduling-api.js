const mongoose = require('mongoose');
require('dotenv').config();

async function testSchedulingAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Schedule = require('./dist/models/Schedule').default;
    const TimeSlot = require('./dist/models/TimeSlot').default;
    const Match = require('./dist/models/Match').default;
    
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🧪 TESTING SCHEDULING API DATA');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Simulate what the API endpoint does
    const schedule = await Schedule.findOne({ tournament: tournamentId })
      .populate('tournament', 'name startDate endDate format gameType');
    
    console.log('📅 Schedule found:', !!schedule);
    if (schedule) {
      console.log('  ID:', schedule._id);
      console.log('  Name:', schedule.name);
      console.log('  Status:', schedule.status);
    }
    
    // Get time slots for this tournament
    const timeSlots = await TimeSlot.find({ tournament: tournamentId })
      .sort({ startTime: 1 });
    
    console.log(`⏰ Time slots found: ${timeSlots.length}`);
    timeSlots.forEach((slot, i) => {
      const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  ${i + 1}. ${timeDisplay} - ${slot.status} (Court: ${slot.court || 'Court from notes: ' + slot.notes})`);
    });
    
    // Get all matches for this tournament with populated data
    const matches = await Match.find({ tournament: tournamentId })
      .populate('team1', 'name players')
      .populate('team2', 'name players') 
      .populate('scheduledTimeSlot', 'startTime endTime court status')
      .sort({ round: 1, matchNumber: 1 });
    
    console.log(`⚔️ Matches found: ${matches.length}`);
    matches.forEach((match, i) => {
      const timeDisplay = match.scheduledDateTime ? 
        new Date(match.scheduledDateTime).toLocaleString('en-PH', { 
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) : 'Not scheduled';
      
      console.log(`  ${i + 1}. Round ${match.round} Match ${match.matchNumber} - ${timeDisplay}`);
      console.log(`      Team1: ${match.team1?.name || 'Team 1'}`);
      console.log(`      Team2: ${match.team2?.name || 'Team 2'}`);
      console.log(`      TimeSlot: ${match.scheduledTimeSlot?._id || 'None'}`);
    });
    
    // This is what the API should return
    const responseData = {
      tournamentId: schedule.tournament,
      totalMatches: schedule.totalMatches,
      scheduledMatches: schedule.scheduledMatches,
      timeSlots: timeSlots,
      matches: matches,
      conflicts: schedule.conflicts,
      estimatedDuration: schedule.estimatedDuration,
      schedule: {
        _id: schedule._id,
        name: schedule.name,
        description: schedule.description,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        courts: schedule.courts,
        timeSlotDuration: schedule.timeSlotDuration,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakBetweenMatches: schedule.breakBetweenMatches,
        status: schedule.status,
        generatedAt: schedule.generatedAt
      }
    };
    
    console.log('\n📊 API Response Preview:');
    console.log('  Tournament ID:', responseData.tournamentId);
    console.log('  Total Matches:', responseData.totalMatches);
    console.log('  Scheduled Matches:', responseData.scheduledMatches);
    console.log('  Time Slots:', responseData.timeSlots.length);
    console.log('  Matches:', responseData.matches.length);
    console.log('  Schedule Start Time:', responseData.schedule.startTime);
    console.log('  Schedule End Time:', responseData.schedule.endTime);
    
    console.log('\n🎯 API TEST COMPLETE!');
    console.log('✅ This data should be available to the frontend');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testSchedulingAPI();