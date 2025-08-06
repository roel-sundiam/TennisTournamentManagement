const mongoose = require('mongoose');
require('dotenv').config();

async function checkSchedules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878cf2c44caf53ff8b489ec';
    
    console.log('\n=== CHECKING SCHEDULES ===');
    
    // Check schedules collection directly
    const schedules = await db.collection('schedules').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log(`Found ${schedules.length} schedule entries`);
    
    schedules.forEach((schedule, i) => {
      console.log(`\nSchedule ${i + 1}:`);
      console.log(`  ID: ${schedule._id}`);
      console.log(`  Start Time: ${schedule.startTime}`);
      console.log(`  End Time: ${schedule.endTime}`);
      console.log(`  Date: ${schedule.date}`);
      console.log(`  Courts: ${schedule.courts?.length || 0}`);
      if (schedule.courts) {
        schedule.courts.forEach(court => console.log(`    - ${court}`));
      }
    });
    
    // Check time slots
    const timeSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log(`\n=== TIME SLOTS ===`);
    console.log(`Found ${timeSlots.length} time slots`);
    
    timeSlots.forEach((slot, i) => {
      console.log(`\nTime Slot ${i + 1}:`);
      console.log(`  Start: ${slot.startTime}`);
      console.log(`  End: ${slot.endTime}`);
      console.log(`  Court: ${slot.court}`);
      console.log(`  Available: ${slot.isAvailable}`);
      console.log(`  Match: ${slot.match || 'None'}`);
    });
    
    if (schedules.length === 0) {
      console.log('\n❌ NO SCHEDULES FOUND');
      console.log('You need to create a schedule for this tournament first.');
      console.log('Go to the Schedule tab and set up times and courts.');
    } else if (timeSlots.length === 0) {
      console.log('\n❌ NO TIME SLOTS GENERATED');
      console.log('Schedule exists but time slots not created - there may be an issue with schedule generation.');
    } else {
      console.log('\n✅ Schedule and time slots exist');
      
      // Check if matches are assigned to time slots
      const assignedSlots = timeSlots.filter(slot => slot.match);
      console.log(`${assignedSlots.length}/${timeSlots.length} time slots have matches assigned`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkSchedules();