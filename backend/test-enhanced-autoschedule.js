const mongoose = require('mongoose');
require('dotenv').config();

async function testEnhancedAutoSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🧪 TESTING ENHANCED AUTO-SCHEDULE TRIGGER');
    console.log('=========================================');
    
    const tournamentId = '68798b50af6f0ed677e07411';
    
    // Step 1: Clear existing time slots and schedules to simulate fresh state
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
    
    console.log('✅ Cleared - tournament now has matches but no schedules');
    
    // Step 2: Get current state
    const matches = await mongoose.connection.db.collection('matches').countDocuments({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    const timeSlots = await mongoose.connection.db.collection('timeslots').countDocuments({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    console.log('📊 Current state:');
    console.log('   Matches:', matches);
    console.log('   Time slots:', timeSlots);
    
    // Step 3: Simulate calling the enhanced create-missing route
    console.log('🎯 Simulating enhanced create-missing logic...');
    
    const tournament = await mongoose.connection.db.collection('tournaments').findOne({ 
      _id: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    console.log('   Tournament auto-scheduling:', tournament.autoScheduleEnabled);
    
    // This simulates the new logic: createdMatches.length = 0 BUT totalMatches > 0 AND existingTimeSlots = 0
    const createdMatches = []; // No new matches created (all exist)
    const totalMatches = matches;
    const existingTimeSlots = timeSlots;
    
    const shouldTriggerAutoScheduling = tournament && tournament.autoScheduleEnabled && 
      (createdMatches.length > 0 || (totalMatches > 0 && existingTimeSlots === 0));
    
    console.log('🔍 Auto-scheduling decision:');
    console.log('   Created matches:', createdMatches.length);
    console.log('   Total matches:', totalMatches);  
    console.log('   Existing time slots:', existingTimeSlots);
    console.log('   Should trigger:', shouldTriggerAutoScheduling);
    
    if (shouldTriggerAutoScheduling) {
      console.log('🗓️ Triggering auto-scheduling...');
      
      const { generateTournamentSchedule } = require('./dist/routes/tournaments');
      await generateTournamentSchedule(tournament);
      
      console.log('✅ Auto-scheduling completed');
      
      // Check results
      const newTimeSlots = await mongoose.connection.db.collection('timeslots').countDocuments({ 
        tournament: new mongoose.Types.ObjectId(tournamentId) 
      });
      
      const scheduledMatches = await mongoose.connection.db.collection('matches').countDocuments({ 
        tournament: new mongoose.Types.ObjectId(tournamentId),
        scheduledDate: { $exists: true }
      });
      
      console.log('📊 Results:');
      console.log('   Time slots created:', newTimeSlots);
      console.log('   Scheduled matches:', scheduledMatches);
      
      if (newTimeSlots > 0 && scheduledMatches > 0) {
        console.log('🎉 SUCCESS: Enhanced auto-scheduling works for existing tournaments!');
      } else {
        console.log('❌ FAILED: Still not working');
      }
    } else {
      console.log('❌ Auto-scheduling would not be triggered');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testEnhancedAutoSchedule();