const mongoose = require('mongoose');
require('dotenv').config();

async function debugNewTournament() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '68798423af6f0ed677e05ec6';
    
    console.log('🔍 DEBUGGING NEW TOURNAMENT - NO SCHEDULES SHOWING');
    console.log('Tournament ID:', tournamentId);
    console.log('===============================================\n');
    
    // Get tournament details
    const tournament = await db.collection('tournaments').findOne({ _id: new mongoose.Types.ObjectId(tournamentId) });
    
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('📋 Tournament Configuration:');
    console.log('  Name:', tournament.name);
    console.log('  Auto-scheduling:', tournament.autoScheduleEnabled);
    console.log('  Start Date:', tournament.startDate);
    console.log('  End Date:', tournament.endDate);
    console.log('  Daily Start Time:', tournament.dailyStartTime);
    console.log('  Daily End Time:', tournament.dailyEndTime);
    console.log('  Available Courts:', tournament.availableCourts);
    console.log('  Match Duration:', tournament.matchDuration);
    console.log('  Status:', tournament.status);
    console.log('  Created:', tournament.createdAt);
    
    // Get matches
    const matches = await db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).sort({ round: 1, matchNumber: 1 }).toArray();
    
    console.log('\n⚔️ MATCHES ANALYSIS:');
    console.log('===================');
    console.log('Total matches:', matches.length);
    
    if (matches.length === 0) {
      console.log('❌ NO MATCHES FOUND - This might be why schedules are not showing');
    } else {
      const matchesByStatus = {};
      matches.forEach(match => {
        matchesByStatus[match.status] = (matchesByStatus[match.status] || 0) + 1;
      });
      
      console.log('Matches by status:');
      Object.entries(matchesByStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      console.log('\nDetailed match info:');
      matches.forEach(match => {
        console.log(`  Round ${match.round}, Match ${match.matchNumber}:`);
        console.log(`    Status: ${match.status}`);
        console.log(`    Team1: ${match.team1 ? 'Set' : 'NULL'}`);
        console.log(`    Team2: ${match.team2 ? 'Set' : 'NULL'}`);
        console.log(`    Date: ${match.scheduledDate || 'NOT SET'}`);
        console.log(`    Time: ${match.scheduledTime || 'NOT SET'}`);
        console.log(`    Court: ${match.court || 'NOT SET'}`);
        console.log(`    Time Slot: ${match.scheduledTimeSlot ? 'Assigned' : 'NOT ASSIGNED'}`);
        console.log('');
      });
    }
    
    // Get teams
    const teams = await db.collection('teams').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('👥 TEAMS ANALYSIS:');
    console.log('=================');
    console.log('Total teams:', teams.length);
    
    if (teams.length === 0) {
      console.log('❌ NO TEAMS FOUND - Tournament might not be fully set up');
    }
    
    // Get brackets
    const brackets = await db.collection('brackets').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('\n🏆 BRACKETS ANALYSIS:');
    console.log('====================');
    console.log('Total brackets:', brackets.length);
    
    if (brackets.length === 0) {
      console.log('❌ NO BRACKETS FOUND - Auto-scheduling might not have been triggered');
    } else {
      brackets.forEach(bracket => {
        console.log(`  Bracket: ${bracket.name}`);
        console.log(`    Status: ${bracket.status}`);
        console.log(`    Teams: ${bracket.teams ? bracket.teams.length : 0}`);
        console.log(`    Matches: ${bracket.matches ? bracket.matches.length : 0}`);
      });
    }
    
    // Get schedules
    const schedules = await db.collection('schedules').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('\n📅 SCHEDULE DOCUMENTS:');
    console.log('=====================');
    console.log('Total schedules:', schedules.length);
    
    if (schedules.length === 0) {
      console.log('❌ NO SCHEDULE DOCUMENTS - Auto-scheduling might not have run');
    } else {
      schedules.forEach(schedule => {
        console.log(`  Schedule: ${schedule.name}`);
        console.log(`    Status: ${schedule.status}`);
        console.log(`    Total Matches: ${schedule.totalMatches}`);
        console.log(`    Scheduled Matches: ${schedule.scheduledMatches}`);
        console.log(`    Courts: ${schedule.courts}`);
      });
    }
    
    // Get time slots
    const timeSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('\n⏰ TIME SLOTS ANALYSIS:');
    console.log('======================');
    console.log('Total time slots:', timeSlots.length);
    
    if (timeSlots.length === 0) {
      console.log('❌ NO TIME SLOTS - Auto-scheduling definitely not working');
    } else {
      const slotsByStatus = {};
      timeSlots.forEach(slot => {
        slotsByStatus[slot.status] = (slotsByStatus[slot.status] || 0) + 1;
      });
      
      console.log('Time slots by status:');
      Object.entries(slotsByStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
    // ROOT CAUSE ANALYSIS
    console.log('\n🔍 ROOT CAUSE ANALYSIS:');
    console.log('======================');
    
    const issues = [];
    
    if (!tournament.autoScheduleEnabled) {
      issues.push('Auto-scheduling is disabled');
    }
    
    if (teams.length === 0) {
      issues.push('No teams created - tournament setup incomplete');
    }
    
    if (matches.length === 0) {
      issues.push('No matches created - bracket generation not completed');
    }
    
    if (brackets.length === 0) {
      issues.push('No brackets created - bracket generation failed');
    }
    
    if (schedules.length === 0 && matches.length > 0) {
      issues.push('Auto-scheduling did not create schedule documents');
    }
    
    if (timeSlots.length === 0 && schedules.length > 0) {
      issues.push('Schedule created but no time slots generated');
    }
    
    if (matches.length > 0 && matches.every(m => !m.scheduledDate)) {
      issues.push('Matches exist but have no scheduled dates/times');
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious issues found - might be a frontend display problem');
    } else {
      console.log('❌ Issues found:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    // NEXT STEPS
    console.log('\n🎯 RECOMMENDED NEXT STEPS:');
    console.log('=========================');
    
    if (teams.length === 0) {
      console.log('1. Check if team generation completed in the frontend');
    }
    
    if (matches.length === 0) {
      console.log('2. Check if bracket generation completed in the frontend');
    }
    
    if (matches.length > 0 && schedules.length === 0) {
      console.log('3. Manually trigger auto-scheduling for this tournament');
    }
    
    if (schedules.length > 0 && timeSlots.length === 0) {
      console.log('4. Debug time slot generation logic');
    }
    
    if (matches.length > 0 && matches.every(m => !m.scheduledDate)) {
      console.log('5. Debug match scheduling assignment logic');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Debug analysis complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

debugNewTournament();