const mongoose = require('mongoose');
require('dotenv').config();

let monitoring = false;

async function monitorTournamentCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🔍 MONITORING TOURNAMENT CREATION');
    console.log('=================================');
    console.log('Watching for new tournaments...');
    console.log('Press Ctrl+C to stop\n');
    
    monitoring = true;
    let lastTournamentCount = 0;
    
    // Get initial tournament count
    const initialCount = await mongoose.connection.db.collection('tournaments').countDocuments();
    lastTournamentCount = initialCount;
    
    const interval = setInterval(async () => {
      if (!monitoring) {
        clearInterval(interval);
        return;
      }
      
      try {
        // Check for new tournaments
        const currentCount = await mongoose.connection.db.collection('tournaments').countDocuments();
        
        if (currentCount > lastTournamentCount) {
          console.log('🚨 NEW TOURNAMENT DETECTED!');
          console.log('==========================');
          
          // Get the newest tournament
          const tournaments = await mongoose.connection.db.collection('tournaments')
            .find()
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();
          
          if (tournaments.length > 0) {
            const tournament = tournaments[0];
            console.log('📋 Tournament:', tournament.name);
            console.log('🆔 ID:', tournament._id.toString());
            console.log('📊 Auto-scheduling:', tournament.autoScheduleEnabled);
            console.log('📅 Created:', tournament.createdAt);
            
            // Monitor this tournament for the next 30 seconds
            await monitorSpecificTournament(tournament._id.toString());
          }
          
          lastTournamentCount = currentCount;
        }
        
      } catch (error) {
        console.error('❌ Monitoring error:', error.message);
      }
    }, 1000); // Check every second
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping monitor...');
      monitoring = false;
      clearInterval(interval);
      mongoose.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

async function monitorSpecificTournament(tournamentId) {
  console.log(`\n🔬 MONITORING TOURNAMENT ${tournamentId}`);
  console.log('==========================================');
  
  let previousState = null;
  
  for (let i = 0; i < 30; i++) { // Monitor for 30 seconds
    try {
      const state = await getTournamentState(tournamentId);
      
      if (!previousState || hasStateChanged(previousState, state)) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`[${timestamp}] State change detected:`);
        console.log(`   Teams: ${state.teams} | Brackets: ${state.brackets} | Matches: ${state.matches}`);
        console.log(`   Time slots: ${state.timeSlots} | Scheduled matches: ${state.scheduledMatches}`);
        
        if (state.matches > 0 && state.timeSlots === 0) {
          console.log('   ⚠️  PROBLEM: Matches exist but no time slots!');
        }
        
        if (state.timeSlots > 0 && state.scheduledMatches > 0) {
          console.log('   ✅ SUCCESS: Auto-scheduling worked!');
          break;
        }
        
        previousState = state;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
    } catch (error) {
      console.error(`❌ Error monitoring tournament: ${error.message}`);
      break;
    }
  }
  
  console.log(`\n📊 FINAL STATE for ${tournamentId}:`);
  const finalState = await getTournamentState(tournamentId);
  console.log(`   Teams: ${finalState.teams}`);
  console.log(`   Brackets: ${finalState.brackets}`);  
  console.log(`   Matches: ${finalState.matches}`);
  console.log(`   Time slots: ${finalState.timeSlots}`);
  console.log(`   Scheduled matches: ${finalState.scheduledMatches}`);
  
  if (finalState.matches > 0 && finalState.timeSlots === 0) {
    console.log('   ❌ CONCLUSION: Auto-scheduling FAILED');
  } else if (finalState.timeSlots > 0 && finalState.scheduledMatches > 0) {
    console.log('   ✅ CONCLUSION: Auto-scheduling WORKED');
  } else {
    console.log('   ⚠️  CONCLUSION: Incomplete tournament setup');
  }
  
  console.log('\n👀 Continuing to watch for more tournaments...\n');
}

async function getTournamentState(tournamentId) {
  const teams = await mongoose.connection.db.collection('teams').countDocuments({ 
    tournament: new mongoose.Types.ObjectId(tournamentId) 
  });
  
  const brackets = await mongoose.connection.db.collection('brackets').countDocuments({ 
    tournament: new mongoose.Types.ObjectId(tournamentId) 
  });
  
  const matches = await mongoose.connection.db.collection('matches').countDocuments({ 
    tournament: new mongoose.Types.ObjectId(tournamentId) 
  });
  
  const timeSlots = await mongoose.connection.db.collection('timeslots').countDocuments({ 
    tournament: new mongoose.Types.ObjectId(tournamentId) 
  });
  
  const scheduledMatches = await mongoose.connection.db.collection('matches').countDocuments({ 
    tournament: new mongoose.Types.ObjectId(tournamentId),
    scheduledDate: { $exists: true }
  });
  
  return { teams, brackets, matches, timeSlots, scheduledMatches };
}

function hasStateChanged(prev, curr) {
  return prev.teams !== curr.teams || 
         prev.brackets !== curr.brackets || 
         prev.matches !== curr.matches || 
         prev.timeSlots !== curr.timeSlots || 
         prev.scheduledMatches !== curr.scheduledMatches;
}

monitorTournamentCreation();