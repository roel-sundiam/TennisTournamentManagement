const mongoose = require('mongoose');
require('dotenv').config();

async function testMatchesAutoSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🧪 TESTING MATCHES AUTO-SCHEDULE FIX');
    console.log('=====================================');
    
    const tournamentId = '6879876caf6f0ed677e06896';
    
    // Clear existing schedules and time slots to simulate fresh state
    console.log('🧹 Clearing existing schedules/time slots...');
    await mongoose.connection.db.collection('schedules').deleteMany({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    await mongoose.connection.db.collection('timeslots').deleteMany({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    // Reset match schedules
    await mongoose.connection.db.collection('matches').updateMany(
      { tournament: new mongoose.Types.ObjectId(tournamentId) },
      { 
        $unset: { 
          scheduledDate: 1, 
          scheduledTime: 1, 
          scheduledTimeSlot: 1, 
          court: 1 
        } 
      }
    );
    
    console.log('✅ Cleared existing schedules and match assignments');
    
    // Simulate the matches creation process with auto-scheduling
    console.log('🎾 Simulating matches creation with auto-scheduling...');
    
    // Get tournament
    const tournament = await mongoose.connection.db.collection('tournaments').findOne({ 
      _id: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('📋 Tournament found:', tournament.name);
    console.log('📊 Auto-scheduling enabled:', tournament.autoScheduleEnabled);
    
    // Get match count
    const matchCount = await mongoose.connection.db.collection('matches').countDocuments({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    console.log('🎯 Simulating: matches created, count =', matchCount);
    
    // Trigger auto-scheduling (simulating what would happen in matches.ts)
    if (tournament.autoScheduleEnabled && matchCount > 0) {
      console.log('🗓️ Auto-scheduling enabled, triggering schedule generation...');
      
      const { generateTournamentSchedule } = require('./dist/routes/tournaments');
      await generateTournamentSchedule(tournament);
      
      console.log('✅ Auto-scheduling completed');
    }
    
    // Check results
    console.log('');
    console.log('📊 RESULTS:');
    
    const timeSlots = await mongoose.connection.db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const matches = await mongoose.connection.db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const scheduledMatches = matches.filter(m => m.scheduledDate);
    
    console.log('  Time slots created:', timeSlots.length);
    console.log('  Total matches:', matches.length);
    console.log('  Scheduled matches:', scheduledMatches.length);
    
    if (scheduledMatches.length > 0) {
      console.log('');
      console.log('📅 First 3 scheduled matches:');
      scheduledMatches.slice(0, 3).forEach(match => {
        console.log(`  Match ${match.matchNumber}: ${match.scheduledDate} ${match.scheduledTime} - ${match.court}`);
      });
    }
    
    console.log('');
    if (timeSlots.length > 0 && scheduledMatches.length > 0) {
      console.log('🎉 SUCCESS: Auto-scheduling fix is working!');
    } else {
      console.log('❌ FAILED: Auto-scheduling still not working');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testMatchesAutoSchedule();