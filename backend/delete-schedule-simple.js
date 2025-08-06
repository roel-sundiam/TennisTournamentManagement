const mongoose = require('mongoose');
require('dotenv').config();

async function deleteSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== DELETING SCHEDULE DATA ===');
    
    // Delete existing schedule
    const deletedSchedules = await db.collection('schedules').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    console.log(`✅ Deleted ${deletedSchedules.deletedCount} schedules`);
    
    // Delete existing time slots
    const deletedTimeSlots = await db.collection('timeslots').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    console.log(`✅ Deleted ${deletedTimeSlots.deletedCount} time slots`);
    
    // Delete existing matches (they have wrong times)
    const deletedMatches = await db.collection('matches').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    console.log(`✅ Deleted ${deletedMatches.deletedCount} matches`);
    
    console.log('\n🎯 Schedule data cleared! Ready for fresh generation with timezone fix.');
    console.log('You can now create a new schedule with 6PM-10PM times in the UI.');
    
    // Verify deletion
    console.log('\n=== VERIFICATION ===');
    const remainingSchedules = await db.collection('schedules').countDocuments({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    const remainingTimeSlots = await db.collection('timeslots').countDocuments({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    const remainingMatches = await db.collection('matches').countDocuments({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    
    console.log(`Remaining schedules: ${remainingSchedules}`);
    console.log(`Remaining time slots: ${remainingTimeSlots}`);
    console.log(`Remaining matches: ${remainingMatches}`);
    
    if (remainingSchedules === 0 && remainingTimeSlots === 0 && remainingMatches === 0) {
      console.log('✅ All data successfully cleared!');
    } else {
      console.log('⚠️ Some data may still remain');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

deleteSchedule();