const mongoose = require('mongoose');
require('dotenv').config();

async function debugNewTournament() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔍 DEBUGGING NEW TOURNAMENT: 68798b50af6f0ed677e07411');
    console.log('===============================================');
    
    const tournamentId = '68798b50af6f0ed677e07411';
    const db = mongoose.connection.db;
    
    // Get tournament details
    const tournament = await db.collection('tournaments').findOne({ 
      _id: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('📋 Tournament:', tournament.name);
    console.log('📊 Auto-scheduling:', tournament.autoScheduleEnabled);
    console.log('📅 Created:', tournament.createdAt);
    console.log('');
    
    // Check matches
    const matches = await db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('⚔️ Matches:', matches.length);
    if (matches.length > 0) {
      const scheduled = matches.filter(m => m.scheduledDate).length;
      console.log('📅 Scheduled:', scheduled, '/', matches.length);
      
      console.log('First 3 matches:');
      matches.slice(0, 3).forEach(match => {
        console.log(`  Match ${match.matchNumber} (Round ${match.round}): ${match.status} - Date: ${match.scheduledDate || 'NONE'}`);
      });
    }
    
    // Check time slots
    const timeSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('⏰ Time slots:', timeSlots.length);
    
    // Check schedules
    const schedules = await db.collection('schedules').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('📋 Schedules:', schedules.length);
    if (schedules.length > 0) {
      console.log('   Schedule name:', schedules[0].name);
      console.log('   Total matches in schedule:', schedules[0].totalMatches);
      console.log('   Scheduled matches:', schedules[0].scheduledMatches);
    }
    
    // Check teams and brackets
    const teams = await db.collection('teams').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const brackets = await db.collection('brackets').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('👥 Teams:', teams.length);
    console.log('🏆 Brackets:', brackets.length);
    
    if (brackets.length > 0) {
      console.log('   Bracket status:', brackets[0].status);
      console.log('   Bracket teams:', brackets[0].teams ? brackets[0].teams.length : 0);
    }
    
    // Check timestamps to understand the workflow
    console.log('');
    console.log('📅 TIMELINE:');
    console.log('Tournament created:', tournament.createdAt);
    if (brackets.length > 0) {
      console.log('Bracket created:', brackets[0].createdAt);
    }
    if (matches.length > 0) {
      console.log('First match created:', matches[0].createdAt);
      console.log('Last match created:', matches[matches.length-1].createdAt);
    }
    
    console.log('');
    console.log('🔍 ANALYSIS:');
    if (matches.length === 0) {
      console.log('❌ No matches - bracket/matches not generated yet');
    } else if (timeSlots.length === 0) {
      console.log('❌ No time slots - auto-scheduling failed or not triggered');
    } else if (matches.filter(m => m.scheduledDate).length === 0) {
      console.log('❌ Matches exist but none scheduled');
    } else {
      console.log('✅ Tournament appears properly scheduled');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

debugNewTournament();