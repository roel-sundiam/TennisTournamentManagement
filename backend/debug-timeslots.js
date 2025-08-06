const mongoose = require('mongoose');
require('dotenv').config();

async function debugTimeSlots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🔍 DEBUGGING TIME SLOTS');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Check time slots with exact query that the API uses
    const timeSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).sort({ startTime: 1 }).toArray();
    
    console.log(`⏰ Time slots found: ${timeSlots.length}`);
    
    if (timeSlots.length > 0) {
      console.log('\n📋 Time slot details:');
      timeSlots.forEach((slot, i) => {
        console.log(`${i + 1}. ID: ${slot._id}`);
        console.log(`   Tournament: ${slot.tournament} (type: ${typeof slot.tournament})`);
        console.log(`   Start: ${slot.startTime}`);
        console.log(`   Status: ${slot.status}`);
        console.log(`   Match: ${slot.match || 'None'}`);
        console.log(`   Court: ${slot.court || 'None'}`);
        console.log(`   Notes: ${slot.notes || 'None'}`);
        console.log('');
      });
    } else {
      console.log('\n❌ No time slots found with this tournament ID');
      
      // Check if any time slots exist at all
      const allTimeSlots = await db.collection('timeslots').find({}).toArray();
      console.log(`Total time slots in database: ${allTimeSlots.length}`);
      
      if (allTimeSlots.length > 0) {
        console.log('\n📋 Sample time slot for comparison:');
        console.log(`   Tournament: ${allTimeSlots[0].tournament} (type: ${typeof allTimeSlots[0].tournament})`);
        console.log(`   Expected: ${tournamentId} (type: ${typeof tournamentId})`);
        console.log(`   Match: ${allTimeSlots[0].tournament.toString() === tournamentId}`);
      }
    }
    
    // Also check the Schedule document
    const schedule = await db.collection('schedules').findOne({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    console.log(`\n📅 Schedule exists: ${!!schedule}`);
    if (schedule) {
      console.log(`   Tournament: ${schedule.tournament} (type: ${typeof schedule.tournament})`);
      console.log(`   Status: ${schedule.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugTimeSlots();