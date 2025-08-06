const mongoose = require('mongoose');
require('dotenv').config();

async function forceCleanAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== FORCE CLEANING ALL TOURNAMENT DATA ===');
    
    // Delete ALL related data for this tournament
    const deletedSchedules = await db.collection('schedules').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    console.log(`✅ Deleted ${deletedSchedules.deletedCount} schedules`);
    
    const deletedTimeSlots = await db.collection('timeslots').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    console.log(`✅ Deleted ${deletedTimeSlots.deletedCount} time slots`);
    
    const deletedMatches = await db.collection('matches').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    console.log(`✅ Deleted ${deletedMatches.deletedCount} matches`);
    
    // Also delete any bracket data that might be holding references
    const deletedBrackets = await db.collection('brackets').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    console.log(`✅ Deleted ${deletedBrackets.deletedCount} brackets`);
    
    console.log('\n🎯 COMPLETE TOURNAMENT DATA CLEARED!');
    console.log('Now create a completely fresh schedule and matches will be generated with correct timezone!');
    
    // Verify everything is gone
    console.log('\n=== VERIFICATION ===');
    const remainingSchedules = await db.collection('schedules').countDocuments({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    const remainingTimeSlots = await db.collection('timeslots').countDocuments({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    const remainingMatches = await db.collection('matches').countDocuments({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    const remainingBrackets = await db.collection('brackets').countDocuments({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    
    console.log(`Remaining schedules: ${remainingSchedules}`);
    console.log(`Remaining time slots: ${remainingTimeSlots}`);
    console.log(`Remaining matches: ${remainingMatches}`);
    console.log(`Remaining brackets: ${remainingBrackets}`);
    
    if (remainingSchedules === 0 && remainingTimeSlots === 0 && remainingMatches === 0 && remainingBrackets === 0) {
      console.log('✅ ALL DATA SUCCESSFULLY PURGED!');
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

forceCleanAll();