const mongoose = require('mongoose');
require('dotenv').config();

async function simpleAPITest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🧪 SIMPLE API TEST');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Check for schedule document
    const schedule = await db.collection('schedules').findOne({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    console.log('📅 Schedule exists:', !!schedule);
    if (schedule) {
      console.log('  ID:', schedule._id);
      console.log('  Name:', schedule.name);
      console.log('  Status:', schedule.status);
    }
    
    // Check for time slots
    const timeSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).sort({ startTime: 1 }).toArray();
    
    console.log(`⏰ Time slots found: ${timeSlots.length}`);
    timeSlots.forEach((slot, i) => {
      const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  ${i + 1}. ${timeDisplay} - ${slot.status} (${slot.notes || 'No notes'})`);
    });
    
    // Check for matches
    const matches = await db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).sort({ round: 1, matchNumber: 1 }).toArray();
    
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
      console.log(`      TimeSlot: ${match.scheduledTimeSlot || 'None'}`);
    });
    
    console.log('\n📊 Summary:');
    console.log(`  Schedule: ${schedule ? 'EXISTS' : 'MISSING'}`);
    console.log(`  Time Slots: ${timeSlots.length}`);
    console.log(`  Matches: ${matches.length}`);
    
    if (schedule && timeSlots.length > 0) {
      console.log('\n✅ All required data exists for drag & drop interface!');
      console.log('✅ Frontend should be able to load time slots via /api/scheduling/' + tournamentId);
    } else {
      console.log('\n❌ Missing required data for drag & drop interface');
      if (!schedule) console.log('  - Schedule document missing');
      if (timeSlots.length === 0) console.log('  - Time slots missing');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

simpleAPITest();