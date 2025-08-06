const mongoose = require('mongoose');
require('dotenv').config();

async function checkSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Check schedules collection directly
    const schedules = await db.collection('schedules').find({}).sort({ createdAt: -1 }).limit(3).toArray();
    console.log(`Found ${schedules.length} schedules in database`);
    
    schedules.forEach((schedule, i) => {
      console.log(`\nSchedule ${i + 1}:`);
      console.log(`  Tournament: ${schedule.tournament}`);
      console.log(`  Start Time: "${schedule.startTime}"`);
      console.log(`  End Time: "${schedule.endTime}"`);
      console.log(`  Status: ${schedule.status}`);
      console.log(`  Created: ${schedule.createdAt}`);
    });
    
    // Check time slots
    const timeSlots = await db.collection('timeslots').find({}).limit(5).toArray();
    console.log(`\nFound ${timeSlots.length} time slots`);
    
    if (timeSlots.length > 0) {
      const slot = timeSlots[0];
      console.log(`Sample time slot: ${slot.startTime} - ${slot.endTime} | Court: ${slot.court}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkSchedule();