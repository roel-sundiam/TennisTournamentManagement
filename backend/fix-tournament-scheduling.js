const mongoose = require('mongoose');
require('dotenv').config();

async function fixTournamentScheduling() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const tournamentId = '68798423af6f0ed677e05ec6';
    
    console.log('🔧 FIXING TOURNAMENT SCHEDULING');
    console.log('Tournament ID:', tournamentId);
    console.log('===============================================\n');
    
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
    
    // Import the compiled JavaScript version
    const { generateTournamentSchedule } = require('./dist/routes/tournaments');
    
    console.log('🗓️ Triggering auto-scheduling...');
    await generateTournamentSchedule(tournament);
    
    console.log('✅ Auto-scheduling completed, checking results...\n');
    
    // Check results
    const timeSlots = await mongoose.connection.db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const matches = await mongoose.connection.db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const scheduledMatches = matches.filter(m => m.scheduledDate);
    
    console.log('📊 RESULTS:');
    console.log('  Time slots created:', timeSlots.length);
    console.log('  Total matches:', matches.length);
    console.log('  Scheduled matches:', scheduledMatches.length);
    
    if (scheduledMatches.length > 0) {
      console.log('\n📅 Schedule Preview:');
      scheduledMatches.slice(0, 3).forEach(match => {
        console.log(`  Match ${match.matchNumber}: ${match.scheduledDate} ${match.scheduledTime} - ${match.court}`);
      });
    }
    
    console.log('\n✅ Fix completed successfully!');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

fixTournamentScheduling();