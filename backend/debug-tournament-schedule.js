const mongoose = require('mongoose');
require('dotenv').config();

async function debugTournamentSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Tournament = require('./dist/models/Tournament').default;
    const Schedule = require('./dist/models/Schedule').default;
    const TimeSlot = require('./dist/models/TimeSlot').default;
    const Match = require('./dist/models/Match').default;
    const Team = require('./dist/models/Team').default;
    
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🔍 DEBUGGING TOURNAMENT SCHEDULE');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Check tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found!');
      return;
    }
    
    console.log(`\n📋 Tournament: ${tournament.name}`);
    console.log(`Auto-scheduling enabled: ${tournament.autoScheduleEnabled}`);
    console.log(`Daily start time: ${tournament.dailyStartTime}`);
    console.log(`Daily end time: ${tournament.dailyEndTime}`);
    console.log(`Available courts: ${tournament.availableCourts}`);
    
    // Check teams
    const teams = await Team.find({ tournament: tournamentId });
    console.log(`\n👥 Teams: ${teams.length} found`);
    teams.forEach((team, i) => {
      console.log(`  ${i + 1}. ${team.name}`);
    });
    
    // Check matches
    const matches = await Match.find({ tournament: tournamentId })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .sort({ round: 1, matchNumber: 1 });
    
    console.log(`\n🎾 Matches: ${matches.length} found`);
    matches.forEach((match, i) => {
      console.log(`  ${i + 1}. Round ${match.round}, Match ${match.matchNumber}`);
      console.log(`      ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'}`);
      console.log(`      Status: ${match.status}`);
      console.log(`      Scheduled: ${match.scheduledDateTime ? match.scheduledDateTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Not scheduled'}`);
    });
    
    // Check schedules
    const schedules = await Schedule.find({ tournament: tournamentId });
    console.log(`\n📅 Schedules: ${schedules.length} found`);
    schedules.forEach((schedule, i) => {
      console.log(`  ${i + 1}. Date: ${schedule.date}, Time: ${schedule.startTime} - ${schedule.endTime}`);
      console.log(`      Courts: ${schedule.courts?.join(', ')}`);
    });
    
    // Check time slots
    const timeSlots = await TimeSlot.find({ tournament: tournamentId })
      .populate('match', 'round matchNumber')
      .sort({ startTime: 1 });
    
    console.log(`\n⏰ Time Slots: ${timeSlots.length} found`);
    timeSlots.forEach((slot, i) => {
      const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  ${i + 1}. ${slot.court}: ${timeDisplay}`);
      console.log(`      Available: ${slot.isAvailable}`);
      console.log(`      Match: ${slot.match ? `Round ${slot.match.round} Match ${slot.match.matchNumber}` : 'None'}`);
    });
    
    // Analyze the situation
    console.log(`\n🎯 ANALYSIS:`);
    
    if (teams.length === 0) {
      console.log('❌ No teams found - bracket needs to be generated first');
    } else if (matches.length === 0) {
      console.log('❌ No matches found - bracket needs to be generated');
    } else if (schedules.length === 0) {
      console.log('❌ No schedules found - auto-scheduling may have failed');
    } else if (timeSlots.length === 0) {
      console.log('❌ No time slots found - auto-scheduling may have failed');
    } else {
      const unscheduledMatches = matches.filter(m => !m.scheduledDateTime);
      const availableSlots = timeSlots.filter(s => s.isAvailable);
      
      console.log(`✅ Found ${schedules.length} schedules and ${timeSlots.length} time slots`);
      console.log(`⚠️  ${unscheduledMatches.length} matches need scheduling`);
      console.log(`✅ ${availableSlots.length} time slots available`);
      
      if (unscheduledMatches.length > 0 && availableSlots.length > 0) {
        console.log('\n🔧 SOLUTION: Need to assign matches to available time slots');
        console.log('This happens when bracket is generated after auto-scheduling');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugTournamentSchedule();