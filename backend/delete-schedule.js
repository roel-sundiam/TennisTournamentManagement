const mongoose = require('mongoose');
require('dotenv').config();

async function deleteSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Schedule, TimeSlot, Match } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== DELETING SCHEDULE DATA ===');
    
    // Delete existing schedule
    const deletedSchedules = await Schedule.deleteMany({ tournament: tournamentId });
    console.log(`✅ Deleted ${deletedSchedules.deletedCount} schedules`);
    
    // Delete existing time slots
    const deletedTimeSlots = await TimeSlot.deleteMany({ tournament: tournamentId });
    console.log(`✅ Deleted ${deletedTimeSlots.deletedCount} time slots`);
    
    // Delete existing matches (they have wrong times)
    const deletedMatches = await Match.deleteMany({ tournament: tournamentId });
    console.log(`✅ Deleted ${deletedMatches.deletedCount} matches`);
    
    console.log('\n🎯 Schedule data cleared! Ready for fresh generation with timezone fix.');
    console.log('You can now create a new schedule with 6PM-10PM times in the UI.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

deleteSchedule();